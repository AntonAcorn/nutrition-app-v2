package com.aiduparc.nutrition.photoanalysis.draft.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.service.NutritionHistoryService;
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
        service = new DefaultPhotoAnalysisDraftService(
                repository,
                nutritionHistoryService,
                new ObjectMapper()
        );
    }

    @Test
    void createShouldPersistDraft() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);

        when(repository.save(any(PhotoAnalysisDraftEntity.class))).thenAnswer(invocation -> {
            PhotoAnalysisDraftEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID());
            }
            return entity;
        });

        PhotoAnalysisResponse analysis = new PhotoAnalysisResponse(
                List.of(),
                new PhotoAnalysisTotals(
                        BigDecimal.valueOf(420),
                        BigDecimal.valueOf(30),
                        BigDecimal.valueOf(35),
                        BigDecimal.valueOf(20),
                        BigDecimal.valueOf(6)
                ),
                BigDecimal.valueOf(87),
                List.of("Looks good"),
                true
        );

        var response = service.create(new CreatePhotoAnalysisDraftRequest(userId, entryDate, analysis));

        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.entryDate()).isEqualTo(entryDate);
        assertThat(response.estimatedCaloriesKcal()).isEqualByComparingTo("420");
        verify(repository).save(any(PhotoAnalysisDraftEntity.class));
    }

    @Test
    void confirmShouldAddToDailyTotalsAndMarkDraftConfirmed() throws Exception {
        UUID draftId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);

        PhotoAnalysisResponse analysis = new PhotoAnalysisResponse(
                List.of(),
                new PhotoAnalysisTotals(
                        BigDecimal.valueOf(420),
                        BigDecimal.valueOf(30),
                        BigDecimal.valueOf(35),
                        BigDecimal.valueOf(20),
                        BigDecimal.valueOf(6)
                ),
                BigDecimal.valueOf(87),
                List.of("Looks good"),
                true
        );

        PhotoAnalysisDraftEntity entity = new PhotoAnalysisDraftEntity();
        entity.setId(draftId);
        entity.setUserId(userId);
        entity.setEntryDate(entryDate);
        entity.setStatus(PhotoAnalysisDraftStatus.DRAFT);
        entity.setAnalysisJson(new ObjectMapper().writeValueAsString(analysis));
        entity.setEstimatedCaloriesKcal(BigDecimal.valueOf(420));
        entity.setEstimatedProteinG(BigDecimal.valueOf(30));
        entity.setEstimatedFiberG(BigDecimal.valueOf(6));

        when(repository.findByIdAndUserId(draftId, userId)).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoAnalysisDraftEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(nutritionHistoryService.addToDailyTotals(any())).thenReturn(new DailyNutritionEntrySnapshot(
                UUID.randomUUID(),
                userId,
                entryDate,
                null,
                BigDecimal.valueOf(420),
                null,
                BigDecimal.valueOf(30),
                BigDecimal.valueOf(20),
                BigDecimal.valueOf(6),
                null,
                null,
                null
        ));

        var response = service.confirm(draftId, userId, new ConfirmPhotoAnalysisDraftRequest(
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(40),
                BigDecimal.valueOf(25),
                BigDecimal.valueOf(8),
                "Dinner"
        ));

        assertThat(response.status()).isEqualTo(PhotoAnalysisDraftStatus.CONFIRMED);
        verify(nutritionHistoryService).addToDailyTotals(any());
        verify(repository).save(any(PhotoAnalysisDraftEntity.class));
    }

    @Test
    void confirmShouldRejectAlreadyConfirmedDraft() {
        UUID draftId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        PhotoAnalysisDraftEntity entity = new PhotoAnalysisDraftEntity();
        entity.setId(draftId);
        entity.setUserId(userId);
        entity.setStatus(PhotoAnalysisDraftStatus.CONFIRMED);

        when(repository.findByIdAndUserId(draftId, userId)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> service.confirm(draftId, userId, new ConfirmPhotoAnalysisDraftRequest(null, null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Draft already confirmed");
    }
}
