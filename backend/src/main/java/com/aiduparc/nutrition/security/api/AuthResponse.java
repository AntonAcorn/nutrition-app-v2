package com.aiduparc.nutrition.security.api;

import java.util.UUID;

public record AuthResponse(
        UUID accountId,
        String email,
        String displayName,
        UUID nutritionUserId,
        boolean authenticated
) {
}
