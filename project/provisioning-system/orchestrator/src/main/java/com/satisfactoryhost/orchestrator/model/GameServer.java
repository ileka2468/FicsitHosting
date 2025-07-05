package com.satisfactoryhost.orchestrator.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "game_servers")
public class GameServer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(unique = true)
    private String serverId;
    
    @NotBlank
    private String userId;
    
    @NotBlank
    private String serverName;
    
    @Enumerated(EnumType.STRING)
    private ServerStatus status = ServerStatus.PROVISIONING;
    
    // Ports will be allocated after server creation
    private Integer gamePort;
    
    private Integer beaconPort;
    
    // Removed RCON port since 15777 is no longer used
    
    // Container ID - will be set when container is actually created
    private String containerId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id")
    @JsonBackReference
    private Node node;
    
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now(ZoneOffset.UTC);
    
    @Column(name = "started_at")
    private ZonedDateTime startedAt;
    
    @Column(name = "last_seen")
    private ZonedDateTime lastSeen;
    
    // Server configuration
    private Integer ramAllocation;
    private Integer cpuAllocation;
    private Integer maxPlayers;
    private String serverPassword;
    
    // Constructors
    public GameServer() {}
    
    public GameServer(String serverId, String userId, String serverName, Node node) {
        this.serverId = serverId;
        this.userId = userId;
        this.serverName = serverName;
        this.node = node;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }
    
    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }
    
    public Integer getGamePort() { return gamePort; }
    public void setGamePort(Integer gamePort) { this.gamePort = gamePort; }
    
    public Integer getBeaconPort() { return beaconPort; }
    public void setBeaconPort(Integer beaconPort) { this.beaconPort = beaconPort; }
    
    public String getContainerId() { return containerId; }
    public void setContainerId(String containerId) { this.containerId = containerId; }
    
    public Node getNode() { return node; }
    public void setNode(Node node) { this.node = node; }
    
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
    
    public ZonedDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(ZonedDateTime startedAt) { this.startedAt = startedAt; }
    
    public ZonedDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(ZonedDateTime lastSeen) { this.lastSeen = lastSeen; }
    
    public Integer getRamAllocation() { return ramAllocation; }
    public void setRamAllocation(Integer ramAllocation) { this.ramAllocation = ramAllocation; }
    
    public Integer getCpuAllocation() { return cpuAllocation; }
    public void setCpuAllocation(Integer cpuAllocation) { this.cpuAllocation = cpuAllocation; }
    
    public Integer getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Integer maxPlayers) { this.maxPlayers = maxPlayers; }
    
    public String getServerPassword() { return serverPassword; }
    public void setServerPassword(String serverPassword) { this.serverPassword = serverPassword; }
    
    public enum ServerStatus {
        PROVISIONING, STARTING, RUNNING, STOPPING, STOPPED, RESTARTING, ERROR, MAINTENANCE
    }
}
