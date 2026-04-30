package com.aiduparc.nutrition.photoanalysis.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VoiceAnalysisRequest(
        @NotBlank @Size(max = 2000) String description,
        @Size(max = 10) String locale,
        String entryDate
) {
}
