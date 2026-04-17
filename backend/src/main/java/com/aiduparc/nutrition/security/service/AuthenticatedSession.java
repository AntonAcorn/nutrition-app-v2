package com.aiduparc.nutrition.security.service;

import java.io.Serializable;
import java.util.UUID;

public record AuthenticatedSession(
        UUID accountId,
        String email,
        String displayName,
        UUID nutritionUserId
) implements Serializable {
}
