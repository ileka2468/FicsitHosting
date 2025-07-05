package com.satisfactoryhost.orchestrator.repository;

import com.satisfactoryhost.orchestrator.model.PortAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PortAllocationRepository extends JpaRepository<PortAllocation, Long> {
    
    @Query("SELECT p.port FROM PortAllocation p WHERE p.node.nodeId = :nodeId AND p.status = 'ALLOCATED'")
    List<Integer> findAllocatedPortsByNodeId(@Param("nodeId") String nodeId);
    
    @Query("SELECT p FROM PortAllocation p WHERE p.gameServer.serverId = :serverId")
    List<PortAllocation> findByServerId(@Param("serverId") String serverId);
    
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM PortAllocation p " +
           "WHERE p.port = :port AND p.node.nodeId = :nodeId AND p.status = 'ALLOCATED'")
    boolean isPortAllocated(@Param("port") Integer port, @Param("nodeId") String nodeId);
}
