package com.satisfactoryhost.orchestrator.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "port_allocations")
public class PortAllocation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    private Integer port;
    
    @Enumerated(EnumType.STRING)
    private PortType portType;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id")
    @JsonIgnore
    private Node node;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id")
    @JsonIgnore
    private GameServer gameServer;
    
    @Enumerated(EnumType.STRING)
    private AllocationStatus status = AllocationStatus.ALLOCATED;
    
    @Column(name = "allocated_at")
    private ZonedDateTime allocatedAt = ZonedDateTime.now(ZoneOffset.UTC);
    
    @Column(name = "released_at")
    private ZonedDateTime releasedAt;
    
    // Constructors
    public PortAllocation() {}
    
    public PortAllocation(Integer port, PortType portType, Node node, GameServer gameServer) {
        this.port = port;
        this.portType = portType;
        this.node = node;
        this.gameServer = gameServer;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Integer getPort() { return port; }
    public void setPort(Integer port) { this.port = port; }
    
    public PortType getPortType() { return portType; }
    public void setPortType(PortType portType) { this.portType = portType; }
    
    public Node getNode() { return node; }
    public void setNode(Node node) { this.node = node; }
    
    public GameServer getGameServer() { return gameServer; }
    public void setGameServer(GameServer gameServer) { this.gameServer = gameServer; }
    
    public AllocationStatus getStatus() { return status; }
    public void setStatus(AllocationStatus status) { this.status = status; }
    
    public ZonedDateTime getAllocatedAt() { return allocatedAt; }
    public void setAllocatedAt(ZonedDateTime allocatedAt) { this.allocatedAt = allocatedAt; }
    
    public ZonedDateTime getReleasedAt() { return releasedAt; }
    public void setReleasedAt(ZonedDateTime releasedAt) { this.releasedAt = releasedAt; }
    
    public enum PortType {
        GAME, BEACON  // Removed RCON since 15777 is no longer used
    }
    
    public enum AllocationStatus {
        ALLOCATED, RELEASED
    }
}
