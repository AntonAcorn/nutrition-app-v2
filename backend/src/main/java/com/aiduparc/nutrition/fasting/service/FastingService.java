package com.aiduparc.nutrition.fasting.service;

import com.aiduparc.nutrition.fasting.api.FastingSessionResponse;
import com.aiduparc.nutrition.fasting.model.FastingSessionEntity;
import com.aiduparc.nutrition.fasting.repository.FastingSessionRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class FastingService {

    private static final Logger log = LoggerFactory.getLogger(FastingService.class);

    private final FastingSessionRepository repository;

    public FastingService(FastingSessionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public FastingSessionResponse startFast(UUID userId, int targetHours) {
        repository.findByNutritionUserIdAndEndedAtIsNull(userId).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fast already in progress");
        });
        var entity = new FastingSessionEntity();
        entity.setNutritionUserId(userId);
        entity.setStartedAt(OffsetDateTime.now(ZoneOffset.UTC));
        entity.setTargetHours(targetHours);
        var saved = repository.save(entity);
        log.info("fast started userId={} targetHours={} sessionId={}", userId, targetHours, saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public FastingSessionResponse stopFast(UUID userId) {
        var entity = repository.findByNutritionUserIdAndEndedAtIsNull(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active fast"));
        entity.setEndedAt(OffsetDateTime.now(ZoneOffset.UTC));
        var saved = repository.save(entity);
        long durationSec = java.time.Duration.between(saved.getStartedAt(), saved.getEndedAt()).getSeconds();
        log.info("fast stopped userId={} sessionId={} durationSec={}", userId, saved.getId(), durationSec);
        return toResponse(saved);
    }

    public Optional<FastingSessionResponse> getActive(UUID userId) {
        return repository.findByNutritionUserIdAndEndedAtIsNull(userId).map(this::toResponse);
    }

    public List<FastingSessionResponse> getHistory(UUID userId) {
        return repository.findTop10ByNutritionUserIdAndEndedAtIsNotNullOrderByEndedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId) {
        var entity = repository.findById(sessionId)
                .filter(e -> e.getNutritionUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        repository.delete(entity);
        log.info("fasting session deleted userId={} sessionId={}", userId, sessionId);
    }

    private FastingSessionResponse toResponse(FastingSessionEntity entity) {
        return new FastingSessionResponse(
                entity.getId(),
                entity.getStartedAt(),
                entity.getEndedAt(),
                entity.getTargetHours(),
                entity.getCreatedAt()
        );
    }
}
