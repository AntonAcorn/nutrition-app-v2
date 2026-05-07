package com.aiduparc.nutrition.wellbeing.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record WellbeingRateRequest(
    @NotNull @Min(1) @Max(5) Integer rating
) {}
