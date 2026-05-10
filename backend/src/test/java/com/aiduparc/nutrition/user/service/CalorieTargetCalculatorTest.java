package com.aiduparc.nutrition.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class CalorieTargetCalculatorTest {

    // Male, 30y, 180cm, 80kg, sedentary
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
    // TDEE = 1780 * 1.2 = 2136
    @Test
    void maleSedentaryMaintain() {
        BigDecimal result = CalorieTargetCalculator.calculate(30, "male", bd("180"), bd("80"), "sedentary", "maintain", null);
        assertThat(result).isEqualByComparingTo("2136");
    }

    @Test
    void maleSedentaryLose() {
        BigDecimal result = CalorieTargetCalculator.calculate(30, "male", bd("180"), bd("80"), "sedentary", "lose", null);
        assertThat(result).isEqualByComparingTo("1636");
    }

    @Test
    void maleSedentaryGain() {
        BigDecimal result = CalorieTargetCalculator.calculate(30, "male", bd("180"), bd("80"), "sedentary", "gain", null);
        assertThat(result).isEqualByComparingTo("2436");
    }

    // Female, 25y, 165cm, 60kg, lightly_active → BMR=1401.25, TDEE=1927, maintain
    @Test
    void femaleLightlyActiveMaintain() {
        BigDecimal result = CalorieTargetCalculator.calculate(25, "female", bd("165"), bd("60"), "lightly_active", "maintain", null);
        // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600+1031.25-125-161 = 1345.25
        // TDEE = 1345.25 * 1.375 = 1849.72 → 1850
        assertThat(result).isEqualByComparingTo("1850");
    }

    // Male, 35y, 175cm, 90kg, moderately_active, lose
    @Test
    void maleModeratelyActiveLose() {
        BigDecimal result = CalorieTargetCalculator.calculate(35, "male", bd("175"), bd("90"), "moderately_active", "lose", null);
        // BMR = 10*90 + 6.25*175 - 5*35 + 5 = 900+1093.75-175+5 = 1823.75
        // TDEE = 1823.75 * 1.55 = 2826.81
        // lose = 2826.81-500 = 2326.81 → 2327
        assertThat(result).isEqualByComparingTo("2327");
    }

    // Female, 40y, 160cm, 70kg, very_active, gain
    @Test
    void femaleVeryActiveGain() {
        BigDecimal result = CalorieTargetCalculator.calculate(40, "female", bd("160"), bd("70"), "very_active", "gain", null);
        // BMR = 10*70 + 6.25*160 - 5*40 - 161 = 700+1000-200-161 = 1339
        // TDEE = 1339 * 1.725 = 2309.775
        // gain = 2309.775+300 = 2609.775 → 2610
        assertThat(result).isEqualByComparingTo("2610");
    }

    // Male, 30y, 180cm, 80kg, sedentary, lose — strategy variants
    // TDEE = 2136
    @Test
    void loseWithMildStrategy() {
        BigDecimal result = CalorieTargetCalculator.calculate(30, "male", bd("180"), bd("80"), "sedentary", "lose", "mild");
        assertThat(result).isEqualByComparingTo("1886"); // 2136 - 250
    }

    @Test
    void loseWithOptimalStrategy() {
        BigDecimal result = CalorieTargetCalculator.calculate(30, "male", bd("180"), bd("80"), "sedentary", "lose", "optimal");
        assertThat(result).isEqualByComparingTo("1636"); // 2136 - 500
    }

    @Test
    void loseWithAggressiveStrategy() {
        BigDecimal result = CalorieTargetCalculator.calculate(30, "male", bd("180"), bd("80"), "sedentary", "lose", "aggressive");
        // 2136 - 700 = 1436, but clamped to male floor of 1500
        assertThat(result).isEqualByComparingTo("1500");
    }

    // Small female, aggressive deficit — would land at ~944 kcal without the floor.
    @Test
    void aggressiveDeficitClampsToFemaleFloor() {
        BigDecimal result = CalorieTargetCalculator.calculate(25, "female", bd("160"), bd("50"), "sedentary", "lose", "aggressive");
        // BMR = 10*50 + 6.25*160 - 5*25 - 161 = 500+1000-125-161 = 1214
        // TDEE = 1214 * 1.2 = 1456.8
        // lose aggressive = 1456.8 - 700 = 756.8, clamped to 1200
        assertThat(result).isEqualByComparingTo("1200");
    }

    @Test
    void aggressiveDeficitClampsToMaleFloor() {
        BigDecimal result = CalorieTargetCalculator.calculate(25, "male", bd("170"), bd("60"), "sedentary", "lose", "aggressive");
        // BMR = 10*60 + 6.25*170 - 5*25 + 5 = 600+1062.5-125+5 = 1542.5
        // TDEE = 1542.5 * 1.2 = 1851
        // lose aggressive = 1851 - 700 = 1151, clamped to 1500
        assertThat(result).isEqualByComparingTo("1500");
    }

    private static BigDecimal bd(String val) {
        return new BigDecimal(val);
    }
}
