package com.aiduparc.nutrition.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nutrition.auth")
public record AuthProperties(
        boolean enabled,
        String googleClientId,
        String googleClientSecret,
        String googleRedirectUri
) {
}
