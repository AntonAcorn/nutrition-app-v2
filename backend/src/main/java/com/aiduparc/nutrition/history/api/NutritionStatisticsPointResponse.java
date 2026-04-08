package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;
import java.time.LocalDate;

public record NutritionStatisticsPointResponse(
    LocalDate entryDate,
    BigDecimal consumedCalories,
    BigDecimal calorieTarget,
    BigDecimal calorieBalance,
    BigDecimal proteinGrams,
    BigDecimal fatGrams,
    BigDecimal fiberGrams
) {
}
