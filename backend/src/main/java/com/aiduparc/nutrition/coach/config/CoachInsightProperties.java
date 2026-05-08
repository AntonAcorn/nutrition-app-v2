package com.aiduparc.nutrition.coach.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "nutrition.coach")
public record CoachInsightProperties(
    boolean enabled,
    @NotBlank String provider,
    int validityHours,
    int minLoggedDays,
    OpenAi openai
) {
    public record OpenAi(
        String apiKey,
        @NotBlank String model,
        String baseUrl,
        int timeoutMs
    ) {}
}
