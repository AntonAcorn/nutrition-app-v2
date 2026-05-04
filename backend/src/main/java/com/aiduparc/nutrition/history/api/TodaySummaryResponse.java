package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TodaySummaryResponse(
        UUID userId,
        LocalDate entryDate,
        BigDecimal weightKg,
        OffsetDateTime weightUpdatedAt,
        BigDecimal consumedCalories,
        BigDecimal dailyTargetCalories,
        BigDecimal remainingCalories,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams,
        BigDecimal carbsGrams,
        BigDecimal proteinTargetGrams,
        BigDecimal fatTargetGrams,
        BigDecimal carbsTargetGrams,
        BigDecimal fiberTargetGrams,
        int waterGlasses,
        int waterGoalGlasses,
        BigDecimal targetWeightKg,
        BigDecimal startingWeightKg,
        int loggingStreakDays
) {
}
