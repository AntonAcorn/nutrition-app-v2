package com.aiduparc.nutrition.history.api;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
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

    public TodaySummaryController(NutritionHistoryService nutritionHistoryService) {
        this.nutritionHistoryService = nutritionHistoryService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse getTodaySummary(
            @RequestParam UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        log.info("today-summary request userId={} entryDate={}", userId, safeDate);
        return nutritionHistoryService.getTodaySummary(userId, safeDate);
    }

    @PutMapping("/weight")
    @ResponseStatus(HttpStatus.OK)
    public TodaySummaryResponse updateWeight(
            @RequestParam UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            @Valid @RequestBody UpdateWeightRequest request
    ) {
        LocalDate safeDate = entryDate != null ? entryDate : LocalDate.now();
        log.info("weight update request userId={} entryDate={} weightKg={}", userId, safeDate, request.weightKg());
        nutritionHistoryService.updateWeight(userId, safeDate, request.weightKg());
        return nutritionHistoryService.getTodaySummary(userId, safeDate);
    }
}
