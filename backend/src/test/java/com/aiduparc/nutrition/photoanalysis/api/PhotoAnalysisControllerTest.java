package com.aiduparc.nutrition.photoanalysis.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.photoanalysis.application.PhotoAnalysisService;
import com.aiduparc.nutrition.security.SecurityConfig;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import com.aiduparc.nutrition.photoanalysis.application.PhotoUploadAnalysisService;
import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PhotoAnalysisController.class)
@Import(SecurityConfig.class)
class PhotoAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PhotoAnalysisService photoAnalysisService;

    @MockBean
    private PhotoUploadAnalysisService photoUploadAnalysisService;

    @MockBean
    private CurrentNutritionUserResolver currentNutritionUserResolver;

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
    void shouldCreateDraftFromUploadedPhoto() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();

        when(currentNutritionUserResolver.resolve(any(), eq(null))).thenReturn(userId);
        when(photoUploadAnalysisService.analyzeAndCreateDraft(any())).thenReturn(new PhotoAnalysisDraftResponse(
                draftId,
                userId,
                LocalDate.of(2026, 4, 8),
                PhotoAnalysisDraftStatus.DRAFT,
                new PhotoAnalysisResponse(
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
                ),
                new BigDecimal("248"),
                new BigDecimal("46"),
                new BigDecimal("0"),
                null,
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "meal.jpg",
                "image/jpeg",
                "fake-image-content".getBytes()
        );

        mockMvc.perform(multipart("/api/photo-analysis/upload")
                        .file(file)
                        .param("entryDate", "2026-04-08")
                        .param("userNote", "Lunch")
                        .param("locale", "en"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.draft.id").value(draftId.toString()))
                .andExpect(jsonPath("$.draft.status").value("DRAFT"))
                .andExpect(jsonPath("$.draft.analysis.totals.calories").value(248));

        verify(photoUploadAnalysisService).analyzeAndCreateDraft(any());
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

    @Test
    void shouldRejectNonImageUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "note.txt",
                "text/plain",
                "not-an-image".getBytes()
        );

        mockMvc.perform(multipart("/api/photo-analysis/upload")
                        .file(file))
                .andExpect(status().isBadRequest());
    }
}
