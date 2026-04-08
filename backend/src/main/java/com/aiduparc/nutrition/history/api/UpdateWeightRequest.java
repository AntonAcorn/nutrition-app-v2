package com.aiduparc.nutrition.history.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateWeightRequest(
    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    BigDecimal weightKg
) {
}
