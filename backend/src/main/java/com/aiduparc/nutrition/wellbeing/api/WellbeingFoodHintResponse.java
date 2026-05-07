package com.aiduparc.nutrition.wellbeing.api;

public record WellbeingFoodHintResponse(
    boolean hasHint,
    double avgRating,
    int sampleCount,
    String tone,
    boolean firstTime
) {
    public static WellbeingFoodHintResponse none() {
        return new WellbeingFoodHintResponse(false, 0, 0, "neutral", false);
    }

    public static WellbeingFoodHintResponse newFood() {
        return new WellbeingFoodHintResponse(false, 0, 0, "neutral", true);
    }
}
