package com.aiduparc.nutrition.user.repository;

import com.aiduparc.nutrition.user.model.UserProfileEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfileEntity, UUID> {

    Optional<UserProfileEntity> findByNutritionUserId(UUID nutritionUserId);

    boolean existsByNutritionUserId(UUID nutritionUserId);
}
