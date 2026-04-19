package com.aiduparc.nutrition.user.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

class CalorieTargetCalculator {

    static BigDecimal calculate(
            int ageYears,
            String gender,
            BigDecimal heightCm,
            BigDecimal weightKg,
            String activityLevel,
            String goal,
            String weightLossStrategy
    ) {
        double bmr;
        double w = weightKg.doubleValue();
        double h = heightCm.doubleValue();

        if ("male".equals(gender)) {
            bmr = 10 * w + 6.25 * h - 5 * ageYears + 5;
        } else {
            bmr = 10 * w + 6.25 * h - 5 * ageYears - 161;
        }

        double activityFactor = switch (activityLevel) {
            case "lightly_active" -> 1.375;
            case "moderately_active" -> 1.55;
            case "very_active" -> 1.725;
            default -> 1.2; // sedentary
        };

        double tdee = bmr * activityFactor;

        double loseDeficit = switch (weightLossStrategy != null ? weightLossStrategy : "optimal") {
            case "mild"       -> 250;
            case "aggressive" -> 700;
            default           -> 500; // optimal
        };

        double adjusted = switch (goal) {
            case "lose" -> tdee - loseDeficit;
            case "gain" -> tdee + 300;
            default -> tdee; // maintain
        };

        return BigDecimal.valueOf(adjusted).setScale(0, RoundingMode.HALF_UP);
    }

    private CalorieTargetCalculator() {}
}
