package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;

public interface OpenAiPhotoAnalysisProvider {
    PhotoAnalysisResponse analyze(OpenAiPhotoAnalysisPrompt prompt);
}
