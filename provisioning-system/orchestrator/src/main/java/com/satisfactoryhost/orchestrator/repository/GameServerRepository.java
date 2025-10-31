package com.satisfactoryhost.orchestrator.repository;

import com.satisfactoryhost.orchestrator.model.GameServer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GameServerRepository extends JpaRepository<GameServer, Long> {
    
    Optional<GameServer> findByServerId(String serverId);
    
    List<GameServer> findByUserId(String userId);
    
    List<GameServer> findByStatus(GameServer.ServerStatus status);
    
    @Query("SELECT g FROM GameServer g WHERE g.node.nodeId = :nodeId")
    List<GameServer> findByNodeId(@Param("nodeId") String nodeId);
    
    @Query("SELECT COUNT(g) FROM GameServer g WHERE g.node.nodeId = :nodeId AND g.status IN ('RUNNING', 'STARTING')")
    Long countActiveServersByNodeId(@Param("nodeId") String nodeId);
}
