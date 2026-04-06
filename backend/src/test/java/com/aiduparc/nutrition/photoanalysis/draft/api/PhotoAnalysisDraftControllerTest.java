package com.aiduparc.nutrition.photoanalysis.draft.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PhotoAnalysisDraftController.class)
class PhotoAnalysisDraftControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoAnalysisDraftService draftService;

    @Test
    void shouldCreateAndFetchDraft() throws Exception {
        UUID draftId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 6);

        PhotoAnalysisDraftResponse response = new PhotoAnalysisDraftResponse(
                draftId,
                userId,
                entryDate,
                PhotoAnalysisDraftStatus.DRAFT,
                sampleAnalysis(),
                new BigDecimal("560"),
                new BigDecimal("30"),
                new BigDecimal("8"),
                null,
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        when(draftService.create(any())).thenReturn(response);
        when(draftService.get(draftId)).thenReturn(response);

        mockMvc.perform(post("/api/photo-analysis/drafts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": "%s",
                                  "entryDate": "2026-04-06",
                                  "analysis": {
                                    "items": [{
                                      "name": "salad",
                                      "portion": "250 g",
                                      "calories": 560,
                                      "protein": 30,
                                      "fiber": 8,
                                      "fat": 22,
                                      "carbs": 50,
                                      "confidence": 0.79
                                    }],
                                    "totals": {
                                      "calories": 560,
                                      "protein": 30,
                                      "fiber": 8,
                                      "fat": 22,
                                      "carbs": 50
                                    },
                                    "confidence": 0.79,
                                    "notes": ["ai suggestion"],
                                    "needsUserConfirmation": true
                                  }
                                }
                                """.formatted(userId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(draftId.toString()))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        mockMvc.perform(get("/api/photo-analysis/drafts/{draftId}", draftId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysis.totals.calories").value(560));

        verify(draftService).create(any());
        verify(draftService).get(draftId);
    }

    private static PhotoAnalysisResponse sampleAnalysis() {
        return new PhotoAnalysisResponse(
                List.of(new AnalyzedFoodItem(
                        "salad",
                        "250 g",
                        new BigDecimal("560"),
                        new BigDecimal("30"),
                        new BigDecimal("8"),
                        new BigDecimal("22"),
                        new BigDecimal("50"),
                        new BigDecimal("0.79")
                )),
                new PhotoAnalysisTotals(
                        new BigDecimal("560"),
                        new BigDecimal("30"),
                        new BigDecimal("8"),
                        new BigDecimal("22"),
                        new BigDecimal("50")
                ),
                new BigDecimal("0.79"),
                List.of("ai suggestion"),
                true
        );
    }
}

