package com.aiduparc.nutrition.history.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateWaterRequest(
    // Max must match the ceiling allowed in ProfileTab's waterGoalGlasses
    // input (currently 20). If you tighten it here, also lower the UI cap.
    @Min(0) @Max(20) int glasses
) {}
