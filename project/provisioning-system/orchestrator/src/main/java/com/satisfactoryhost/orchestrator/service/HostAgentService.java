package com.satisfactoryhost.orchestrator.service;

import com.satisfactoryhost.orchestrator.dto.SpawnContainerRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.core.ParameterizedTypeReference;
import reactor.core.publisher.Mono;
import java.util.Map;
import java.util.HashMap;

@Service
public class HostAgentService {
    
    @Autowired
    private WebClient.Builder webClientBuilder;
    
    @Value("${app.host-agent.port:8081}")
    private String hostAgentPort;
    
    /**
     * Send container spawn request to host agent
     */
    public Mono<Map<String, Object>> spawnContainer(String nodeIpAddress, SpawnContainerRequest request) {
        return spawnContainer(nodeIpAddress, request, null);
    }
    
    /**
     * Send container spawn request to host agent with access token
     */
    public Mono<Map<String, Object>> spawnContainer(String nodeIpAddress, SpawnContainerRequest request, String accessToken) {
        WebClient webClient = webClientBuilder.build();
        
        WebClient.RequestBodySpec requestSpec = webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/spawn");
        
        // Add authorization header if access token is provided
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            // Check if token already has "Bearer " prefix
            if (accessToken.startsWith("Bearer ")) {
                requestSpec = requestSpec.header("Authorization", accessToken);
            } else {
                requestSpec = requestSpec.header("Authorization", "Bearer " + accessToken);
            }
        }
        
