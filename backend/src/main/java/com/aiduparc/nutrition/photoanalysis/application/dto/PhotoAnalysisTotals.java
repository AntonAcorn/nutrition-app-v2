package com.aiduparc.nutrition.photoanalysis.application.dto;

import java.math.BigDecimal;

public record PhotoAnalysisTotals(
        BigDecimal calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat,
        BigDecimal fiber
) {
}
