package com.satisfactoryhost.orchestrator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.HashMap;

public class SpawnContainerRequest {
    
    @NotBlank
    private String serverId;
    
    @NotBlank
    private String serverName;
    
    @NotNull
    private Integer gamePort;
    
    @NotNull
    private Integer beaconPort;
    
    @NotNull
    private Integer ramAllocation;
    
    @NotNull
    private Integer cpuAllocation;
    
    @NotNull
    private Integer maxPlayers;
    
    private String serverPassword;
    
    private Map<String, String> environmentVariables = new HashMap<>();
    
    // Constructors
    public SpawnContainerRequest() {}
    
    public SpawnContainerRequest(String serverId, String serverName, Integer gamePort, 
                               Integer beaconPort, Integer ramAllocation, Integer cpuAllocation,
                               Integer maxPlayers, String serverPassword) {
        this.serverId = serverId;
        this.serverName = serverName;
        this.gamePort = gamePort;
        this.beaconPort = beaconPort;
        this.ramAllocation = ramAllocation;
        this.cpuAllocation = cpuAllocation;
        this.maxPlayers = maxPlayers;
        this.serverPassword = serverPassword;
    }
    
    // Getters and Setters
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    
    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }
    
    public Integer getGamePort() { return gamePort; }
    public void setGamePort(Integer gamePort) { this.gamePort = gamePort; }
    
    public Integer getBeaconPort() { return beaconPort; }
    public void setBeaconPort(Integer beaconPort) { this.beaconPort = beaconPort; }
    
    public Integer getRamAllocation() { return ramAllocation; }
    public void setRamAllocation(Integer ramAllocation) { this.ramAllocation = ramAllocation; }
    
    public Integer getCpuAllocation() { return cpuAllocation; }
    public void setCpuAllocation(Integer cpuAllocation) { this.cpuAllocation = cpuAllocation; }
    
    public Integer getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Integer maxPlayers) { this.maxPlayers = maxPlayers; }
    
    public String getServerPassword() { return serverPassword; }
    public void setServerPassword(String serverPassword) { this.serverPassword = serverPassword; }
    
    public Map<String, String> getEnvironmentVariables() { return environmentVariables; }
    public void setEnvironmentVariables(Map<String, String> environmentVariables) { this.environmentVariables = environmentVariables; }
}
