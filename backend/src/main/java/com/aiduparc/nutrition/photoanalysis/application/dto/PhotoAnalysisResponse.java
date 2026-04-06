package com.aiduparc.nutrition.photoanalysis.application.dto;

import java.math.BigDecimal;
import java.util.List;

public record PhotoAnalysisResponse(
        List<AnalyzedFoodItem> items,
        PhotoAnalysisTotals totals,
        BigDecimal confidence,
        List<String> notes,
        boolean needsUserConfirmation
) {
}
