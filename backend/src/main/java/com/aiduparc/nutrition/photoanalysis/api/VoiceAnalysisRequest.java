package com.aiduparc.nutrition.photoanalysis.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record VoiceAnalysisRequest(
        @NotBlank @Size(max = 2000) String description,
        @Size(max = 10) String locale,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate entryDate
) {
}
