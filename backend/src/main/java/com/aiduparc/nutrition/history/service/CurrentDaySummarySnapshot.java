package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CurrentDaySummarySnapshot(
    LocalDate entryDate,
    BigDecimal consumedCalories,
    BigDecimal dailyTargetCalories,
    BigDecimal remainingCalories,
    BigDecimal proteinGrams,
    BigDecimal fiberGrams
) {

    public static CurrentDaySummarySnapshot fromEntry(DailyNutritionEntrySnapshot entry) {
        BigDecimal consumed = safe(entry.caloriesConsumedKcal());
        BigDecimal target = safe(entry.calorieTargetKcal());

        return new CurrentDaySummarySnapshot(
            entry.entryDate(),
            consumed,
            target,
            target.subtract(consumed).max(BigDecimal.ZERO),
            safe(entry.proteinGrams()),
            safe(entry.fiberGrams())
        );
    }

    private static BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
