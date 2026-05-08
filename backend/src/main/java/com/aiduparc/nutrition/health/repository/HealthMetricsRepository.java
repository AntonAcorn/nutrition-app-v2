package com.aiduparc.nutrition.health.repository;

import com.aiduparc.nutrition.health.model.HealthMetricsEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HealthMetricsRepository extends JpaRepository<HealthMetricsEntity, UUID> {

    Optional<HealthMetricsEntity> findByUserIdAndMetricDate(UUID userId, LocalDate metricDate);

    List<HealthMetricsEntity> findByUserIdAndMetricDateBetweenOrderByMetricDateAsc(
        UUID userId, LocalDate fromInclusive, LocalDate toInclusive);
}
