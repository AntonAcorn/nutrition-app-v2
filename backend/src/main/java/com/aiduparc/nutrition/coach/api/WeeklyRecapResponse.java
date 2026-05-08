package com.aiduparc.nutrition.coach.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Spotify-Wrapped style weekly summary. Five short, distinct sections plus a
 * shareable one-liner. The body of each section follows the same rules as
 * regular insights (must include a concrete number with a unit), but the
 * five-card structure makes it predictable and emotionally rewarding —
 * something the user expects to land every Sunday evening.
 */
public record WeeklyRecapResponse(
    UUID id,
    LocalDate weekStart,
    OffsetDateTime generatedAt,
    String source,
    Section highlight,
    Section trend,
    Section challenge,
    Section nextWeekGoal,
    String shareLine
) {
    public record Section(
        String title,
        String body
    ) {}
}
