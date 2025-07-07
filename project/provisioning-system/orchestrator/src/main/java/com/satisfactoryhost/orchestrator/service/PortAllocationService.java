package com.satisfactoryhost.orchestrator.service;

import com.satisfactoryhost.orchestrator.model.Node;
import com.satisfactoryhost.orchestrator.model.GameServer;
import com.satisfactoryhost.orchestrator.model.PortAllocation;
import com.satisfactoryhost.orchestrator.repository.PortAllocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PortAllocationService {
    
    @Autowired
    private PortAllocationRepository portAllocationRepository;
    
    private static final int PORT_RANGE_START = 30000;
    private static final int PORT_RANGE_END = 35000;
    
    /**
     * Allocate ports for a new server (game and beacon ports only)
     */
    public PortAllocationResult allocatePorts(Node node, GameServer gameServer) {
        List<Integer> allocatedPorts = portAllocationRepository.findAllocatedPortsByNodeId(node.getNodeId());
        Set<Integer> allocatedPortSet = allocatedPorts.stream().collect(Collectors.toSet());
        
        // Find two consecutive available ports
        for (int basePort = PORT_RANGE_START; basePort <= PORT_RANGE_END - 1; basePort += 2) {
            int gamePort = basePort;
            int beaconPort = basePort + 1;
            
            if (!allocatedPortSet.contains(gamePort) && !allocatedPortSet.contains(beaconPort)) {
                // Allocate the ports
                PortAllocation gamePortAllocation = new PortAllocation(
                    gamePort, PortAllocation.PortType.GAME, node, gameServer);
                PortAllocation beaconPortAllocation = new PortAllocation(
                    beaconPort, PortAllocation.PortType.BEACON, node, gameServer);
                
                portAllocationRepository.save(gamePortAllocation);
                portAllocationRepository.save(beaconPortAllocation);
                
                // Update node's next available port
                node.setNextAvailablePort(beaconPort + 1);
                
                return new PortAllocationResult(gamePort, beaconPort, true);
            }
        }
        
        return new PortAllocationResult(0, 0, false);
    }
    
    /**
     * Release ports for a server
     */
    public void releasePorts(String serverId) {
        List<PortAllocation> allocations = portAllocationRepository.findByServerId(serverId);
        
        for (PortAllocation allocation : allocations) {
            allocation.setStatus(PortAllocation.AllocationStatus.RELEASED);
            allocation.setReleasedAt(ZonedDateTime.now(ZoneOffset.UTC));
        }
        
        // Save the status update first
        portAllocationRepository.saveAll(allocations);
        
        // Then delete the port allocation records to avoid foreign key constraint
        portAllocationRepository.deleteAll(allocations);
    }
    
    /**
     * Check if a port is available on a node
     */
    public boolean isPortAvailable(Integer port, String nodeId) {
        return !portAllocationRepository.isPortAllocated(port, nodeId);
    }
    
    /**
     * Result class for port allocation
     */
    public static class PortAllocationResult {
        private final int gamePort;
        private final int beaconPort;
        private final boolean success;
        
        public PortAllocationResult(int gamePort, int beaconPort, boolean success) {
            this.gamePort = gamePort;
            this.beaconPort = beaconPort;
            this.success = success;
        }
        
        public int getGamePort() { return gamePort; }
        public int getBeaconPort() { return beaconPort; }
        public boolean isSuccess() { return success; }
    }
}
