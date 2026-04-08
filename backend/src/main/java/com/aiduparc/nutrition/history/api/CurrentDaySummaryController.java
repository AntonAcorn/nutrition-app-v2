package com.aiduparc.nutrition.history.api;

import com.aiduparc.nutrition.history.service.CurrentDaySummarySnapshot;
import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
public class CurrentDaySummaryController {

    private static final UUID DEFAULT_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private final NutritionHistoryService nutritionHistoryService;

    public CurrentDaySummaryController(NutritionHistoryService nutritionHistoryService) {
        this.nutritionHistoryService = nutritionHistoryService;
    }

    @GetMapping("/current-day-summary")
    public ResponseEntity<CurrentDaySummaryResponse> getCurrentDaySummary(
        @RequestParam(value = "userId", required = false) UUID userId
    ) {
        UUID resolvedUserId = userId == null ? DEFAULT_USER_ID : userId;

        Optional<CurrentDaySummarySnapshot> summary = nutritionHistoryService.findCurrentDaySummary(
            resolvedUserId,
            LocalDate.now()
        );

        return summary
            .map(CurrentDaySummaryResponse::fromSnapshot)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.ok(CurrentDaySummaryResponse.emptyForDate(LocalDate.now())));
    }

    public record CurrentDaySummaryResponse(
        LocalDate entryDate,
        BigDecimal consumedCalories,
        BigDecimal dailyTargetCalories,
        BigDecimal remainingCalories,
        BigDecimal proteinGrams,
        BigDecimal fiberGrams
    ) {
        static CurrentDaySummaryResponse fromSnapshot(CurrentDaySummarySnapshot snapshot) {
            return new CurrentDaySummaryResponse(
                snapshot.entryDate(),
                snapshot.consumedCalories(),
                snapshot.dailyTargetCalories(),
                snapshot.remainingCalories(),
                snapshot.proteinGrams(),
                snapshot.fiberGrams()
            );
        }

        static CurrentDaySummaryResponse emptyForDate(LocalDate date) {
            return new CurrentDaySummaryResponse(
                date,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
            );
        }
    }
}
