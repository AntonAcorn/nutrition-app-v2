package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TodaySummaryResponse(
        UUID userId,
        LocalDate entryDate,
        BigDecimal weightKg,
        BigDecimal consumedCalories,
        BigDecimal dailyTargetCalories,
        BigDecimal remainingCalories,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams
) {
}
