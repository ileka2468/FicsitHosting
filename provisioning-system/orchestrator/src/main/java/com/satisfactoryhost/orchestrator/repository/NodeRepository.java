package com.satisfactoryhost.orchestrator.repository;

import com.satisfactoryhost.orchestrator.model.Node;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface NodeRepository extends JpaRepository<Node, Long> {
    
    Optional<Node> findByNodeId(String nodeId);
    
    @Query("SELECT n FROM Node n WHERE n.status = 'ONLINE' AND n.currentServers < n.maxServers ORDER BY " +
           "((n.cpuUsage * 0.4) + (n.memoryUsage * 0.4) + (n.diskUsage * 0.2)) ASC")
    List<Node> findAvailableNodesByLoad();
    
    @Query("SELECT n FROM Node n WHERE n.status = 'ONLINE'")
    List<Node> findOnlineNodes();
    
    List<Node> findByStatus(Node.NodeStatus status);
}
