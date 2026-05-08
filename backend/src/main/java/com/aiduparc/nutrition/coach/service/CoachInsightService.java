package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.CoachInsightResponse;
import com.aiduparc.nutrition.coach.api.CoachInsightResponse.Card;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.config.CoachInsightProperties;
import com.aiduparc.nutrition.coach.infrastructure.CoachInsightProvider;
import com.aiduparc.nutrition.coach.infrastructure.CoachInsightProvider.InsightDraft;
import com.aiduparc.nutrition.coach.model.UserInsightEntity;
import com.aiduparc.nutrition.coach.repository.UserInsightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
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
public class CoachInsightService {

    private static final Logger log = LoggerFactory.getLogger(CoachInsightService.class);
    private static final int DEFAULT_VALIDITY_HOURS = 24 * 3;
    private static final int DEFAULT_MIN_LOGGED_DAYS = 3;

    private final CoachSnapshotService snapshotService;
    private final CoachInsightProvider provider;
    private final UserInsightRepository repository;
    private final CoachInsightProperties properties;

    public CoachInsightService(
        CoachSnapshotService snapshotService,
        CoachInsightProvider provider,
        UserInsightRepository repository,
        CoachInsightProperties properties
    ) {
        this.snapshotService = snapshotService;
        this.provider = provider;
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional
    public CoachInsightResponse getOrGenerate(UUID userId, LocalDate today, int days, ZoneId zone) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<UserInsightEntity> fresh = repository
            .findByUserIdAndValidUntilAfterOrderByGeneratedAtDesc(userId, now);
        if (!fresh.isEmpty()) {
            return toResponse(fresh);
        }
        return generateAndStore(userId, today, days, zone, now);
    }

    @Transactional
    public CoachInsightResponse refresh(UUID userId, LocalDate today, int days, ZoneId zone) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return generateAndStore(userId, today, days, zone, now);
    }

    private CoachInsightResponse generateAndStore(UUID userId, LocalDate today, int days, ZoneId zone, OffsetDateTime now) {
        if (!properties.enabled()) {
            return emptyResponse(now, days);
        }

        CoachSnapshotResponse snapshot = snapshotService.buildSnapshot(userId, today, days, zone);
        if (snapshot.totals().loggedDays() < minLoggedDays()) {
            return emptyResponse(now, days);
        }

        List<InsightDraft> drafts;
        try {
            drafts = provider.generate(snapshot);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.warn("Coach insight provider failed userId={}", userId, ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Coach provider failed", ex);
        }

        if (drafts.isEmpty()) {
            return emptyResponse(now, days);
        }

        OffsetDateTime validUntil = now.plusHours(validityHours());
        List<UserInsightEntity> saved = new ArrayList<>();
        for (InsightDraft d : drafts) {
            UserInsightEntity e = new UserInsightEntity();
            e.setUserId(userId);
            e.setGeneratedAt(now);
            e.setValidUntil(validUntil);
            e.setSnapshotWindowDays(days);
            e.setKind(d.kind());
            e.setTitle(d.title());
            e.setBody(d.body());
            e.setAnchor(d.anchor());
            e.setSource(provider.sourceTag());
            saved.add(repository.save(e));
        }
        return toResponse(saved);
    }

    private CoachInsightResponse toResponse(List<UserInsightEntity> rows) {
        UserInsightEntity newest = rows.stream()
            .max(Comparator.comparing(UserInsightEntity::getGeneratedAt))
            .orElseThrow();
        // Group only the cards from the newest generation cycle (same generated_at).
        OffsetDateTime cutoff = newest.getGeneratedAt();
        List<Card> cards = rows.stream()
            .filter(r -> r.getGeneratedAt().equals(cutoff))
            .map(r -> new Card(r.getId(), r.getKind(), r.getTitle(), r.getBody(), r.getAnchor()))
            .toList();
        return new CoachInsightResponse(
            newest.getGeneratedAt(),
            newest.getValidUntil(),
            newest.getSnapshotWindowDays(),
            newest.getSource(),
            cards
        );
    }

    private CoachInsightResponse emptyResponse(OffsetDateTime now, int days) {
        return new CoachInsightResponse(now, now, days, provider.sourceTag(), List.of());
    }

    private int validityHours() {
        int v = properties.validityHours();
        return v > 0 ? v : DEFAULT_VALIDITY_HOURS;
    }

    private int minLoggedDays() {
        int v = properties.minLoggedDays();
        return v > 0 ? v : DEFAULT_MIN_LOGGED_DAYS;
    }

    @SuppressWarnings("unused")
    private Optional<Integer> noop() { return Optional.empty(); }
}
