package com.aiduparc.nutrition.fasting.repository;

import com.aiduparc.nutrition.fasting.model.FastingSessionEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FastingSessionRepository extends JpaRepository<FastingSessionEntity, UUID> {

    Optional<FastingSessionEntity> findByNutritionUserIdAndEndedAtIsNull(UUID nutritionUserId);

    List<FastingSessionEntity> findTop10ByNutritionUserIdAndEndedAtIsNotNullOrderByEndedAtDesc(UUID nutritionUserId);
}
