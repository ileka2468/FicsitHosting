package com.satisfactoryhost.orchestrator.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.core.ParameterizedTypeReference;
import reactor.core.publisher.Mono;
import java.util.Map;
import java.util.HashMap;

@Service
public class RatholeService {
    
    @Autowired
    private WebClient.Builder webClientBuilder;
    
    @Value("${app.rathole.instance-manager.host}")
    private String ratholeManagerHost;
    
    @Value("${app.rathole.instance-manager.port:7001}")
    private String ratholeManagerPort;
    
    @Value("${app.rathole.api-token}")
    private String ratholeApiToken;
    
    /**
     * Create a new Rathole instance for a game server
     */
    public Mono<Map<String, Object>> createInstance(String serverId, int gamePort, int beaconPort) {
        WebClient webClient = webClientBuilder.build();
        
        Map<String, Object> request = new HashMap<>();
        request.put("server_id", serverId);
        request.put("game_port", gamePort);
        request.put("beacon_port", beaconPort);
        request.put("token", ratholeApiToken);
        
        return webClient.post()
                .uri("http://" + ratholeManagerHost + ":" + ratholeManagerPort + "/api/instances")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .doOnSuccess(response -> {
                    System.out.println("Created Rathole instance for server: " + serverId);
                })
                .doOnError(error -> {
                    System.err.println("Failed to create Rathole instance for " + serverId + ": " + error.getMessage());
                });
    }
    
    /**
     * Remove a Rathole instance for a game server
     */
    public Mono<Map<String, Object>> removeInstance(String serverId) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.delete()
                .uri("http://" + ratholeManagerHost + ":" + ratholeManagerPort + "/api/instances/" + serverId + "?token=" + ratholeApiToken)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .doOnSuccess(response -> {
                    System.out.println("Removed Rathole instance for server: " + serverId);
                })
                .doOnError(error -> {
                    System.err.println("Failed to remove Rathole instance for " + serverId + ": " + error.getMessage());
                });
    }
    
    /**
     * Get client configuration for a specific server
     */
    public Mono<Map<String, Object>> getClientConfig(String serverId, String hostIp) {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                    .scheme("http")
                    .host(ratholeManagerHost)
                    .port(Integer.parseInt(ratholeManagerPort))
                    .path("/api/instances/" + serverId + "/client-config")
                    .queryParam("token", ratholeApiToken)
                    .queryParam("host_ip", hostIp)
                    .build())
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    /**
     * List all active instances
     */
    public Mono<Map<String, Object>> listInstances() {
        WebClient webClient = webClientBuilder.build();
        
        return webClient.get()
                .uri("http://" + ratholeManagerHost + ":" + ratholeManagerPort + "/api/instances?token=" + ratholeApiToken)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
    
    // Legacy methods for backward compatibility (now redirects to instance manager)
    
    /**
     * @deprecated Use createInstance instead
     */
    @Deprecated
    public Mono<Map<String, Object>> createTunnel(String tunnelId, String bindAddr, String targetAddr) {
        // Parse server ID from tunnel ID (assuming format: serverid_game or serverid_beacon)
        String serverId = tunnelId.replaceAll("_(game|beacon)$", "");
        
        // Extract ports from addresses
        int gamePort = extractPortFromAddr(bindAddr);
        int beaconPort = gamePort + 1; // Assuming beacon port is game port + 1
        
        return createInstance(serverId, gamePort, beaconPort);
    }
    
    /**
     * @deprecated Use removeInstance instead
     */
    @Deprecated
    public Mono<Map<String, Object>> removeTunnel(String tunnelId) {
        String serverId = tunnelId.replaceAll("_(game|beacon)$", "");
        return removeInstance(serverId);
    }
    
    /**
     * @deprecated Use listInstances instead
     */
    @Deprecated
    public Mono<Map<String, Object>> listTunnels() {
        return listInstances();
    }
    
    private int extractPortFromAddr(String addr) {
        try {
            String[] parts = addr.split(":");
            return Integer.parseInt(parts[parts.length - 1]);
        } catch (Exception e) {
            return 7777; // Default fallback
        }
    }
}
