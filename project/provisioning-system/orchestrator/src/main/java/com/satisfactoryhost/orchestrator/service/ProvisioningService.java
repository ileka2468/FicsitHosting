package com.satisfactoryhost.orchestrator.service;

import com.satisfactoryhost.orchestrator.dto.ProvisionServerRequest;
import com.satisfactoryhost.orchestrator.dto.ProvisionServerResponse;
import com.satisfactoryhost.orchestrator.dto.SpawnContainerRequest;
import com.satisfactoryhost.orchestrator.dto.UserInfo;
import com.satisfactoryhost.orchestrator.model.Node;
import com.satisfactoryhost.orchestrator.model.GameServer;
import com.satisfactoryhost.orchestrator.repository.NodeRepository;
import com.satisfactoryhost.orchestrator.repository.GameServerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class ProvisioningService {
    
    @Autowired
    private NodeSchedulerService nodeSchedulerService;
    
    @Autowired
    private PortAllocationService portAllocationService;
    
    @Autowired
    private HostAgentService hostAgentService;
    
    @Autowired
    private RatholeService ratholeService;
    
    @Autowired
    private GameServerRepository gameServerRepository;
    
    @Autowired
    private NodeRepository nodeRepository;
    
    @Autowired
    private WebClient.Builder webClientBuilder;
    
    @Value("${app.public-ip}")
    private String publicIp;
    
    @Value("${app.auth-service-url:http://auth-service:8081}")
    private String authServiceUrl;
    
    /**
     * Validate JWT token with auth service and return user info
     */
    private UserInfo validateJwtAndGetUser(String jwt) {
        if (jwt == null || jwt.trim().isEmpty()) {
            throw new RuntimeException("Authorization token is required");
        }
        
        try {
            return webClientBuilder.build()
                .get()
                .uri(authServiceUrl + "/api/auth/validate")
                .header("Authorization", jwt)
                .retrieve()
                .bodyToMono(UserInfo.class)
                .block();
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 401) {
                throw new RuntimeException("Invalid or expired JWT token");
            }
            throw new RuntimeException("Authentication service error: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("Failed to validate JWT token: " + e.getMessage());
        }
    }
    
    /**
     * Check if user has required role
     */
    private boolean hasRole(UserInfo user, String role) {
        return user.getRoles() != null && user.getRoles().contains(role);
    }
    
    /**
     * Check if user owns the server or has admin privileges
     */
    private boolean canAccessServer(UserInfo user, GameServer server) {
        // Admins and service accounts can access any server
        if (hasRole(user, "ADMIN") || hasRole(user, "SERVICE_ACCOUNT")) {
            return true;
        }
        
        // Users can only access their own servers
        return server.getUserId().equals(user.getId().toString());
    }
    
    /**
     * Provision a new Satisfactory server
     */
    @Transactional
    public ProvisionServerResponse provisionServer(String jwt, ProvisionServerRequest request) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        // Only SERVICE_ACCOUNT role can provision servers
        if (!hasRole(user, "SERVICE_ACCOUNT")) {
            throw new RuntimeException("Insufficient permissions: Only service accounts can provision servers");
        }
        
        // Choose the best node
        Optional<Node> nodeOpt;
        if (request.getPreferredNodeId() != null) {
            nodeOpt = nodeSchedulerService.chooseSpecificNode(request.getPreferredNodeId());
            if (nodeOpt.isEmpty()) {
                nodeOpt = nodeSchedulerService.chooseBestNode();
            }
        } else {
            nodeOpt = nodeSchedulerService.chooseBestNode();
        }
        
        if (nodeOpt.isEmpty()) {
            throw new RuntimeException("No available nodes for provisioning");
        }
        
        Node selectedNode = nodeOpt.get();
        
        // Generate server ID
        String serverId = "srv_" + request.getUserId() + "_" + UUID.randomUUID().toString().substring(0, 8);
        
        // Create game server record (ports will be allocated next)
        GameServer gameServer = new GameServer(serverId, user.getId().toString(), request.getServerName(), selectedNode);
        gameServer.setRamAllocation(request.getRamAllocation());
        gameServer.setCpuAllocation(request.getCpuAllocation());
        gameServer.setMaxPlayers(request.getMaxPlayers());
        gameServer.setServerPassword(request.getServerPassword());
        gameServer.setStatus(GameServer.ServerStatus.PROVISIONING);
        // Ports will be set after allocation
        
        GameServer savedGameServer = gameServerRepository.save(gameServer);
        
        // Allocate ports
        PortAllocationService.PortAllocationResult portResult = 
            portAllocationService.allocatePorts(selectedNode, savedGameServer);
        
        if (!portResult.isSuccess()) {
            throw new RuntimeException("Failed to allocate ports for server");
        }
        
        // Update game server with allocated ports
        savedGameServer.setGamePort(portResult.getGamePort());
        savedGameServer.setBeaconPort(portResult.getBeaconPort());
        final GameServer finalGameServer = gameServerRepository.save(savedGameServer);
        
        // Update node's next available port
        nodeRepository.save(selectedNode);
        
        // Create spawn request for host agent
        SpawnContainerRequest spawnRequest = new SpawnContainerRequest(
            serverId,
            request.getServerName(),
            portResult.getGamePort(),
            portResult.getBeaconPort(),
            request.getRamAllocation(),
            request.getCpuAllocation(),
            request.getMaxPlayers(),
            request.getServerPassword()
        );
        
        // Configure Satisfactory server environment variables
        Map<String, String> envVars = new HashMap<>();
        envVars.put("SERVERGAMEPORT", String.valueOf(portResult.getGamePort()));
        envVars.put("SERVERMESSAGINGPORT", String.valueOf(portResult.getBeaconPort()));
        envVars.put("MAXPLAYERS", String.valueOf(request.getMaxPlayers()));
        envVars.put("PGID", "1000");
        envVars.put("PUID", "1000");
        envVars.put("STEAMBETA", "false");
        if (request.getServerPassword() != null && !request.getServerPassword().trim().isEmpty()) {
            // Note: Server password handling may require additional configuration
            // Check Satisfactory server documentation for password environment variable
        }
        spawnRequest.setEnvironmentVariables(envVars);
        
        // Send request to host agent asynchronously
        hostAgentService.spawnContainer(selectedNode.getIpAddress(), spawnRequest)
            .subscribe(
                response -> {
                    // Update server status on success
                    finalGameServer.setStatus(GameServer.ServerStatus.STARTING);
                    finalGameServer.setStartedAt(ZonedDateTime.now(ZoneOffset.UTC));
                    if (response.containsKey("containerId")) {
                        finalGameServer.setContainerId(response.get("containerId").toString());
                    }
                    gameServerRepository.save(finalGameServer);
                    
                    // Configure Rathole tunnels
                    configureRatholeTunnels(finalGameServer);
                },
                error -> {
                    // Update server status on error
                    finalGameServer.setStatus(GameServer.ServerStatus.ERROR);
                    gameServerRepository.save(finalGameServer);
                }
            );
        
        return ProvisionServerResponse.fromGameServer(finalGameServer, publicIp);
    }
    
    /**
     * Stop a server
     */
    @Transactional
    public void stopServer(String jwt, String serverId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        Optional<GameServer> serverOpt = gameServerRepository.findByServerId(serverId);
        
        if (serverOpt.isEmpty()) {
            throw new RuntimeException("Server not found: " + serverId);
        }
        
        GameServer server = serverOpt.get();
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only control your own servers");
        }
        server.setStatus(GameServer.ServerStatus.STOPPING);
        gameServerRepository.save(server);
        
        // Send stop request to host agent
        hostAgentService.stopContainer(server.getNode().getIpAddress(), serverId)
            .subscribe(
                response -> {
                    server.setStatus(GameServer.ServerStatus.STOPPED);
                    gameServerRepository.save(server);
                    
                    // Remove Rathole tunnels
                    removeRatholeTunnels(server);
                },
                error -> {
                    server.setStatus(GameServer.ServerStatus.ERROR);
                    gameServerRepository.save(server);
                }
            );
    }
    
    /**
     * Delete a server
     */
    @Transactional
    public void deleteServer(String jwt, String serverId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        Optional<GameServer> serverOpt = gameServerRepository.findByServerId(serverId);
        
        if (serverOpt.isEmpty()) {
            throw new RuntimeException("Server not found: " + serverId);
        }
        
        GameServer server = serverOpt.get();
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only delete your own servers");
        }
        
        // Stop server first if running
        if (server.getStatus() == GameServer.ServerStatus.RUNNING || 
            server.getStatus() == GameServer.ServerStatus.STARTING) {
            stopServer(jwt, serverId);
        }
        
        // Release ports
        portAllocationService.releasePorts(serverId);
        
        // Remove Rathole tunnels
        removeRatholeTunnels(server);
        
        // Delete server record
        gameServerRepository.delete(server);
    }
    
    private void configureRatholeTunnels(GameServer server) {
        // Create individual Rathole instance for this server
        ratholeService.createInstance(
            server.getServerId(),
            server.getGamePort(),
            server.getBeaconPort()
        ).subscribe(
            success -> {
                System.out.println("Rathole instance created for server: " + server.getServerId());
                
                // Get client config and send to host agent
                ratholeService.getClientConfig(server.getServerId(), server.getNode().getIpAddress())
                    .subscribe(
                        clientConfigResponse -> {
                            if (clientConfigResponse.containsKey("config")) {
                                String clientConfig = (String) clientConfigResponse.get("config");
                                // Send client config to host agent
                                hostAgentService.configureRatholeClient(
                                    server.getNode().getIpAddress(), 
                                    server.getServerId(), 
                                    clientConfig
                                ).subscribe(
                                    configSuccess -> System.out.println("Rathole client configured on host agent for " + server.getServerId()),
                                    configError -> System.err.println("Failed to configure Rathole client: " + configError.getMessage())
                                );
                            }
                        },
                        configError -> System.err.println("Failed to get client config: " + configError.getMessage())
                    );
            },
            error -> System.err.println("Failed to create Rathole instance for " + server.getServerId() + ": " + error.getMessage())
        );
    }
    
    private void removeRatholeTunnels(GameServer server) {
        // Remove individual Rathole instance for this server
        ratholeService.removeInstance(server.getServerId()).subscribe(
            success -> {
                System.out.println("Rathole instance removed for server: " + server.getServerId());
                
                // Stop Rathole client on host agent
                hostAgentService.stopRatholeClient(server.getNode().getIpAddress(), server.getServerId())
                    .subscribe(
                        stopSuccess -> System.out.println("Rathole client stopped on host agent for " + server.getServerId()),
                        stopError -> System.err.println("Failed to stop Rathole client: " + stopError.getMessage())
                    );
            },
            error -> System.err.println("Failed to remove Rathole instance for " + server.getServerId() + ": " + error.getMessage())
        );
    }
    
    /**
     * Get all servers for a user
     */
    public List<GameServer> getUserServers(String jwt, String userId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        // Users can only see their own servers, unless they're admins or service accounts
        if (!hasRole(user, "ADMIN") && !hasRole(user, "SERVICE_ACCOUNT")) {
            if (!userId.equals(user.getId().toString())) {
                throw new RuntimeException("Insufficient permissions: You can only view your own servers");
            }
        }
        
        return gameServerRepository.findByUserId(userId);
    }
    
    /**
     * Get server by ID
     */
    public GameServer getServerById(String jwt, String serverId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        GameServer server = gameServerRepository.findByServerId(serverId).orElse(null);
        
        if (server == null) {
            return null;
        }
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only view your own servers");
        }
        
        return server;
    }
    
    /**
     * Start a server
     */
    @Transactional
    public void startServer(String jwt, String serverId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        Optional<GameServer> serverOpt = gameServerRepository.findByServerId(serverId);
        
        if (serverOpt.isEmpty()) {
            throw new RuntimeException("Server not found: " + serverId);
        }
        
        GameServer server = serverOpt.get();
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only control your own servers");
        }
        
        if (server.getStatus() == GameServer.ServerStatus.RUNNING) {
            throw new RuntimeException("Server is already running");
        }
        
        server.setStatus(GameServer.ServerStatus.STARTING);
        gameServerRepository.save(server);
        
        // Send start request to host agent
        hostAgentService.startContainer(server.getNode().getIpAddress(), serverId)
            .subscribe(
                response -> {
                    server.setStatus(GameServer.ServerStatus.RUNNING);
                    server.setStartedAt(ZonedDateTime.now(ZoneOffset.UTC));
                    gameServerRepository.save(server);
                    
                    // Configure Rathole tunnels
                    configureRatholeTunnels(server);
                },
                error -> {
                    server.setStatus(GameServer.ServerStatus.ERROR);
                    gameServerRepository.save(server);
                }
            );
    }
    
    /**
     * Restart a server
     */
    @Transactional
    public void restartServer(String jwt, String serverId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        Optional<GameServer> serverOpt = gameServerRepository.findByServerId(serverId);
        
        if (serverOpt.isEmpty()) {
            throw new RuntimeException("Server not found: " + serverId);
        }
        
        GameServer server = serverOpt.get();
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only control your own servers");
        }
        server.setStatus(GameServer.ServerStatus.RESTARTING);
        gameServerRepository.save(server);
        
        // Send restart request to host agent
        hostAgentService.restartContainer(server.getNode().getIpAddress(), serverId)
            .subscribe(
                response -> {
                    server.setStatus(GameServer.ServerStatus.RUNNING);
                    server.setStartedAt(ZonedDateTime.now(ZoneOffset.UTC));
                    gameServerRepository.save(server);
                },
                error -> {
                    server.setStatus(GameServer.ServerStatus.ERROR);
                    gameServerRepository.save(server);
                }
            );
    }
    
    /**
     * Get server status and statistics
     */
    public Map<String, Object> getServerStatus(String jwt, String serverId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        Optional<GameServer> serverOpt = gameServerRepository.findByServerId(serverId);
        
        if (serverOpt.isEmpty()) {
            throw new RuntimeException("Server not found: " + serverId);
        }
        
        GameServer server = serverOpt.get();
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only view your own servers");
        }
        Map<String, Object> status = new HashMap<>();
        
        status.put("serverId", server.getServerId());
        status.put("status", server.getStatus().toString());
        status.put("gamePort", server.getGamePort());
        status.put("beaconPort", server.getBeaconPort());
        status.put("startedAt", server.getStartedAt());
        status.put("nodeId", server.getNode().getNodeId());
        status.put("ramAllocation", server.getRamAllocation());
        status.put("cpuAllocation", server.getCpuAllocation());
        status.put("maxPlayers", server.getMaxPlayers());
        
        // Try to get real-time stats from host agent
        try {
            Map<String, Object> containerStats = hostAgentService.getContainerStatus(
                server.getNode().getIpAddress(), serverId).block();
            if (containerStats != null) {
                status.putAll(containerStats);
            }
        } catch (Exception e) {
            status.put("statsError", "Unable to fetch real-time stats");
        }
        
        return status;
    }
    
    /**
     * Update server configuration
     */
    @Transactional
    public void updateServerConfig(String jwt, String serverId, Map<String, Object> config) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        Optional<GameServer> serverOpt = gameServerRepository.findByServerId(serverId);
        
        if (serverOpt.isEmpty()) {
            throw new RuntimeException("Server not found: " + serverId);
        }
        
        GameServer server = serverOpt.get();
        
        // Check if user can access this server
        if (!canAccessServer(user, server)) {
            throw new RuntimeException("Insufficient permissions: You can only modify your own servers");
        }
        
        // Update configuration fields
        if (config.containsKey("serverName")) {
            server.setServerName((String) config.get("serverName"));
        }
        if (config.containsKey("maxPlayers")) {
            server.setMaxPlayers((Integer) config.get("maxPlayers"));
        }
        if (config.containsKey("serverPassword")) {
            server.setServerPassword((String) config.get("serverPassword"));
        }
        
        gameServerRepository.save(server);
        
        // Send config update to host agent if server is running
        if (server.getStatus() == GameServer.ServerStatus.RUNNING) {
            hostAgentService.updateContainerConfig(server.getNode().getIpAddress(), serverId, config)
                .subscribe(
                    response -> {
                        // Config updated successfully
                    },
                    error -> {
                        // Log error but don't fail the request
                        System.err.println("Failed to update container config: " + error.getMessage());
                    }
                );
        }
    }
}
