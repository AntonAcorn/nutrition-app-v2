package com.aiduparc.nutrition.wellbeing.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record WellbeingRetrospectiveRequest(
    @NotNull @Valid List<Entry> entries
) {
    public record Entry(
        @NotNull LocalDate date,
        @NotNull @Min(1) @Max(5) Integer rating
    ) {}
}
