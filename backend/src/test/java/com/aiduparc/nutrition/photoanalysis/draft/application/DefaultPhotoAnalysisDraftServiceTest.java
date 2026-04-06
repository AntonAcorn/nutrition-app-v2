package com.aiduparc.nutrition.photoanalysis.draft.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import com.aiduparc.nutrition.photoanalysis.draft.dto.ConfirmPhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftEntity;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftStatus;
import com.aiduparc.nutrition.photoanalysis.draft.repository.PhotoAnalysisDraftRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class DefaultPhotoAnalysisDraftServiceTest {

    @Mock
    private PhotoAnalysisDraftRepository repository;

    @Mock
    private NutritionHistoryService nutritionHistoryService;

    private DefaultPhotoAnalysisDraftService service;

    @BeforeEach
    void setUp() {
        this.service = new DefaultPhotoAnalysisDraftService(repository, nutritionHistoryService, new ObjectMapper());
    }

    @Test
    void createStoresDraftWithoutWritingFinalNutritionEntry() {
        UUID userId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 4, 6);
        PhotoAnalysisResponse analysis = sampleAnalysis();

        when(repository.save(any(PhotoAnalysisDraftEntity.class))).thenAnswer(invocation -> {
            PhotoAnalysisDraftEntity e = invocation.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        var response = service.create(new CreatePhotoAnalysisDraftRequest(userId, date, analysis));

        assertThat(response.id()).isNotNull();
        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.status()).isEqualTo(PhotoAnalysisDraftStatus.DRAFT);
        assertThat(response.analysis().totals().calories()).isEqualByComparingTo("560");
        verify(nutritionHistoryService, never()).upsert(any());
    }

    @Test
    void confirmWritesFinalNutritionEntryAndMarksDraftConfirmed() {
        UUID draftId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 4, 6);

        PhotoAnalysisDraftEntity entity = new PhotoAnalysisDraftEntity();
        entity.setId(draftId);
        entity.setUserId(userId);
        entity.setEntryDate(date);
        entity.setStatus(PhotoAnalysisDraftStatus.DRAFT);
        entity.setEstimatedCaloriesKcal(new BigDecimal("560"));
        entity.setEstimatedProteinG(new BigDecimal("30"));
        entity.setEstimatedFiberG(new BigDecimal("8"));
        entity.setAnalysisJson(new ObjectMapper().valueToTree(sampleAnalysis()).toString());

        when(repository.findById(draftId)).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoAnalysisDraftEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyNutritionEntrySnapshot snapshot = new DailyNutritionEntrySnapshot(
                UUID.randomUUID(),
                userId,
                date,
                null,
                new BigDecimal("570"),
                null,
                new BigDecimal("31"),
                new BigDecimal("7"),
                "confirmed",
                null,
                null
        );
        when(nutritionHistoryService.upsert(any())).thenReturn(snapshot);

        var response = service.confirm(draftId, new ConfirmPhotoAnalysisDraftRequest(
                new BigDecimal("570"),
                new BigDecimal("31"),
                new BigDecimal("7"),
                "confirmed"
        ));

        assertThat(response.status()).isEqualTo(PhotoAnalysisDraftStatus.CONFIRMED);
        assertThat(response.confirmedDailyEntryId()).isEqualTo(snapshot.id());
        assertThat(response.estimatedCaloriesKcal()).isEqualByComparingTo("570");
        verify(nutritionHistoryService).upsert(any());
    }

    @Test
    void confirmFailsForAlreadyConfirmedDraft() {
        UUID draftId = UUID.randomUUID();
        PhotoAnalysisDraftEntity entity = new PhotoAnalysisDraftEntity();
        entity.setId(draftId);
        entity.setStatus(PhotoAnalysisDraftStatus.CONFIRMED);
        entity.setAnalysisJson(new ObjectMapper().valueToTree(sampleAnalysis()).toString());

        when(repository.findById(draftId)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> service.confirm(draftId, new ConfirmPhotoAnalysisDraftRequest(null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409 CONFLICT");
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
