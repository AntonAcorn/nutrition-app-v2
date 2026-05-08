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
    PriorWindow priorWindow,
    Map<String, DayOfWeekStat> byDayOfWeek,
    Map<String, SlotStat> bySlot,
    MealTiming mealTiming,
    WeightTrend weightTrend,
    BankStat bank,
    RelaxDayStat relaxDays,
    WellbeingStat wellbeing,
    List<TopMeal> topMeals,
    DayHighlight bestDay,
    DayHighlight worstDay,
    List<RecentMeal> recentMeals,
    HealthAggregate health
) {
    public record Profile(
        String displayName,
        String goal,
        String weightLossStrategy,
        String activityLevel,
        Integer ageYears,
        String gender,
        Integer dailyTargetKcal,
        MacroTargets macroTargets,
        Double startingWeightKg,
        Double targetWeightKg,
        java.util.List<String> coachFocus
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

    /**
     * Same shape as Totals but for the window immediately before the
     * current one (e.g. "last week" when window=7). Lets the model talk
     * about week-over-week changes without inventing baselines.
     */
    public record PriorWindow(
        int loggedDays,
        Integer avgConsumedKcal,
        MacroAvg avgMacros,
        int daysOverTarget
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
        Map<String, Double> avgByDayOfWeek,
        Map<String, SlotWellbeing> bySlot
    ) {}

    public record SlotWellbeing(
        Double avgRating,
        int samples
    ) {}

    public record TopMeal(
        String name,
        int count,
        Integer avgKcal
    ) {}

    /**
     * Full picture of one specific day — what made it stand out. Lets the
     * model anchor an insight on a real moment ("Friday's dinner of Pasta
     * +salad pushed the day to 2700 kcal") instead of a generic average.
     */
    public record DayHighlight(
        LocalDate date,
        String dayOfWeek,
        Integer consumedKcal,
        Integer targetKcal,
        Integer overrunKcal,
        Integer underrunKcal,
        Integer wellbeingRating,
        List<String> meals
    ) {}

    /**
     * Concrete recent meal entries — raw names as the user (or analyzer)
     * typed them, with timestamps. Lets the model talk about specific
     * food without inventing names.
     */
    public record RecentMeal(
        LocalDate date,
        String slot,
        String name,
        Integer kcal,
        Integer hour
    ) {}

    /**
     * Aggregated HealthKit data over the same window. Lets the model spot
     * cross-domain patterns: poor sleep → late dinners, low steps → cravings,
     * workout days holding zone, etc. Any field is null when the user
     * either hasn't synced HealthKit or doesn't have that metric.
     */
    public record HealthAggregate(
        int loggedDays,
        Integer avgSteps,
        Integer avgActiveKcal,
        Integer avgSleepMinutes,
        Integer workoutDays,
        Integer totalWorkoutMinutes,
        java.util.Map<String, Integer> stepsByDayOfWeek,
        java.util.Map<String, Integer> sleepMinByDayOfWeek
    ) {}
}
