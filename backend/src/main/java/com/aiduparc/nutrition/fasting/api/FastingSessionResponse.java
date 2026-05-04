package com.aiduparc.nutrition.fasting.api;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FastingSessionResponse(
    UUID id,
    OffsetDateTime startedAt,
    OffsetDateTime endedAt,
    int targetHours,
    OffsetDateTime createdAt
) {}
