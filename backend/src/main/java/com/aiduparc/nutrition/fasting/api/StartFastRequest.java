package com.aiduparc.nutrition.fasting.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record StartFastRequest(@Min(1) @Max(72) int targetHours) {}
