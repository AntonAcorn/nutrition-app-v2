package com.aiduparc.nutrition.library.service;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.library.api.MealTemplateItem;
import com.aiduparc.nutrition.library.api.MealTemplateRequest;
import com.aiduparc.nutrition.library.api.MealTemplateResponse;
import com.aiduparc.nutrition.library.model.MealTemplateEntity;
import com.aiduparc.nutrition.library.repository.MealTemplateRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MealTemplateService {

    private static final Logger log = LoggerFactory.getLogger(MealTemplateService.class);
    private static final TypeReference<List<MealTemplateItem>> ITEM_LIST_TYPE = new TypeReference<>() {};

    private final MealTemplateRepository repository;
    private final NutritionHistoryService nutritionHistoryService;
    private final ObjectMapper objectMapper;

    public MealTemplateService(
            MealTemplateRepository repository,
            NutritionHistoryService nutritionHistoryService,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.nutritionHistoryService = nutritionHistoryService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<MealTemplateResponse> list(UUID userId) {
        return repository.findByNutritionUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public MealTemplateResponse create(UUID userId, MealTemplateRequest request) {
        var entity = new MealTemplateEntity();
        entity.setNutritionUserId(userId);
        applyRequest(entity, request);
        var saved = repository.save(entity);
        log.info("meal-template created userId={} templateId={} name={}", userId, saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public MealTemplateResponse update(UUID userId, UUID templateId, MealTemplateRequest request) {
        var entity = repository.findByIdAndNutritionUserId(templateId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
        applyRequest(entity, request);
        var saved = repository.save(entity);
        log.info("meal-template updated userId={} templateId={}", userId, templateId);
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID templateId) {
        var entity = repository.findByIdAndNutritionUserId(templateId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
        repository.delete(entity);
        log.info("meal-template deleted userId={} templateId={}", userId, templateId);
    }

    @Transactional
    public void log(UUID userId, UUID templateId, LocalDate entryDate) {
        var entity = repository.findByIdAndNutritionUserId(templateId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

        nutritionHistoryService.addToDailyTotals(new NutritionHistoryService.AddToDailyTotalsCommand(
                userId,
                entryDate,
                entity.getTotalCalories(),
                entity.getTotalProtein(),
                entity.getTotalFat(),
                entity.getTotalFiber(),
                "From library: " + entity.getName()
        ));
        log.info("meal-template logged userId={} templateId={} entryDate={} calories={}",
                userId, templateId, entryDate, entity.getTotalCalories());
    }

    private void applyRequest(MealTemplateEntity entity, MealTemplateRequest request) {
        entity.setName(request.name().trim());
        entity.setItemsJson(toJson(request.items()));

        BigDecimal calories = BigDecimal.ZERO;
        BigDecimal protein = BigDecimal.ZERO;
        BigDecimal fat = BigDecimal.ZERO;
        BigDecimal fiber = BigDecimal.ZERO;
        for (MealTemplateItem item : request.items()) {
            calories = calories.add(safe(item.calories()));
            protein = protein.add(safe(item.protein()));
            fat = fat.add(safe(item.fat()));
            fiber = fiber.add(safe(item.fiber()));
        }
        entity.setTotalCalories(calories);
        entity.setTotalProtein(protein);
        entity.setTotalFat(fat);
        entity.setTotalFiber(fiber);
    }

    private MealTemplateResponse toResponse(MealTemplateEntity entity) {
        return new MealTemplateResponse(
                entity.getId(),
                entity.getName(),
                fromJson(entity.getItemsJson()),
                entity.getTotalCalories(),
                entity.getTotalProtein(),
                entity.getTotalFat(),
                entity.getTotalFiber(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private String toJson(List<MealTemplateItem> items) {
        try {
            return objectMapper.writeValueAsString(items);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize items");
        }
    }

    private List<MealTemplateItem> fromJson(String json) {
        try {
            return objectMapper.readValue(json, ITEM_LIST_TYPE);
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private static BigDecimal safe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
