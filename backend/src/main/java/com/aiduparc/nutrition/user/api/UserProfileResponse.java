package com.aiduparc.nutrition.user.api;

import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.service.UserProfileService;
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
    BigDecimal dailyCalorieTargetKcal,
    BigDecimal proteinTargetG,
    BigDecimal fatTargetG,
    BigDecimal carbsTargetG,
    BigDecimal fiberTargetG
) {
    static UserProfileResponse from(UserProfileEntity entity) {
        BigDecimal proteinTarget = entity.getProteinTargetG();
        BigDecimal fatTarget     = entity.getFatTargetG();
        BigDecimal carbsTarget   = entity.getCarbsTargetG();
        BigDecimal fiberTarget   = entity.getFiberTargetG();
        if (proteinTarget == null) {
            UserProfileService.MacroTargets macros = UserProfileService.calculateMacroTargets(
                entity.getDailyCalorieTargetKcal(), entity.getGoal(), entity.getGender()
            );
            proteinTarget = macros.proteinG();
            fatTarget     = macros.fatG();
            carbsTarget   = macros.carbsG();
            fiberTarget   = macros.fiberG();
        }
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
            entity.getDailyCalorieTargetKcal(),
            proteinTarget,
            fatTarget,
            carbsTarget,
            fiberTarget
        );
    }
}
