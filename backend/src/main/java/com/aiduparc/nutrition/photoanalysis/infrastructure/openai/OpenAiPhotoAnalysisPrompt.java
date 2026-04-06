package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import java.util.List;

public record OpenAiPhotoAnalysisPrompt(
        String imageUrl,
        String userNote,
        String locale,
        String model,
        List<String> instructions
) {
    public static OpenAiPhotoAnalysisPrompt from(PhotoAnalysisRequest request, PhotoAnalysisProperties properties) {
        return new OpenAiPhotoAnalysisPrompt(
                request.imageUrl(),
                request.userNote(),
                request.locale(),
                properties.openai().model(),
                List.of(
                        "Identify likely foods from the image.",
                        "Estimate portion sizes.",
                        "Return JSON only, matching the schema with items, totals, confidence, notes, needsUserConfirmation.",
                        "Each item must contain name, estimatedPortion, calories, protein, carbs, fat, fiber, confidence.",
                        "Mark whether user confirmation is still required."
                )
        );
    }
}
