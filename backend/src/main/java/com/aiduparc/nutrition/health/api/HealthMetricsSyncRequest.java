package com.aiduparc.nutrition.health.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record HealthMetricsSyncRequest(
    @Valid @NotEmpty List<DayMetrics> days
) {
    public record DayMetrics(
        @NotNull LocalDate date,
        Integer steps,
        Integer activeKcal,
        Integer sleepMinutes,
        Integer workoutMinutes,
        Integer workoutCount
    ) {}
}
