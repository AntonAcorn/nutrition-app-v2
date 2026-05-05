package com.aiduparc.nutrition.notifications.push;

public record PushSubscribeRequest(
        // Web Push fields (null for APNs)
        String endpoint,
        String p256dh,
        String auth,
        // APNs field (null for web push)
        String deviceToken,
        // Common
        String platform,
        String timezone,
        Integer reminderHour
) {}
