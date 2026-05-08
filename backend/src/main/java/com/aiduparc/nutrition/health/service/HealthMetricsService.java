package com.aiduparc.nutrition.health.service;

import com.aiduparc.nutrition.health.api.HealthMetricsSyncRequest;
import com.aiduparc.nutrition.health.model.HealthMetricsEntity;
import com.aiduparc.nutrition.health.repository.HealthMetricsRepository;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class HealthMetricsService {

    private static final Logger log = LoggerFactory.getLogger(HealthMetricsService.class);

    private final HealthMetricsRepository repository;

    public HealthMetricsService(HealthMetricsRepository repository) {
        this.repository = repository;
    }

    /**
     * Idempotent batch upsert. Each (user, date) row is updated to the most
     * recent values; missing fields are not overwritten with null so a
     * partial sync (e.g. only steps) doesn't wipe sleep data from an
     * earlier sync that included it.
     */
    @Transactional
    public int sync(UUID userId, HealthMetricsSyncRequest request) {
        if (request.days() == null || request.days().isEmpty()) return 0;

        // Bulk-load existing rows for the date range to avoid N queries.
        LocalDate min = request.days().get(0).date();
        LocalDate max = min;
        for (var d : request.days()) {
            if (d.date().isBefore(min)) min = d.date();
            if (d.date().isAfter(max))  max = d.date();
        }
        Map<LocalDate, HealthMetricsEntity> existing = new HashMap<>();
        for (HealthMetricsEntity e :
                repository.findByUserIdAndMetricDateBetweenOrderByMetricDateAsc(userId, min, max)) {
            existing.put(e.getMetricDate(), e);
        }

        int written = 0;
        for (var d : request.days()) {
            HealthMetricsEntity e = existing.computeIfAbsent(d.date(), date -> {
                HealthMetricsEntity created = new HealthMetricsEntity();
                created.setUserId(userId);
                created.setMetricDate(date);
                return created;
            });
            // Only overwrite when the incoming value is non-null.
            if (d.steps() != null)           e.setSteps(d.steps());
            if (d.activeKcal() != null)      e.setActiveKcal(d.activeKcal());
            if (d.sleepMinutes() != null)    e.setSleepMinutes(d.sleepMinutes());
            if (d.workoutMinutes() != null)  e.setWorkoutMinutes(d.workoutMinutes());
            if (d.workoutCount() != null)    e.setWorkoutCount(d.workoutCount());
            repository.save(e);
            written++;
        }
        log.debug("health-metrics sync userId={} days={}", userId, written);
        return written;
    }

    public List<HealthMetricsEntity> findRange(UUID userId, LocalDate from, LocalDate to) {
        return repository.findByUserIdAndMetricDateBetweenOrderByMetricDateAsc(userId, from, to);
    }
}
