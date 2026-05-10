package com.aiduparc.nutrition.security;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nutrition.auth")
public record AuthProperties(
        boolean enabled,
        String googleClientId,
        String googleClientSecret,
        String googleRedirectUri,
        /** Client IDs accepted as `aud` on native Google ID tokens (iOS / Android).
         *  The web OAuth flow uses googleClientId; native apps use a separate ID. */
        List<String> googleNativeClientIds
) {
}
