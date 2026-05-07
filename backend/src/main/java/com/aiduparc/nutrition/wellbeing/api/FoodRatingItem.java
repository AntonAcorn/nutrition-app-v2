package com.aiduparc.nutrition.wellbeing.api;

public record FoodRatingItem(
    String name,
    double avgRating,
    int sampleCount
) {}
