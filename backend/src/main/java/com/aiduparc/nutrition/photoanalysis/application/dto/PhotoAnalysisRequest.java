package com.aiduparc.nutrition.photoanalysis.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhotoAnalysisRequest(
        @NotBlank String imageUrl,
        @Size(max = 500) String userNote,
        @Size(max = 100) String locale
) {
}
