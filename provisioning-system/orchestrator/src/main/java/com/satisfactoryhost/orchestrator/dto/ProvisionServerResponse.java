package com.satisfactoryhost.orchestrator.dto;

import com.satisfactoryhost.orchestrator.model.GameServer;
import java.time.ZonedDateTime;

public class ProvisionServerResponse {
    
    private String serverId;
    private String serverName;
    private String status;
    private String nodeId;
    private String joinAddress;
    private Integer gamePort;
    private Integer beaconPort;
    private String message;
    private ZonedDateTime createdAt;
    
    // Constructors
    public ProvisionServerResponse() {}
    
    public ProvisionServerResponse(String serverId, String message) {
        this.serverId = serverId;
        this.message = message;
    }
    
    public static ProvisionServerResponse fromGameServer(GameServer server, String publicIp) {
        ProvisionServerResponse response = new ProvisionServerResponse();
        response.serverId = server.getServerId();
        response.serverName = server.getServerName();
        response.status = server.getStatus().name();
        response.nodeId = server.getNode().getNodeId();
        response.joinAddress = publicIp;
        response.gamePort = server.getGamePort();
        response.beaconPort = server.getBeaconPort();
        response.createdAt = server.getCreatedAt();
        response.message = "Server provisioning initiated successfully";
        return response;
    }
    
    // Getters and Setters
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    
    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }
    
    public String getJoinAddress() { return joinAddress; }
    public void setJoinAddress(String joinAddress) { this.joinAddress = joinAddress; }
    
    public Integer getGamePort() { return gamePort; }
    public void setGamePort(Integer gamePort) { this.gamePort = gamePort; }
    
    public Integer getBeaconPort() { return beaconPort; }
    public void setBeaconPort(Integer beaconPort) { this.beaconPort = beaconPort; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
