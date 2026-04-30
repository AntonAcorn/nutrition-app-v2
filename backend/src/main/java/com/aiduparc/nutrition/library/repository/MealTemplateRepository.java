package com.aiduparc.nutrition.library.repository;

import com.aiduparc.nutrition.library.model.MealTemplateEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealTemplateRepository extends JpaRepository<MealTemplateEntity, UUID> {

    List<MealTemplateEntity> findByNutritionUserIdOrderByCreatedAtDesc(UUID nutritionUserId);

    Optional<MealTemplateEntity> findByIdAndNutritionUserId(UUID id, UUID nutritionUserId);
}
