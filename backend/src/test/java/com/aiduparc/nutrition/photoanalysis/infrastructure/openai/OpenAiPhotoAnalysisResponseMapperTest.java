package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class OpenAiPhotoAnalysisResponseMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldMapModelJsonToDtoShape() throws Exception {
        String json = """
                {
                  "items": [
                    {
                      "name": "Salmon",
                      "estimatedPortion": "120 g",
                      "calories": 240,
                      "protein": 25,
                      "carbs": 0,
                      "fat": 15,
                      "fiber": 0,
                      "confidence": 0.86
                    }
                  ],
                  "totals": {
                    "calories": 240,
                    "protein": 25,
                    "carbs": 0,
                    "fat": 15,
                    "fiber": 0
                  },
                  "confidence": 0.86,
                  "notes": ["looks like grilled salmon"],
                  "needsUserConfirmation": true
                }
                """;

        var response = OpenAiPhotoAnalysisResponseMapper.fromModelJson(json, objectMapper);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).name()).isEqualTo("Salmon");
        assertThat(response.totals().calories()).isEqualByComparingTo(new BigDecimal("240"));
        assertThat(response.confidence()).isEqualByComparingTo(new BigDecimal("0.86"));
        assertThat(response.notes()).containsExactly("looks like grilled salmon");
        assertThat(response.needsUserConfirmation()).isTrue();
    }

    @Test
    void shouldStripCodeFencesAndRecomputeMissingTotals() throws Exception {
        String json = """
                ```json
                {
                  "items": [
                    {
                      "name": "Greek yogurt",
                      "estimatedPortion": "170 g",
                      "calories": 100,
                      "protein": 17,
                      "carbs": 6,
                      "fat": 0,
                      "fiber": 0,
                      "confidence": 1.4
                    }
                  ],
                  "confidence": -1,
                  "notes": [],
                  "needsUserConfirmation": true
                }
                ```
                """;

        var response = OpenAiPhotoAnalysisResponseMapper.fromModelJson(json, objectMapper);

        assertThat(response.totals().calories()).isEqualByComparingTo(new BigDecimal("100"));
        assertThat(response.confidence()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.items().get(0).confidence()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(response.notes()).containsExactly("Estimated from image; verify portions before saving meal.");
    }
}
