package com.aiduparc.nutrition.photoanalysis.draft.dto;

import java.math.BigDecimal;

public record ConfirmPhotoAnalysisDraftRequest(
        BigDecimal caloriesKcal,
        BigDecimal proteinG,
        BigDecimal fatG,
        BigDecimal fiberG,
        BigDecimal carbsG,
        String notes,
        String mealName,
        String slotType
) {
}
