package com.aiduparc.nutrition.history.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateNutritionTotalsRequest(
    @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal caloriesConsumedKcal,
    @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal proteinGrams,
    @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal fatGrams,
    @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal fiberGrams
) {
}
