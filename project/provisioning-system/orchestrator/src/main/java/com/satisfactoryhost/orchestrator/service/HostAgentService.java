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
        WebClient webClient = webClientBuilder.build();
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/spawn")
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
    public Mono<Map<String, Object>> stopContainer(String nodeIpAddress, String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, String> request = new HashMap<>();
        request.put("serverId", serverId);
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/stop")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
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
    public Mono<Map<String, Object>> startContainer(String nodeIpAddress, String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, String> request = new HashMap<>();
        request.put("serverId", serverId);
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/containers/start")
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
        WebClient webClient = webClientBuilder.build();
        
        Map<String, Object> request = new HashMap<>();
        request.put("serverId", serverId);
        request.put("clientConfig", clientConfig);
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/rathole/clients/" + serverId + "/configure")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Stop Rathole client on host agent
     */
    public Mono<Map<String, Object>> stopRatholeClient(String nodeIpAddress, String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/rathole/clients/" + serverId + "/stop")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * Start Rathole client on host agent
     */
    public Mono<Map<String, Object>> startRatholeClient(String nodeIpAddress, String serverId, int gamePort, int beaconPort) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, Object> request = new HashMap<>();
        request.put("gamePort", gamePort);
        request.put("beaconPort", beaconPort);
        
        return webClient.post()
                .uri("http://" + nodeIpAddress + ":" + hostAgentPort + "/api/rathole/clients/" + serverId + "/start")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
}
