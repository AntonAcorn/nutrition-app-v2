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
    BigDecimal targetWeightKg,
    @NotBlank String activityLevel,
    @NotBlank String goal,
    String weightLossStrategy,
    BigDecimal proteinTargetG,
    BigDecimal fatTargetG,
    BigDecimal carbsTargetG,
    BigDecimal fiberTargetG,
    Integer waterGoalGlasses,
    @Min(0) @Max(2000) Integer dailyBankCapKcal,
    @Min(0) @Max(10000) Integer bankMaxKcal,
    @Min(0) @Max(31) Integer relaxDaysPerMonth,
    /** Comma-separated list: energy, mood, weight, performance. Empty = all. */
    String coachFocus
) {}
