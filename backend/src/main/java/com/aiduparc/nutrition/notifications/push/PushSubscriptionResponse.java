package com.aiduparc.nutrition.notifications.push;

public record PushSubscriptionResponse(
        boolean subscribed,
        boolean enabled,
        int reminderHour,
        String timezone
) {}
