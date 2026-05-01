package com.aiduparc.nutrition.library.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record MealTemplateResponse(
        UUID id,
        String name,
        List<MealTemplateItem> items,
        BigDecimal totalCalories,
        BigDecimal totalProtein,
        BigDecimal totalFat,
        BigDecimal totalFiber,
        BigDecimal totalCarbs,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
