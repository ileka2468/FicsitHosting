package com.satisfactoryhost.orchestrator.service;

import com.satisfactoryhost.orchestrator.model.Node;
import com.satisfactoryhost.orchestrator.repository.NodeRepository;
import com.satisfactoryhost.orchestrator.repository.GameServerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Service
public class NodeSchedulerService {
    
    @Autowired
    private NodeRepository nodeRepository;
    
    @Autowired
    private GameServerRepository gameServerRepository;
    
    /**
     * Choose the best available node based on load and capacity
     */
    public Optional<Node> chooseBestNode() {
        List<Node> availableNodes = nodeRepository.findAvailableNodesByLoad();
        
        if (availableNodes.isEmpty()) {
            return Optional.empty();
        }
        
        // Return the node with the lowest load score
        return Optional.of(availableNodes.get(0));
    }
    
    /**
     * Choose a specific node if available
     */
    public Optional<Node> chooseSpecificNode(String nodeId) {
        Optional<Node> nodeOpt = nodeRepository.findByNodeId(nodeId);
        
        if (nodeOpt.isPresent()) {
            Node node = nodeOpt.get();
            if (node.hasCapacity()) {
                return nodeOpt;
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * Update node statistics and heartbeat
     */
    public void updateNodeStats(String nodeId, double cpuUsage, double memoryUsage, double diskUsage) {
        Optional<Node> nodeOpt = nodeRepository.findByNodeId(nodeId);
        
        if (nodeOpt.isPresent()) {
            Node node = nodeOpt.get();
            
            // Debug logging
            // System.out.println("Before update - Node: " + nodeId);
            // System.out.println("  Current lastHeartbeat: " + node.getLastHeartbeat());
            // System.out.println("  Current CPU: " + node.getCpuUsage());
            // System.out.println("  Current Memory: " + node.getMemoryUsage());
            // System.out.println("  Current Disk: " + node.getDiskUsage());
            
            node.setCpuUsage(cpuUsage);
            node.setMemoryUsage(memoryUsage);
            node.setDiskUsage(diskUsage);
            
            // Update heartbeat timestamp and ensure node is online
            ZonedDateTime newHeartbeat = ZonedDateTime.now(ZoneOffset.UTC);
            node.setLastHeartbeat(newHeartbeat);
            node.setStatus(Node.NodeStatus.ONLINE);
            
            // Update current server count
            Long activeServers = gameServerRepository.countActiveServersByNodeId(nodeId);
            node.setCurrentServers(activeServers.intValue());
            
            // Debug logging
            // System.out.println("After update - Node: " + nodeId);
            // System.out.println("  New lastHeartbeat: " + newHeartbeat);
            // System.out.println("  New CPU: " + cpuUsage);
            // System.out.println("  New Memory: " + memoryUsage);
            // System.out.println("  New Disk: " + diskUsage);
            // System.out.println("  Active servers: " + activeServers);
            
            Node savedNode = nodeRepository.save(node);
            System.out.println("Saved node - lastHeartbeat: " + savedNode.getLastHeartbeat());
        } else {
            System.out.println("Node not found: " + nodeId);
        }
    }
    
    /**
     * Get all online nodes
     */
    public List<Node> getOnlineNodes() {
        return nodeRepository.findOnlineNodes();
    }
    
    /**
     * Register a new node
     */
    public Node registerNode(String nodeId, String hostname, String ipAddress, Integer maxServers) {
        Optional<Node> existingNode = nodeRepository.findByNodeId(nodeId);
        
        if (existingNode.isPresent()) { 
            Node node = existingNode.get();
            // Check if IP address has changed and update if necessary
            if (!ipAddress.equals(node.getIpAddress())) {
                node.setIpAddress(ipAddress);
            }
            node.setStatus(Node.NodeStatus.ONLINE);
            return nodeRepository.save(node);
        } else {
            Node newNode = new Node(nodeId, hostname, ipAddress, maxServers);
            return nodeRepository.save(newNode);
        }
    }
    
    /**
     * Mark node as offline
     */
    public void markNodeOffline(String nodeId) {
        Optional<Node> nodeOpt = nodeRepository.findByNodeId(nodeId);
        
        if (nodeOpt.isPresent()) {
            Node node = nodeOpt.get();
            node.setStatus(Node.NodeStatus.OFFLINE);
            nodeRepository.save(node);
        }
    }
    
    /**
     * Check for nodes that haven't sent heartbeats and mark them offline
     * Should be called periodically by a scheduled task
     * @param timeoutMinutes Number of minutes to wait before considering a node offline (can be fractional)
     */
    public void checkNodeHealth(double timeoutMinutes) {
        // Convert fractional minutes to seconds for more precision
        long timeoutSeconds = (long) (timeoutMinutes * 60);
        ZonedDateTime heartbeatTimeout = ZonedDateTime.now(ZoneOffset.UTC).minusSeconds(timeoutSeconds);
        
        List<Node> onlineNodes = nodeRepository.findOnlineNodes();
        
        for (Node node : onlineNodes) {
            if (node.getLastHeartbeat().isBefore(heartbeatTimeout)) {
                System.out.println("Node " + node.getNodeId() + " missed heartbeat, marking as OFFLINE (Last heartbeat: " + node.getLastHeartbeat() + " UTC, Timeout: " + timeoutMinutes + " minutes)");
                node.setStatus(Node.NodeStatus.OFFLINE);
                nodeRepository.save(node);
            }
        }
    }
    
    /**
     * Check for nodes that haven't sent heartbeats and mark them offline
     * @param timeoutMinutes Number of minutes to wait before considering a node offline
     */
    public void checkNodeHealth(int timeoutMinutes) {
        checkNodeHealth((double) timeoutMinutes);
    }
    
    /**
     * Check for nodes that haven't sent heartbeats and mark them offline
     * Uses default timeout of 3 minutes
     */
    public void checkNodeHealth() {
        checkNodeHealth(3);
    }
}
