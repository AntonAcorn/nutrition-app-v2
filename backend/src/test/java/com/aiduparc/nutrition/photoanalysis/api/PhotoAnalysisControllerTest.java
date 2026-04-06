package com.aiduparc.nutrition.photoanalysis.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.photoanalysis.application.PhotoAnalysisService;
import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PhotoAnalysisController.class)
class PhotoAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoAnalysisService photoAnalysisService;

    @Test
    void shouldReturnStructuredPhotoAnalysisResponse() throws Exception {
        when(photoAnalysisService.analyze(any())).thenReturn(new PhotoAnalysisResponse(
                List.of(new AnalyzedFoodItem(
                        "Chicken breast",
                        "150 g",
                        new BigDecimal("248"),
                        new BigDecimal("46"),
                        new BigDecimal("0"),
                        new BigDecimal("5"),
                        new BigDecimal("0"),
                        new BigDecimal("0.81")
                )),
                new PhotoAnalysisTotals(
                        new BigDecimal("248"),
                        new BigDecimal("46"),
                        new BigDecimal("0"),
                        new BigDecimal("5"),
                        new BigDecimal("0")
                ),
                new BigDecimal("0.81"),
                List.of("stub analysis"),
                true
        ));

        mockMvc.perform(post("/api/photo-analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "imageUrl": "https://cdn.example.com/meal.jpg",
                                  "userNote": "Lunch",
                                  "locale": "en"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Chicken breast"))
                .andExpect(jsonPath("$.totals.calories").value(248))
                .andExpect(jsonPath("$.confidence").value(0.81))
                .andExpect(jsonPath("$.notes[0]").value("stub analysis"))
                .andExpect(jsonPath("$.needsUserConfirmation").value(true));

        verify(photoAnalysisService).analyze(any());
    }

    @Test
    void shouldRejectBlankImageUrl() throws Exception {
        mockMvc.perform(post("/api/photo-analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "imageUrl": "",
                                  "userNote": "Lunch",
                                  "locale": "en"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }
}
