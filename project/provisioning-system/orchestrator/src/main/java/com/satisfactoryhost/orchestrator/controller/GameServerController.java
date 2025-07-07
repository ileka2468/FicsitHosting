package com.satisfactoryhost.orchestrator.controller;

import com.satisfactoryhost.orchestrator.dto.ProvisionServerRequest;
import com.satisfactoryhost.orchestrator.dto.ProvisionServerResponse;
import com.satisfactoryhost.orchestrator.model.GameServer;
import com.satisfactoryhost.orchestrator.service.ProvisioningService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/servers")
@CrossOrigin(origins = "*")
public class GameServerController {
    
    @Autowired
    private ProvisioningService provisioningService;
    
    /**
     * Provision a new Satisfactory server
     */
    @PostMapping
    public ResponseEntity<ProvisionServerResponse> provisionServer(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProvisionServerRequest request) {
        try {
            ProvisionServerResponse response = provisioningService.provisionServer(authHeader, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ProvisionServerResponse errorResponse = new ProvisionServerResponse(
                null,
                "Failed to provision server: " + e.getMessage()
            );
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Legacy endpoint for provisioning
     */
    @PostMapping("/provision")
    public ResponseEntity<ProvisionServerResponse> provisionServerLegacy(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProvisionServerRequest request) {
        return provisionServer(authHeader, request);
    }

    /**
     * Get all servers for the authenticated user
     */
    @GetMapping
    public ResponseEntity<List<GameServer>> getServers(
            @RequestHeader("Authorization") String authHeader) {
        try {
            List<GameServer> servers = provisioningService.getServersForCurrentUser(authHeader);
            return ResponseEntity.ok(servers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Get all servers for a user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<GameServer>> getUserServers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String userId) {
        try {
            List<GameServer> servers = provisioningService.getUserServers(authHeader, userId);
            return ResponseEntity.ok(servers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Get server details by ID
     */
    @GetMapping("/{serverId}")
    public ResponseEntity<GameServer> getServer(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            GameServer server = provisioningService.getServerById(authHeader, serverId);
            if (server != null) {
                return ResponseEntity.ok(server);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Start a server
     */
    @PostMapping("/{serverId}/start")
    public ResponseEntity<Map<String, String>> startServer(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            provisioningService.startServer(authHeader, serverId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Server start command sent");
            response.put("serverId", serverId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Stop a server
     */
    @PostMapping("/{serverId}/stop")
    public ResponseEntity<Map<String, String>> stopServer(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            provisioningService.stopServer(authHeader, serverId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Server stop command sent");
            response.put("serverId", serverId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Restart a server
     */
    @PostMapping("/{serverId}/restart")
    public ResponseEntity<Map<String, String>> restartServer(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            provisioningService.restartServer(authHeader, serverId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Server restart command sent");
            response.put("serverId", serverId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Delete a server
     */
    @DeleteMapping("/{serverId}")
    public ResponseEntity<Map<String, String>> deleteServer(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            provisioningService.deleteServer(authHeader, serverId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Server deletion initiated");
            response.put("serverId", serverId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Get server status and statistics
     */
    @GetMapping("/{serverId}/status")
    public ResponseEntity<Map<String, Object>> getServerStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            Map<String, Object> status = provisioningService.getServerStatus(authHeader, serverId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Update server configuration
     */
    @PutMapping("/{serverId}/config")
    public ResponseEntity<Map<String, String>> updateServerConfig(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId,
            @RequestBody Map<String, Object> config) {
        try {
            provisioningService.updateServerConfig(authHeader, serverId, config);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Server configuration updated");
            response.put("serverId", serverId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Get server data information
     */
    @GetMapping("/{serverId}/data-info")
    public ResponseEntity<Map<String, Object>> getServerDataInfo(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String serverId) {
        try {
            Map<String, Object> dataInfo = provisioningService.getServerDataInfo(authHeader, serverId);
            return ResponseEntity.ok(dataInfo);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Get data summary for all servers of a user
     */
    @GetMapping("/user/{userId}/data-summary")
    public ResponseEntity<Map<String, Object>> getUserServersDataSummary(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String userId) {
        try {
            Map<String, Object> summary = provisioningService.getUserServersDataSummary(authHeader, userId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
