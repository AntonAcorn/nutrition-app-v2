package com.aiduparc.nutrition.history.api;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history/today-summary")
public class TodaySummaryController {

    private static final Logger log = LoggerFactory.getLogger(TodaySummaryController.class);

    private final NutritionHistoryService nutritionHistoryService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public TodaySummaryController(
            NutritionHistoryService nutritionHistoryService,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.nutritionHistoryService = nutritionHistoryService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse getTodaySummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            HttpSession session
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        UUID resolvedUserId = currentNutritionUserResolver.resolve(session, null);
        log.info("today-summary request userId={} entryDate={}", resolvedUserId, safeDate);
        return nutritionHistoryService.getTodaySummary(resolvedUserId, safeDate);
    }

    @PutMapping("/weight")
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse updateWeight(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            @Valid @RequestBody UpdateWeightRequest request,
            HttpSession session
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        UUID resolvedUserId = currentNutritionUserResolver.resolve(session, null);
        log.info("weight update request userId={} entryDate={} weightKg={}", resolvedUserId, safeDate, request.weightKg());
        nutritionHistoryService.updateWeight(resolvedUserId, safeDate, request.weightKg());
        return nutritionHistoryService.getTodaySummary(resolvedUserId, safeDate);
    }

    @PostMapping("/add-meal")
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse addMeal(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            @Valid @RequestBody UpdateNutritionTotalsRequest request,
            HttpSession session
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        UUID resolvedUserId = currentNutritionUserResolver.resolve(session, null);
        nutritionHistoryService.addToDailyTotals(new NutritionHistoryService.AddToDailyTotalsCommand(
            resolvedUserId, safeDate,
            request.caloriesConsumedKcal(), request.proteinGrams(), request.fatGrams(), request.fiberGrams(),
            null
        ));
        return nutritionHistoryService.getTodaySummary(resolvedUserId, safeDate);
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse resetDay(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            HttpSession session
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        UUID resolvedUserId = currentNutritionUserResolver.resolve(session, null);
        nutritionHistoryService.updateNutritionTotals(
            resolvedUserId, safeDate,
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO
        );
        return nutritionHistoryService.getTodaySummary(resolvedUserId, safeDate);
    }

    @PutMapping("/nutrition-totals")
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse updateNutritionTotals(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            @Valid @RequestBody UpdateNutritionTotalsRequest request,
            HttpSession session
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        UUID resolvedUserId = currentNutritionUserResolver.resolve(session, null);
        log.info("nutrition-totals update userId={} entryDate={} kcal={} protein={} fat={} fiber={}",
            resolvedUserId, safeDate,
            request.caloriesConsumedKcal(), request.proteinGrams(), request.fatGrams(), request.fiberGrams());
        nutritionHistoryService.updateNutritionTotals(
            resolvedUserId, safeDate,
            request.caloriesConsumedKcal(), request.proteinGrams(), request.fatGrams(), request.fiberGrams());
        return nutritionHistoryService.getTodaySummary(resolvedUserId, safeDate);
    }
}
