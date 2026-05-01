package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MealLogEntryResponse(
    UUID id,
    String name,
    BigDecimal caloriesKcal,
    BigDecimal proteinG,
    BigDecimal fatG,
    BigDecimal carbsG,
    BigDecimal fiberG,
    String source,
    OffsetDateTime createdAt
) {}
