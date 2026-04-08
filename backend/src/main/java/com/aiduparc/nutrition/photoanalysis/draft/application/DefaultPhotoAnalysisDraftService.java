package com.aiduparc.nutrition.photoanalysis.draft.application;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.draft.dto.ConfirmPhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftEntity;
import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftStatus;
import com.aiduparc.nutrition.photoanalysis.draft.repository.PhotoAnalysisDraftRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class DefaultPhotoAnalysisDraftService implements PhotoAnalysisDraftService {

    private final PhotoAnalysisDraftRepository repository;
    private final NutritionHistoryService nutritionHistoryService;
    private final ObjectMapper objectMapper;

    public DefaultPhotoAnalysisDraftService(
            PhotoAnalysisDraftRepository repository,
            NutritionHistoryService nutritionHistoryService,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.nutritionHistoryService = nutritionHistoryService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public PhotoAnalysisDraftResponse create(CreatePhotoAnalysisDraftRequest request) {
        PhotoAnalysisDraftEntity entity = new PhotoAnalysisDraftEntity();
        entity.setUserId(request.userId());
        entity.setEntryDate(request.entryDate());
        entity.setStatus(PhotoAnalysisDraftStatus.DRAFT);
        entity.setAnalysisJson(toJson(request.analysis()));
        entity.setEstimatedCaloriesKcal(request.analysis().totals().calories());
        entity.setEstimatedProteinG(request.analysis().totals().protein());
        entity.setEstimatedFiberG(request.analysis().totals().fiber());

        PhotoAnalysisDraftEntity saved = repository.save(entity);
        return toResponse(saved);
    }

    @Override
    public PhotoAnalysisDraftResponse get(UUID draftId) {
        PhotoAnalysisDraftEntity entity = getExistingDraft(draftId);
        return toResponse(entity);
    }

    @Override
    @Transactional
    public PhotoAnalysisDraftResponse confirm(UUID draftId, ConfirmPhotoAnalysisDraftRequest request) {
        PhotoAnalysisDraftEntity entity = getExistingDraft(draftId);

        if (entity.getStatus() == PhotoAnalysisDraftStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Draft already confirmed");
        }

        BigDecimal calories = firstNonNull(request.caloriesKcal(), entity.getEstimatedCaloriesKcal());
        BigDecimal protein = firstNonNull(request.proteinG(), entity.getEstimatedProteinG());
        BigDecimal fiber = firstNonNull(request.fiberG(), entity.getEstimatedFiberG());

        var savedEntry = nutritionHistoryService.addToDailyTotals(new NutritionHistoryService.AddToDailyTotalsCommand(
                entity.getUserId(),
                entity.getEntryDate(),
                calories,
                protein,
                fiber,
                request.notes()
        ));

        entity.setStatus(PhotoAnalysisDraftStatus.CONFIRMED);
        entity.setConfirmedAt(OffsetDateTime.now(ZoneOffset.UTC));
        entity.setConfirmedDailyEntryId(savedEntry.id());
        entity.setEstimatedCaloriesKcal(calories);
        entity.setEstimatedProteinG(protein);
        entity.setEstimatedFiberG(fiber);

        PhotoAnalysisDraftEntity updated = repository.save(entity);
        return toResponse(updated);
    }

    @Override
    public PhotoAnalysisDraftResponse getLatest() {
        PhotoAnalysisDraftEntity entity = repository
                .findTopByStatusOrderByCreatedAtDesc(PhotoAnalysisDraftStatus.DRAFT)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No drafts found"));

        return toResponse(entity);
    }

    private PhotoAnalysisDraftEntity getExistingDraft(UUID draftId) {
        return repository.findById(draftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
    }

    private PhotoAnalysisDraftResponse toResponse(PhotoAnalysisDraftEntity entity) {
        return new PhotoAnalysisDraftResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getEntryDate(),
                entity.getStatus(),
                fromJson(entity.getAnalysisJson()),
                entity.getEstimatedCaloriesKcal(),
                entity.getEstimatedProteinG(),
                entity.getEstimatedFiberG(),
                entity.getConfirmedDailyEntryId(),
                entity.getConfirmedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private String toJson(PhotoAnalysisResponse analysis) {
        try {
            return objectMapper.writeValueAsString(analysis);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize analysis draft", e);
        }
    }

    private PhotoAnalysisResponse fromJson(String json) {
        try {
            return objectMapper.readValue(json, PhotoAnalysisResponse.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse analysis draft", e);
        }
    }

    private static BigDecimal firstNonNull(BigDecimal preferred, BigDecimal fallback) {
        if (preferred != null) {
            return preferred;
        }
        if (fallback != null) {
            return fallback;
        }
        return BigDecimal.ZERO;
    }
}

