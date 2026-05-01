package com.aiduparc.nutrition.food;

public record FoodProductResponse(
    String name,
    String barcode,
    Double caloriesPer100g,
    Double proteinPer100g,
    Double fatPer100g,
    Double carbsPer100g,
    Double fiberPer100g
) {}
