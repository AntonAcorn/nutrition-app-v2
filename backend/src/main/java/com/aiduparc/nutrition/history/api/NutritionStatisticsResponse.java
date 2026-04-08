package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record NutritionStatisticsResponse(
    UUID userId,
    LocalDate fromDate,
    LocalDate toDate,
    NutritionBalanceSummaryResponse selectedPeriodSummary,
    NutritionBalanceSummaryResponse weeklySummary,
    NutritionBalanceSummaryResponse monthlySummary,
    BigDecimal weeklyAverageWeightKg,
    BigDecimal monthlyAverageWeightKg,
    List<NutritionStatisticsPointResponse> points
) {
}
