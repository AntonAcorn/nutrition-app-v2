package com.aiduparc.nutrition.notifications;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nutrition.telegram")
public record TelegramProperties(boolean enabled, String botToken, String chatId) {}
