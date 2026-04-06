package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import org.junit.jupiter.api.Test;

class OpenAiPhotoAnalysisPromptTest {

    @Test
    void shouldMapRequestAndConfigIntoPrompt() {
        var request = new PhotoAnalysisRequest("https://cdn.example.com/meal.jpg", "high protein", "ru");
        var properties = new PhotoAnalysisProperties(
                true,
                "openai-stub",
                new PhotoAnalysisProperties.OpenAi("test-key", "gpt-4o-mini", "https://api.openai.com/v1")
        );

        var prompt = OpenAiPhotoAnalysisPrompt.from(request, properties);

        assertThat(prompt.imageUrl()).isEqualTo(request.imageUrl());
        assertThat(prompt.userNote()).isEqualTo(request.userNote());
        assertThat(prompt.locale()).isEqualTo(request.locale());
        assertThat(prompt.model()).isEqualTo("gpt-4o-mini");
        assertThat(prompt.instructions()).isNotEmpty();
    }
}
