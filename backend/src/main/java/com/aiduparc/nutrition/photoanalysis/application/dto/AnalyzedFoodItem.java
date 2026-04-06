package com.aiduparc.nutrition.photoanalysis.application.dto;

import java.math.BigDecimal;

public record AnalyzedFoodItem(
        String name,
        String estimatedPortion,
        BigDecimal calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat,
        BigDecimal fiber,
        BigDecimal confidence
) {
}
