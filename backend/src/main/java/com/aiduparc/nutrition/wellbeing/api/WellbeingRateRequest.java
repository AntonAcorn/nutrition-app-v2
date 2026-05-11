package com.aiduparc.nutrition.wellbeing.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record WellbeingRateRequest(
    @NotNull @Min(1) @Max(5) Integer rating,
    /** Optional - the user's local-tz date for this rating. Falls back to
     *  the server's current UTC date if absent (keeps older clients working). */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate entryDate
) {}
