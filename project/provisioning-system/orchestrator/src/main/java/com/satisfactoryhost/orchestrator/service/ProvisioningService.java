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
import java.util.ArrayList;

@Service
public class ProvisioningService {
    
    @Autowired
    private NodeSchedulerService nodeSchedulerService;
    
    @Autowired
    private PortAllocationService portAllocationService;
    
    @Autowired
    private HostAgentService hostAgentService;
    
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
        
        // Send request to host agent asynchronously with JWT token
        hostAgentService.spawnContainer(selectedNode.getIpAddress(), spawnRequest, jwt)
            .subscribe(
                response -> {
                    // Update server status on success
                    finalGameServer.setStatus(GameServer.ServerStatus.STARTING);
                    finalGameServer.setStartedAt(ZonedDateTime.now(ZoneOffset.UTC));
                    if (response.containsKey("containerId")) {
                        finalGameServer.setContainerId(response.get("containerId").toString());
                    }
                    gameServerRepository.save(finalGameServer);
                    
                    // Host agent handles tunnel creation during spawn
                    System.out.println("Container spawned successfully. Tunnel creation handled by host agent for server: " + finalGameServer.getServerId());
                    
                    // Check container status after a brief delay to see if it's running
                    checkContainerStatusAndUpdateServer(finalGameServer);
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
        hostAgentService.stopContainer(server.getNode().getIpAddress(), serverId, jwt)
            .subscribe(
                response -> {
                    server.setStatus(GameServer.ServerStatus.STOPPED);
                    gameServerRepository.save(server);
                    
                    // Remove Rathole tunnels
                    removeRatholeTunnels(server, jwt);
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
        
        // Set status to indicate deletion in progress
        server.setStatus(GameServer.ServerStatus.ERROR); // Use ERROR as deletion indicator
        gameServerRepository.save(server);
        
        // Use the new complete deletion endpoint on host agent
        hostAgentService.deleteServerCompletely(server.getNode().getIpAddress(), serverId, jwt)
            .subscribe(
                response -> {
                    // Release ports
                    portAllocationService.releasePorts(serverId);
                    
                    // Remove Rathole tunnels
                    removeRatholeTunnels(server, jwt);
                    
                    // Delete server record from database
                    gameServerRepository.delete(server);
                    
                    System.out.println("Server " + serverId + " completely deleted");
                },
                error -> {
                    System.err.println("Failed to completely delete server " + serverId + ": " + error.getMessage());
                    // Attempt fallback cleanup
                    portAllocationService.releasePorts(serverId);
                    removeRatholeTunnels(server, jwt);
                    gameServerRepository.delete(server);
                }
            );
    }
      private void removeRatholeTunnels(GameServer server, String jwt) {
        // Stop Rathole client on host agent - this will also remove the tunnel instance
        hostAgentService.stopRatholeClient(server.getNode().getIpAddress(), server.getServerId(), jwt)
            .subscribe(
                stopSuccess -> System.out.println("Rathole client stopped and tunnel removed for " + server.getServerId()),
                stopError -> System.err.println("Failed to stop Rathole client: " + stopError.getMessage())
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
     * Get all servers for the authenticated user
     */
    public List<GameServer> getServersForCurrentUser(String jwt) {
        UserInfo user = validateJwtAndGetUser(jwt);
        return gameServerRepository.findByUserId(user.getId().toString());
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
                    
                    // Host agent handles tunnel configuration
                    System.out.println("Container started successfully. Tunnel already configured by host agent for server: " + server.getServerId());
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
    
    /**
     * Check container status after spawn and update server status to RUNNING if container is running
     */
    private void checkContainerStatusAndUpdateServer(GameServer server) {
        // Use a separate thread to check status after a delay
        new Thread(() -> {
            try {
                // Wait 5 seconds for container to fully start
                Thread.sleep(5000);
                
                hostAgentService.getContainerStatus(server.getNode().getIpAddress(), server.getServerId())
                    .subscribe(
                        statusResponse -> {
                            if (statusResponse.containsKey("status")) {
                                String containerStatus = statusResponse.get("status").toString();
                                System.out.println("Container status for " + server.getServerId() + ": " + containerStatus);
                                
                                // Update server status based on container status
                                if ("running".equalsIgnoreCase(containerStatus)) {
                                    server.setStatus(GameServer.ServerStatus.RUNNING);
                                    gameServerRepository.save(server);
                                    System.out.println("Updated server " + server.getServerId() + " status to RUNNING");
                                } else if ("exited".equalsIgnoreCase(containerStatus) || 
                                          "dead".equalsIgnoreCase(containerStatus)) {
                                    server.setStatus(GameServer.ServerStatus.ERROR);
                                    gameServerRepository.save(server);
                                    System.out.println("Updated server " + server.getServerId() + " status to ERROR due to container status: " + containerStatus);
                                }
                                // For other statuses like "created", "restarting", keep STARTING
                            }
                        },
                        error -> {
                            System.err.println("Failed to check container status for " + server.getServerId() + ": " + error.getMessage());
                            // Don't change status on error - server might still be starting
                        }
                    );
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                System.err.println("Container status check interrupted for " + server.getServerId());
            }
        }).start();
    }
    
    /**
     * Get server data information
     */
    public Map<String, Object> getServerDataInfo(String jwt, String serverId) {
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
        
        try {
            Map<String, Object> dataInfo = hostAgentService.getServerDataInfo(
                server.getNode().getIpAddress(), serverId).block();
                
            if (dataInfo != null && "success".equals(dataInfo.get("status"))) {
                return dataInfo;
            } else {
                throw new RuntimeException("Failed to get server data info from host agent");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error getting server data info: " + e.getMessage());
        }
    }
    
    /**
     * Get data summary for all servers of a user
     */
    public Map<String, Object> getUserServersDataSummary(String jwt, String userId) {
        // Validate JWT and get user info
        UserInfo user = validateJwtAndGetUser(jwt);
        
        // Users can only see their own servers, unless they're admins or service accounts
        if (!hasRole(user, "ADMIN") && !hasRole(user, "SERVICE_ACCOUNT")) {
            if (!userId.equals(user.getId().toString())) {
                throw new RuntimeException("Insufficient permissions: You can only view your own servers");
            }
        }
        
        List<GameServer> userServers = gameServerRepository.findByUserId(userId);
        
        Map<String, Object> summary = new HashMap<>();
        summary.put("total_servers", userServers.size());
        summary.put("total_size", 0L);
        summary.put("servers", new ArrayList<>());
        
        long totalSize = 0;
        List<Map<String, Object>> serverDataList = new ArrayList<>();
        
        for (GameServer server : userServers) {
            try {
                Map<String, Object> dataInfo = hostAgentService.getServerDataInfo(
                    server.getNode().getIpAddress(), server.getServerId()).block();
                    
                if (dataInfo != null && "success".equals(dataInfo.get("status"))) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> dataInfoMap = (Map<String, Object>) dataInfo.get("data_info");
                    
                    // Add server metadata
                    dataInfoMap.put("server_name", server.getServerName());
                    dataInfoMap.put("status", server.getStatus().toString());
                    dataInfoMap.put("node_id", server.getNode().getNodeId());
                    
                    serverDataList.add(dataInfoMap);
                    
                    // Calculate total size
                    Long serverDirSize = (Long) dataInfoMap.get("server_dir_size");
                    Long ratholeDirSize = (Long) dataInfoMap.get("rathole_dir_size");
                    if (serverDirSize != null) totalSize += serverDirSize;
                    if (ratholeDirSize != null) totalSize += ratholeDirSize;
                }
            } catch (Exception e) {
                System.err.println("Failed to get data info for server " + server.getServerId() + ": " + e.getMessage());
            }
        }
        
        summary.put("total_size", totalSize);
        summary.put("servers", serverDataList);
        
        return summary;
    }
}
