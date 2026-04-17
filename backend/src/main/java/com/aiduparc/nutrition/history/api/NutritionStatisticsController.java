package com.aiduparc.nutrition.history.api;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history/statistics")
public class NutritionStatisticsController {

    private static final Logger log = LoggerFactory.getLogger(NutritionStatisticsController.class);

    private final NutritionHistoryService nutritionHistoryService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public NutritionStatisticsController(
            NutritionHistoryService nutritionHistoryService,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.nutritionHistoryService = nutritionHistoryService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public NutritionStatisticsResponse getStatistics(
        @RequestParam(required = false) UUID userId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        HttpSession session
    ) {
        UUID resolvedUserId = currentNutritionUserResolver.resolve(session, userId);
        log.info("statistics request userId={} fromDate={} toDate={}", resolvedUserId, fromDate, toDate);
        return nutritionHistoryService.getStatistics(resolvedUserId, fromDate, toDate);
    }
}
