package com.satisfactoryhost.orchestrator.controller;

import com.satisfactoryhost.orchestrator.model.Node;
import com.satisfactoryhost.orchestrator.service.NodeSchedulerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/nodes")
@CrossOrigin(origins = "*")
public class NodeController {
    
    @Autowired
    private NodeSchedulerService nodeSchedulerService;
    
    /**
     * Get all online nodes
     */
    @GetMapping
    public ResponseEntity<List<Node>> getOnlineNodes() {
        List<Node> nodes = nodeSchedulerService.getOnlineNodes();
        return ResponseEntity.ok(nodes);
    }
    
    /**
     * Register a new node or update existing one
     */
    @PostMapping("/register")
    public ResponseEntity<Node> registerNode(@RequestBody Map<String, Object> request) {
        try {
            String nodeId = (String) request.get("nodeId");
            String hostname = (String) request.get("hostname");
            String ipAddress = (String) request.get("ipAddress");
            Integer maxServers = (Integer) request.get("maxServers");
            
            Node node = nodeSchedulerService.registerNode(nodeId, hostname, ipAddress, maxServers);
            return ResponseEntity.ok(node);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Update node statistics
     */
    @PostMapping("/{nodeId}/stats")
    public ResponseEntity<Map<String, String>> updateNodeStats(
            @PathVariable String nodeId,
            @RequestBody Map<String, Object> stats) {
        try {
            Double cpuUsage = ((Number) stats.get("cpuUsage")).doubleValue();
            Double memoryUsage = ((Number) stats.get("memoryUsage")).doubleValue();
            Double diskUsage = ((Number) stats.get("diskUsage")).doubleValue();
            
            nodeSchedulerService.updateNodeStats(nodeId, cpuUsage, memoryUsage, diskUsage);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Node stats updated successfully");
            response.put("nodeId", nodeId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Mark node as offline
     */
    @PostMapping("/{nodeId}/offline")
    public ResponseEntity<Map<String, String>> markNodeOffline(@PathVariable String nodeId) {
        try {
            nodeSchedulerService.markNodeOffline(nodeId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Node marked as offline");
            response.put("nodeId", nodeId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
