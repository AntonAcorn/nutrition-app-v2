package com.aiduparc.nutrition.photoanalysis.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "nutrition.photo-analysis")
public record PhotoAnalysisProperties(
        boolean enabled,
        @NotBlank String provider,
        OpenAi openai
) {
    public record OpenAi(
            String apiKey,
            @NotBlank String model,
            String baseUrl
    ) {
    }
}
