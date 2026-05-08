package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.api.WeeklyRecapResponse;
import com.aiduparc.nutrition.coach.api.WeeklyRecapResponse.Section;
import com.aiduparc.nutrition.coach.config.CoachInsightProperties;
import com.aiduparc.nutrition.coach.infrastructure.CoachInsightProvider;
import com.aiduparc.nutrition.coach.infrastructure.CoachInsightProvider.PastInsight;
import com.aiduparc.nutrition.coach.infrastructure.CoachInsightProvider.WeeklyRecapDraft;
import com.aiduparc.nutrition.coach.model.CoachWeeklyRecapEntity;
import com.aiduparc.nutrition.coach.repository.CoachWeeklyRecapRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WeeklyRecapService {

    private static final Logger log = LoggerFactory.getLogger(WeeklyRecapService.class);
    private static final int RECAP_WINDOW_DAYS = 7;

    private final CoachSnapshotService snapshotService;
    private final CoachInsightProvider provider;
    private final CoachWeeklyRecapRepository repository;
    private final CoachInsightProperties properties;
    private final ObjectMapper objectMapper;
    private final CoachInsightService insightService;

    public WeeklyRecapService(
        CoachSnapshotService snapshotService,
        CoachInsightProvider provider,
        CoachWeeklyRecapRepository repository,
        CoachInsightProperties properties,
        ObjectMapper objectMapper,
        CoachInsightService insightService
    ) {
        this.snapshotService = snapshotService;
        this.provider = provider;
        this.repository = repository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.insightService = insightService;
    }

    /**
     * Returns the latest non-dismissed recap for the user, regardless of week.
     * The frontend shows it until the user dismisses or a new one lands.
     */
    public Optional<WeeklyRecapResponse> getLatest(UUID userId) {
        return repository.findTopByUserIdAndDismissedAtIsNullOrderByWeekStartDesc(userId)
            .map(this::toResponse);
    }

    @Transactional
    public WeeklyRecapResponse generateForCurrentWeek(UUID userId, LocalDate today, ZoneId zone, String locale) {
        if (!properties.enabled()) {
            return null;
        }
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        // Idempotent: if a recap for this week already exists, return it.
        Optional<CoachWeeklyRecapEntity> existing = repository.findByUserIdAndWeekStart(userId, weekStart);
        if (existing.isPresent() && existing.get().getDismissedAt() == null) {
            return toResponse(existing.get());
        }

        CoachSnapshotResponse snapshot = snapshotService.buildSnapshot(userId, today, RECAP_WINDOW_DAYS, zone);
        if (snapshot.totals().loggedDays() < properties.minLoggedDays()) {
            return null;
        }

        java.util.List<PastInsight> history = insightService.loadHistory(userId,
            java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC));

        WeeklyRecapDraft draft;
        try {
            draft = provider.generateWeeklyRecap(snapshot, history, locale);
        } catch (RuntimeException ex) {
            log.warn("Weekly recap provider failed userId={} ({}): skipping",
                userId, ex.getClass().getSimpleName(), ex);
            return null;
        }
        if (draft == null) return null;

        String json;
        try {
            json = objectMapper.writeValueAsString(draft);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize weekly recap draft", e);
            return null;
        }

        CoachWeeklyRecapEntity entity = existing.orElseGet(CoachWeeklyRecapEntity::new);
        entity.setUserId(userId);
        entity.setWeekStart(weekStart);
        entity.setContentJson(json);
        entity.setSource(provider.sourceTag());
        entity.setGeneratedAt(OffsetDateTime.now(ZoneOffset.UTC));
        entity.setDismissedAt(null);

        return toResponse(repository.save(entity));
    }

    @Transactional
    public void dismiss(UUID userId, UUID recapId) {
        repository.findById(recapId)
            .filter(r -> r.getUserId().equals(userId))
            .ifPresent(r -> {
                if (r.getDismissedAt() != null) return;
                r.setDismissedAt(OffsetDateTime.now(ZoneOffset.UTC));
                repository.save(r);
            });
    }

    private WeeklyRecapResponse toResponse(CoachWeeklyRecapEntity e) {
        try {
            WeeklyRecapDraft draft = objectMapper.readValue(e.getContentJson(), WeeklyRecapDraft.class);
            return new WeeklyRecapResponse(
                e.getId(),
                e.getWeekStart(),
                e.getGeneratedAt(),
                e.getSource(),
                toSection(draft.highlight()),
                toSection(draft.trend()),
                toSection(draft.challenge()),
                toSection(draft.nextWeekGoal()),
                draft.shareLine()
            );
        } catch (JsonProcessingException ex) {
            log.warn("Failed to parse stored weekly recap id={}", e.getId(), ex);
            return null;
        }
    }

    private static Section toSection(WeeklyRecapDraft.Section s) {
        if (s == null) return null;
        return new Section(s.title(), s.body());
    }
}
