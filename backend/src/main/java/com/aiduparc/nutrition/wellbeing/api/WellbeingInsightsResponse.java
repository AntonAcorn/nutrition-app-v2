package com.aiduparc.nutrition.wellbeing.api;

import java.util.List;

public record WellbeingInsightsResponse(
    boolean enoughData,
    int totalEntries,
    int requiredEntries,
    List<FoodRatingItem> energizers,
    List<FoodRatingItem> drainers
) {
    public static WellbeingInsightsResponse notEnoughData(int count) {
        return new WellbeingInsightsResponse(false, count, REQUIRED, List.of(), List.of());
    }

    public static WellbeingInsightsResponse withData(int count, List<FoodRatingItem> energizers, List<FoodRatingItem> drainers) {
        return new WellbeingInsightsResponse(true, count, REQUIRED, energizers, drainers);
    }

    private static final int REQUIRED = 7;
}
