package com.aiduparc.nutrition.photoanalysis.draft.dto;

import java.math.BigDecimal;

public record ConfirmPhotoAnalysisDraftRequest(
        BigDecimal caloriesKcal,
        BigDecimal proteinG,
        BigDecimal fatG,
        BigDecimal fiberG,
        String notes
) {
}

