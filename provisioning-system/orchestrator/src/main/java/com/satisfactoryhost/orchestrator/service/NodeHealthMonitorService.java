package com.satisfactoryhost.orchestrator.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class NodeHealthMonitorService {
    
    @Autowired
    private NodeSchedulerService nodeSchedulerService;
    
    @Value("${app.health-check.health-check-interval:120000}")
    private long healthCheckInterval;
    
    @Value("${app.health-check.timeout-minutes:3}")
    private double timeoutMinutes;  // Changed to double to support fractional minutes
    
    /**
     * Check node health at configurable intervals
     * Default: every 2 minutes (120000ms)
     * Timeout: configurable minutes (default 3, can be fractional like 0.5 for 30 seconds)
     * For dev: set HEALTH_CHECK_INTERVAL=10000 (10 seconds), TIMEOUT_MINUTES=0.5 (30 seconds)
     */
    @Scheduled(fixedRateString = "${app.health-check.health-check-interval:120000}")
    public void monitorNodeHealth() {
        try {
            nodeSchedulerService.checkNodeHealth(timeoutMinutes);
        } catch (Exception e) {
            System.err.println("Error during node health check: " + e.getMessage());
        }
    }
}
