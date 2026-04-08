package com.aiduparc.nutrition.history.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record NutritionStatisticsResponse(
    UUID userId,
    LocalDate fromDate,
    LocalDate toDate,
    NutritionBalanceSummaryResponse weeklySummary,
    NutritionBalanceSummaryResponse monthlySummary,
    List<NutritionStatisticsPointResponse> points
) {
}
