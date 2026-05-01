package com.aiduparc.nutrition.history.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateWaterRequest(
    @Min(0) @Max(10) int glasses
) {}
