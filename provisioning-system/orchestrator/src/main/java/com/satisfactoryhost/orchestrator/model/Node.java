package com.satisfactoryhost.orchestrator.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Entity
@Table(name = "nodes")
public class Node {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(unique = true)
    private String nodeId;
    
    @NotBlank
    private String hostname;
    
    @NotBlank
    private String ipAddress;
    
    @NotNull
    private Integer maxServers;
    
    @NotNull
    private Integer currentServers = 0;
    
    @NotNull
    private Double cpuUsage = 0.0;
    
    @NotNull
    private Double memoryUsage = 0.0;
    
    @NotNull
    private Double diskUsage = 0.0;
    
    @NotNull
    private Integer nextAvailablePort = 30000;
    
    @Enumerated(EnumType.STRING)
    private NodeStatus status = NodeStatus.ONLINE;
    
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now(ZoneOffset.UTC);
    
    @Column(name = "last_heartbeat")
    private ZonedDateTime lastHeartbeat = ZonedDateTime.now(ZoneOffset.UTC);
    
    @OneToMany(mappedBy = "node", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<GameServer> gameServers;
    
    // Constructors
    public Node() {}
    
    public Node(String nodeId, String hostname, String ipAddress, Integer maxServers) {
        this.nodeId = nodeId;
        this.hostname = hostname;
        this.ipAddress = ipAddress;
        this.maxServers = maxServers;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }
    
    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    
    public Integer getMaxServers() { return maxServers; }
    public void setMaxServers(Integer maxServers) { this.maxServers = maxServers; }
    
    public Integer getCurrentServers() { return currentServers; }
    public void setCurrentServers(Integer currentServers) { this.currentServers = currentServers; }
    
    public Double getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(Double cpuUsage) { this.cpuUsage = cpuUsage; }
    
    public Double getMemoryUsage() { return memoryUsage; }
    public void setMemoryUsage(Double memoryUsage) { this.memoryUsage = memoryUsage; }
    
    public Double getDiskUsage() { return diskUsage; }
    public void setDiskUsage(Double diskUsage) { this.diskUsage = diskUsage; }
    
    public Integer getNextAvailablePort() { return nextAvailablePort; }
    public void setNextAvailablePort(Integer nextAvailablePort) { this.nextAvailablePort = nextAvailablePort; }
    
    public NodeStatus getStatus() { return status; }
    public void setStatus(NodeStatus status) { this.status = status; }
    
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
    
    public ZonedDateTime getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(ZonedDateTime lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
    
    public List<GameServer> getGameServers() { return gameServers; }
    public void setGameServers(List<GameServer> gameServers) { this.gameServers = gameServers; }
    
    // Helper methods
    public boolean hasCapacity() {
        return currentServers < maxServers && status == NodeStatus.ONLINE;
    }
    
    public double getLoadScore() {
        return (cpuUsage * 0.4) + (memoryUsage * 0.4) + (diskUsage * 0.2);
    }
    
    public enum NodeStatus {
        ONLINE, OFFLINE, MAINTENANCE
    }
}
