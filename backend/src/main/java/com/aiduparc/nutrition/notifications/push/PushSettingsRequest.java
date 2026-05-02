package com.aiduparc.nutrition.notifications.push;

public record PushSettingsRequest(
        boolean enabled,
        int reminderHour
) {}
