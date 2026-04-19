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
                        "Identify all visible foods and drinks from the image.",
                        "If locale is ru, write food names, notes, and portion wording in Russian.",
                        "Use surrounding objects (fork, hand, plate rim, glass) to calibrate portion size. If no reference is visible, assume a realistic everyday adult serving.",
                        "Write estimated portion explicitly in estimatedPortion, for example '180 г', '1 тарелка', '2 куска'.",
                        "For mixed or composite dishes (soups, stews, pasta, rice dishes, salads), estimate all visible ingredients separately then sum into totals.",
                        "Estimate calories, protein, carbs, fat, and fiber for the visible portion, not for a tiny tasting portion.",
                        "If the portion size is uncertain, prefer a realistic everyday serving instead of an unrealistically small estimate.",
                        "Do not default to very low calories when the image suggests oil, sauce, frying, cheese, nuts, or dense carbs.",
                        "Include hidden fats when they are visually likely, such as cooking oil, dressing, mayo, butter, cheese, or creamy sauce.",
                        "If userNote mentions portion size, preparation method, or extra ingredients — prioritize that information over the visual estimate.",
                        "Return JSON only, matching the schema with items, totals, confidence, notes, needsUserConfirmation.",
                        "Each item must contain name, estimatedPortion, calories, protein, carbs, fat, fiber, confidence.",
                        "Mark whether user confirmation is still required."
                )
        );
    }
}
