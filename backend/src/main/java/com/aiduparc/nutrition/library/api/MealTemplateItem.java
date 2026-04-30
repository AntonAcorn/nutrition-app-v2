package com.aiduparc.nutrition.library.api;

import java.math.BigDecimal;

public record MealTemplateItem(
        String name,
        String estimatedPortion,
        BigDecimal calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat,
        BigDecimal fiber
) {}
