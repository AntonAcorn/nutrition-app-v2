package com.aiduparc.nutrition.wellbeing.repository;

import com.aiduparc.nutrition.wellbeing.model.WellbeingWeeklyTrackingEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WellbeingWeeklyTrackingRepository extends JpaRepository<WellbeingWeeklyTrackingEntity, UUID> {

    Optional<WellbeingWeeklyTrackingEntity> findTopByUserIdOrderBySentAtDesc(UUID userId);
}
