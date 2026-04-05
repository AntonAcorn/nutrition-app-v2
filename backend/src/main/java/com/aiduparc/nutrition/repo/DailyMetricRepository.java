package com.aiduparc.nutrition.repo;

import com.aiduparc.nutrition.domain.DailyMetric;
import com.aiduparc.nutrition.domain.User;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyMetricRepository extends JpaRepository<DailyMetric, UUID> {
    Optional<DailyMetric> findByUserAndMetricDate(User user, LocalDate metricDate);
    List<DailyMetric> findByUserAndMetricDateBetweenOrderByMetricDateAsc(User user, LocalDate from, LocalDate to);
    List<DailyMetric> findTop120ByUserOrderByMetricDateDesc(User user);
}
