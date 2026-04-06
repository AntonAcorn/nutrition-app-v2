package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class StubOpenAiPhotoAnalysisProvider implements OpenAiPhotoAnalysisProvider {

    private final PhotoAnalysisProperties properties;

    public StubOpenAiPhotoAnalysisProvider(PhotoAnalysisProperties properties) {
        this.properties = properties;
    }

    @Override
    public PhotoAnalysisResponse analyze(OpenAiPhotoAnalysisPrompt prompt) {
        var items = List.of(
                new AnalyzedFoodItem(
                        "Chicken breast",
                        "150 g",
                        new BigDecimal("248"),
                        new BigDecimal("46"),
                        new BigDecimal("0"),
                        new BigDecimal("5"),
                        new BigDecimal("0"),
                        new BigDecimal("0.81")
                ),
                new AnalyzedFoodItem(
                        "White rice",
                        "180 g",
                        new BigDecimal("234"),
                        new BigDecimal("4"),
                        new BigDecimal("52"),
                        new BigDecimal("0.4"),
                        new BigDecimal("0.6"),
                        new BigDecimal("0.76")
                ),
                new AnalyzedFoodItem(
                        "Cucumber salad",
                        "80 g",
                        new BigDecimal("18"),
                        new BigDecimal("0.8"),
                        new BigDecimal("3.5"),
                        new BigDecimal("0.2"),
                        new BigDecimal("0.7"),
                        new BigDecimal("0.63")
                )
        );

        var totals = new PhotoAnalysisTotals(
                new BigDecimal("500"),
                new BigDecimal("50.8"),
                new BigDecimal("55.5"),
                new BigDecimal("5.6"),
                new BigDecimal("1.3")
        );

        return new PhotoAnalysisResponse(
                items,
                totals,
                new BigDecimal("0.74"),
                List.of(
                        "Stub response from provider '" + properties.provider() + "'.",
                        "Replace StubOpenAiPhotoAnalysisProvider with a real OpenAI API client once OPENAI_API_KEY is available.",
                        "User confirmation remains required before creating a meal entry."
                ),
                true
        );
    }
}
