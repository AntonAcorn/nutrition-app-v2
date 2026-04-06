package com.aiduparc.nutrition.photoanalysis.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import com.aiduparc.nutrition.photoanalysis.infrastructure.openai.OpenAiPhotoAnalysisPrompt;
import com.aiduparc.nutrition.photoanalysis.infrastructure.openai.OpenAiPhotoAnalysisProvider;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class DefaultPhotoAnalysisServiceTest {

    @Test
    void shouldBuildPromptFromRequestAndDelegateToProvider() {
        var properties = new PhotoAnalysisProperties(
                true,
                "openai-stub",
                new PhotoAnalysisProperties.OpenAi("", "gpt-4.1-mini", "https://api.openai.com/v1")
        );

        CapturingProvider provider = new CapturingProvider();
        var service = new DefaultPhotoAnalysisService(provider, properties);
        var request = new PhotoAnalysisRequest("https://cdn.example.com/meal.jpg", "post workout lunch", "en");

        PhotoAnalysisResponse response = service.analyze(request);

        assertThat(provider.prompt).isNotNull();
        assertThat(provider.prompt.imageUrl()).isEqualTo(request.imageUrl());
        assertThat(provider.prompt.userNote()).isEqualTo(request.userNote());
        assertThat(provider.prompt.locale()).isEqualTo(request.locale());
        assertThat(provider.prompt.model()).isEqualTo("gpt-4.1-mini");
        assertThat(response.notes()).containsExactly("ok");
    }

    private static class CapturingProvider implements OpenAiPhotoAnalysisProvider {
        private OpenAiPhotoAnalysisPrompt prompt;

        @Override
        public PhotoAnalysisResponse analyze(OpenAiPhotoAnalysisPrompt prompt) {
            this.prompt = prompt;
            return new PhotoAnalysisResponse(
                    List.of(),
                    new PhotoAnalysisTotals(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
                    BigDecimal.ONE,
                    List.of("ok"),
                    false
            );
        }
    }
}