        return requestSpec
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .doOnError(error -> {
                    System.err.println("Failed to spawn container on node " + nodeIpAddress + ": " + error.getMessage());
                });
    }
    
    /**
     * Stop a container on a host agent
     */
    public Mono<Map<String, Object>> stopContainer(String nodeIpAddress, String serverId, String accessToken) {
        return stopContainer(nodeIpAddress, serverId, "stop", accessToken);
    }
    
    /**
     * Restart a container on a host agent
     */
    public Mono<Map<String, Object>> restartContainer(String nodeIpAddress, String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, String> request = new HashMap<>();
        request.put("serverId", serverId);
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/restart")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Get container status from host agent
     */
    public Mono<Map<String, Object>> getContainerStatus(String nodeIpAddress, String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.get()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/" + serverId + "/status")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Get node statistics from host agent
     */
    public Mono<Map<String, Object>> getNodeStats(String nodeIpAddress) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.get()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/stats")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Start a container on a host agent
     */
    public Mono<Map<String, Object>> startContainer(String nodeIpAddress, String serverId, String accessToken) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, String> request = new HashMap<>();
        request.put("serverId", serverId);

        WebClient.RequestBodySpec requestSpec = webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/start");

        // Add authorization header if access token is provided
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            // Check if token already has "Bearer " prefix
            if (accessToken.startsWith("Bearer ")) {
                requestSpec = requestSpec.header("Authorization", accessToken);
            } else {
                requestSpec = requestSpec.header("Authorization", "Bearer " + accessToken);
            }
        }

        return requestSpec
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
        
    /**
     * Update container configuration
     */
    public Mono<Map<String, Object>> updateContainerConfig(String nodeIpAddress, String serverId, Map<String, Object> config) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, Object> request = new HashMap<>();
        request.put("serverId", serverId);
        request.put("config", config);
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/" + serverId + "/config")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Configure Rathole client on host agent
     */
    public Mono<Map<String, Object>> configureRatholeClient(String nodeIpAddress, String serverId, String clientConfig) {
        return configureRatholeClient(nodeIpAddress, serverId, clientConfig, null);
    }
    
    /**
     * Configure Rathole client on host agent with access token
     */
    public Mono<Map<String, Object>> configureRatholeClient(String nodeIpAddress, String serverId, String clientConfig, String accessToken) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, Object> request = new HashMap<>();
        request.put("serverId", serverId);
        request.put("clientConfig", clientConfig);
        
        WebClient.RequestBodySpec requestSpec = webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/rathole/clients/" + serverId + "/configure");
        
        // Add authorization header if access token is provided
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            // Check if token already has "Bearer " prefix
            if (accessToken.startsWith("Bearer ")) {
                requestSpec = requestSpec.header("Authorization", accessToken);
            } else {
                requestSpec = requestSpec.header("Authorization", "Bearer " + accessToken);
            }
        }
        
        return requestSpec
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Stop Rathole client on host agent with access token
     */
    public Mono<Map<String, Object>> stopRatholeClient(String nodeIpAddress, String serverId, String accessToken) {
        WebClient webClient = webClientBuilder.build();
        
        WebClient.RequestHeadersSpec<?> requestSpec = webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/rathole/clients/" + serverId + "/stop");
        
        // Add authorization header if access token is provided
        if (accessToken != null) {
            // Check if token already has "Bearer " prefix to avoid double "Bearer"
            if (accessToken.startsWith("Bearer ")) {
                requestSpec = requestSpec.header("Authorization", accessToken);
            } else {
                requestSpec = requestSpec.header("Authorization", "Bearer " + accessToken);
            }
        }
        
        return requestSpec
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Stop Rathole client on host agent (legacy method)
     */
    public Mono<Map<String, Object>> stopRatholeClient(String nodeIpAddress, String serverId) {
        return stopRatholeClient(nodeIpAddress, serverId, null);
    }
    
    /**
     * Start Rathole client on host agent
     */
    public Mono<Map<String, Object>> startRatholeClient(
            String nodeIpAddress,
            String serverId,
            int gamePort,
            int beaconPort,
            Integer frpsPort,
            String frpsToken) {
        WebClient webClient = webClientBuilder.build();

        Map<String, Object> request = new HashMap<>();
        request.put("gamePort", gamePort);
        request.put("beaconPort", beaconPort);
        if (frpsPort != null) {
            request.put("frpsPort", frpsPort);
        }
        if (frpsToken != null) {
            request.put("frpsToken", frpsToken);
        }

        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/rathole/clients/" + serverId + "/start")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /**
     * Start Rathole client on host agent (legacy method without frps port/token)
     */
    public Mono<Map<String, Object>> startRatholeClient(String nodeIpAddress, String serverId, int gamePort, int beaconPort) {
        return startRatholeClient(nodeIpAddress, serverId, gamePort, beaconPort, null, null);
    }
    
    /**
     * Delete server completely including all data and volumes
     */
    public Mono<Map<String, Object>> deleteServerCompletely(String nodeIpAddress, String serverId, String accessToken) {
        WebClient webClient = webClientBuilder.build();
        
        WebClient.RequestHeadersSpec<?> requestSpec = webClient.delete()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/" + serverId + "/delete");
        
        // Add authentication header if provided
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            if (accessToken.startsWith("Bearer ")) {
                requestSpec = requestSpec.header("Authorization", accessToken);
            } else {
                requestSpec = requestSpec.header("Authorization", "Bearer " + accessToken);
            }
        }
        
        return requestSpec
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Get server data information
     */
    public Mono<Map<String, Object>> getServerDataInfo(String nodeIpAddress, String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.get()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/" + serverId + "/data-info")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Get data summary for all servers on a node
     */
    public Mono<Map<String, Object>> getNodeDataSummary(String nodeIpAddress) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.get()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/data-summary")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Stop container with cleanup type
     */
    public Mono<Map<String, Object>> stopContainer(String nodeIpAddress, String serverId, String cleanupType, String accessToken) {
        WebClient webClient = webClientBuilder.build();

        // Add authorization header if access token is provided
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            // Check if token already has "Bearer " prefix
            if (accessToken.startsWith("Bearer ")) {
                webClient = webClient.mutate().defaultHeader("Authorization", accessToken).build();
            } else {
                webClient = webClient.mutate().defaultHeader("Authorization", "Bearer " + accessToken).build();
            }
        }
        
        Map<String, String> request = new HashMap<>();
        request.put("serverId", serverId);
        if (cleanupType != null) {
            request.put("cleanupType", cleanupType);
        }
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/stop")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
}
