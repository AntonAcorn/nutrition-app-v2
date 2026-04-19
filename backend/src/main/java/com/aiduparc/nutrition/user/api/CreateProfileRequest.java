package com.aiduparc.nutrition.user.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateProfileRequest(
    @NotNull @Min(10) @Max(120) Integer ageYears,
    @NotBlank String gender,
    @NotNull BigDecimal heightCm,
    @NotNull BigDecimal startingWeightKg,
    @NotBlank String activityLevel,
    @NotBlank String goal
) {}
