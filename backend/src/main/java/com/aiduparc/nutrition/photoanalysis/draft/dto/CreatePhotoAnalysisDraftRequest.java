package com.aiduparc.nutrition.photoanalysis.draft.dto;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CreatePhotoAnalysisDraftRequest(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull @Valid PhotoAnalysisResponse analysis
) {
}

