package com.aiduparc.nutrition.coach.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Structured snapshot of a user's nutrition state over a window of N days.
 * Designed as the canonical input for an LLM-driven coach: every field is a
 * concrete, pre-aggregated signal so the model does not have to derive it
 * from raw rows.
 */
public record CoachSnapshotResponse(
    Profile profile,
    Window window,
    Totals totals,
    Map<String, DayOfWeekStat> byDayOfWeek,
    Map<String, SlotStat> bySlot,
    MealTiming mealTiming,
    WeightTrend weightTrend,
    BankStat bank,
    RelaxDayStat relaxDays,
    WellbeingStat wellbeing,
    List<TopMeal> topMeals
) {
    public record Profile(
        String goal,
        String weightLossStrategy,
        String activityLevel,
        Integer ageYears,
        String gender,
        Integer dailyTargetKcal,
        MacroTargets macroTargets,
        Double startingWeightKg,
        Double targetWeightKg
    ) {}

    public record MacroTargets(
        Integer proteinG,
        Integer fatG,
        Integer carbsG,
        Integer fiberG
    ) {}

    public record Window(
        int days,
        LocalDate from,
        LocalDate to
    ) {}

    public record Totals(
        int loggedDays,
        Integer avgConsumedKcal,
        MacroAvg avgMacros,
        int daysOverTarget,
        int daysUnderTarget,
        int daysInZone,
        Integer maxOverrunKcal,
        Integer maxUnderrunKcal,
        int loggingStreakDays,
        int noOverrunStreakDays
    ) {}

    public record MacroAvg(
        Integer proteinG,
        Integer fatG,
        Integer carbsG,
        Integer fiberG
    ) {}

    public record DayOfWeekStat(
        Integer avgKcal,
        int samples
    ) {}

    public record SlotStat(
        Integer avgKcal,
        int samples
    ) {}

    public record MealTiming(
        Integer earliestMealHour,
        Integer latestMealHour,
        int lateMealsCount,
        int earlyMealsCount
    ) {}

    public record WeightTrend(
        Double startKg,
        Double endKg,
        Double deltaKg,
        Double vsTargetKg
    ) {}

    public record BankStat(
        int currentKcal,
        int usedThisWindowKcal,
        int depositsCount
    ) {}

    public record RelaxDayStat(
        int usedInWindow,
        int usedThisMonth,
        int allowedPerMonth
    ) {}

    public record WellbeingStat(
        int ratingsCount,
        Double avgRating,
        Map<String, Double> avgByDayOfWeek
    ) {}

    public record TopMeal(
        String name,
        int count,
        Integer avgKcal
    ) {}
}
