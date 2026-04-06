package com.aiduparc.nutrition.photoanalysis.draft.dto;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PhotoAnalysisDraftResponse(
        UUID id,
        UUID userId,
        LocalDate entryDate,
        PhotoAnalysisDraftStatus status,
        PhotoAnalysisResponse analysis,
        BigDecimal estimatedCaloriesKcal,
        BigDecimal estimatedProteinG,
        BigDecimal estimatedFiberG,
        UUID confirmedDailyEntryId,
        OffsetDateTime confirmedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

