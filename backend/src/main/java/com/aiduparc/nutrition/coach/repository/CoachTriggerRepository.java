package com.aiduparc.nutrition.coach.repository;

import com.aiduparc.nutrition.coach.model.CoachTriggerEntity;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoachTriggerRepository extends JpaRepository<CoachTriggerEntity, UUID> {

    boolean existsByUserIdAndKindAndFiredAtAfter(UUID userId, String kind, OffsetDateTime cutoff);
}
