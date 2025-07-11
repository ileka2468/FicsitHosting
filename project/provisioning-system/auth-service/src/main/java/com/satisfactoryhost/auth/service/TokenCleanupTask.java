package com.satisfactoryhost.auth.service;

import com.satisfactoryhost.auth.repository.InvalidTokenRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class TokenCleanupTask {
    private final InvalidTokenRepository repository;

    public TokenCleanupTask(InvalidTokenRepository repository) {
        this.repository = repository;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredTokens() {
        repository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
