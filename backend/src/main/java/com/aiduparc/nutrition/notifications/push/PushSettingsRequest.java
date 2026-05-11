package com.aiduparc.nutrition.notifications.push;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record PushSettingsRequest(
        boolean enabled,
        @Min(0) @Max(23) int reminderHour
) {}
