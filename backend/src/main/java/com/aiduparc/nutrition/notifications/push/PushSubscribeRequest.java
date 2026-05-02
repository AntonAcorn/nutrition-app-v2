package com.aiduparc.nutrition.notifications.push;

public record PushSubscribeRequest(
        String endpoint,
        String p256dh,
        String auth,
        String timezone,
        Integer reminderHour
) {}
