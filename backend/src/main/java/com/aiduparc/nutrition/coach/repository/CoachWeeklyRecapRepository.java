package com.aiduparc.nutrition.coach.repository;

import com.aiduparc.nutrition.coach.model.CoachWeeklyRecapEntity;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoachWeeklyRecapRepository extends JpaRepository<CoachWeeklyRecapEntity, UUID> {

    Optional<CoachWeeklyRecapEntity> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);

    Optional<CoachWeeklyRecapEntity> findTopByUserIdAndDismissedAtIsNullOrderByWeekStartDesc(UUID userId);
}
