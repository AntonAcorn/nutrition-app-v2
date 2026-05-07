package com.aiduparc.nutrition.wellbeing.api;

import java.time.LocalDate;

public record WellbeingTrendDay(LocalDate date, double avgRating, int count) {}
