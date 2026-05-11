package com.aiduparc.nutrition.notifications.push;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record PushSubscribeRequest(
        // Web Push fields (null for APNs)
        @Size(max = 1024) String endpoint,
        @Size(max = 256) String p256dh,
        @Size(max = 256) String auth,
        // APNs field (null for web push)
        @Size(max = 256) String deviceToken,
        // Common
        @Size(max = 32) String platform,
        @Size(max = 64) String timezone,
        @Min(0) @Max(23) Integer reminderHour
) {}
