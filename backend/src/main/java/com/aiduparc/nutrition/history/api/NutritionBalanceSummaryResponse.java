package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;

public record NutritionBalanceSummaryResponse(
    BigDecimal consumedCalories,
    BigDecimal targetCalories,
    BigDecimal calorieBalance
) {
}
