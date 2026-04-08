package com.aiduparc.nutrition.photoanalysis.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoUploadAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DefaultPhotoUploadAnalysisServiceTest {

    @Mock
    private PhotoAnalysisService photoAnalysisService;

    @Mock
    private PhotoAnalysisDraftService draftService;

    @Mock
    private ImageNormalizationService imageNormalizationService;

    @InjectMocks
    private DefaultPhotoUploadAnalysisService service;

    @Test
    void shouldAnalyzeUploadAndCreateDraft() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);
        PhotoAnalysisResponse analysis = new PhotoAnalysisResponse(
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
        );

        PhotoAnalysisDraftResponse draftResponse = new PhotoAnalysisDraftResponse(
                UUID.randomUUID(),
                userId,
                entryDate,
                PhotoAnalysisDraftStatus.DRAFT,
                analysis,
                new BigDecimal("248"),
                new BigDecimal("46"),
                new BigDecimal("0"),
                null,
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        when(imageNormalizationService.normalize(any(), any())).thenReturn(
                new ImageNormalizationService.NormalizedImage("normalized-image".getBytes(), "image/jpeg")
        );
        when(photoAnalysisService.analyze(any())).thenReturn(analysis);
        when(draftService.create(any())).thenReturn(draftResponse);

        PhotoAnalysisDraftResponse result = service.analyzeAndCreateDraft(new PhotoUploadAnalysisRequest(
                userId,
                entryDate,
                "meal.jpg",
                "image/jpeg",
                "fake-image-content".getBytes(),
                "Lunch",
                "en"
        ));

        assertThat(result.id()).isEqualTo(draftResponse.id());

        ArgumentCaptor<com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest> analysisCaptor =
                ArgumentCaptor.forClass(com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest.class);
        verify(photoAnalysisService).analyze(analysisCaptor.capture());
        assertThat(analysisCaptor.getValue().imageUrl()).startsWith("data:image/jpeg;base64,");

        verify(imageNormalizationService).normalize(any(), any());
        verify(draftService).create(any());
    }
}
