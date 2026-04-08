package com.aiduparc.nutrition.photoanalysis.application.dto;

import java.time.LocalDate;
import java.util.UUID;

public record PhotoUploadAnalysisRequest(
        UUID userId,
        LocalDate entryDate,
        String originalFilename,
        String contentType,
        byte[] imageBytes,
        String userNote,
        String locale
) {
}
