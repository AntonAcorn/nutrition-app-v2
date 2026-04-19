package com.aiduparc.nutrition.user.api;

import com.aiduparc.nutrition.user.model.UserProfileEntity;
import java.math.BigDecimal;
import java.util.UUID;

public record UserProfileResponse(
    UUID id,
    UUID nutritionUserId,
    int ageYears,
    String gender,
    BigDecimal heightCm,
    BigDecimal startingWeightKg,
    String activityLevel,
    String goal,
    String weightLossStrategy,
    BigDecimal dailyCalorieTargetKcal
) {
    static UserProfileResponse from(UserProfileEntity entity) {
        return new UserProfileResponse(
            entity.getId(),
            entity.getNutritionUserId(),
            entity.getAgeYears(),
            entity.getGender(),
            entity.getHeightCm(),
            entity.getStartingWeightKg(),
            entity.getActivityLevel(),
            entity.getGoal(),
            entity.getWeightLossStrategy(),
            entity.getDailyCalorieTargetKcal()
        );
    }
}
