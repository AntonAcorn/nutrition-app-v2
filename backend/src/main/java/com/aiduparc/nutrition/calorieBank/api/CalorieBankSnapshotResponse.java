package com.aiduparc.nutrition.calorieBank.api;

public record CalorieBankSnapshotResponse(
    int bank,
    int bankUsedToday,
    int bankRemainingAfterToday,
    int todayOverrun,
    boolean isRelaxToday,
    long relaxDaysUsedThisMonth,
    int relaxDaysAllowedPerMonth,
    int dailyBankCap,
    int bankMax
) {}
