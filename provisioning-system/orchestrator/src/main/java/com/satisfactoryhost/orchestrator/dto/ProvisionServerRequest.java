package com.satisfactoryhost.orchestrator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

public class ProvisionServerRequest {
    
    @NotBlank(message = "User ID is required")
    private String userId;
    
    @NotBlank(message = "Server name is required")
    private String serverName;
    
    @NotNull(message = "RAM allocation is required")
    @Min(value = 2, message = "Minimum RAM allocation is 2GB")
    @Max(value = 64, message = "Maximum RAM allocation is 64GB")
    private Integer ramAllocation;
    
    @NotNull(message = "CPU allocation is required")
    @Min(value = 1, message = "Minimum CPU allocation is 1 core")
    @Max(value = 16, message = "Maximum CPU allocation is 16 cores")
    private Integer cpuAllocation;
    
    @NotNull(message = "Max players is required")
    @Min(value = 1, message = "Minimum 1 player")
    @Max(value = 100, message = "Maximum 100 players")
    private Integer maxPlayers;
    
    private String serverPassword;
    
    private String preferredNodeId;
    
    // Constructors
    public ProvisionServerRequest() {}
    
    public ProvisionServerRequest(String userId, String serverName, Integer ramAllocation, 
                                 Integer cpuAllocation, Integer maxPlayers) {
        this.userId = userId;
        this.serverName = serverName;
        this.ramAllocation = ramAllocation;
        this.cpuAllocation = cpuAllocation;
        this.maxPlayers = maxPlayers;
    }
    
    // Getters and Setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }
    
    public Integer getRamAllocation() { return ramAllocation; }
    public void setRamAllocation(Integer ramAllocation) { this.ramAllocation = ramAllocation; }
    
    public Integer getCpuAllocation() { return cpuAllocation; }
    public void setCpuAllocation(Integer cpuAllocation) { this.cpuAllocation = cpuAllocation; }
    
    public Integer getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Integer maxPlayers) { this.maxPlayers = maxPlayers; }
    
    public String getServerPassword() { return serverPassword; }
    public void setServerPassword(String serverPassword) { this.serverPassword = serverPassword; }
    
    public String getPreferredNodeId() { return preferredNodeId; }
    public void setPreferredNodeId(String preferredNodeId) { this.preferredNodeId = preferredNodeId; }
}
