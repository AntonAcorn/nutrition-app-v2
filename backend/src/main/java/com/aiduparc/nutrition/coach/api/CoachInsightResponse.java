package com.aiduparc.nutrition.coach.api;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CoachInsightResponse(
    OffsetDateTime generatedAt,
    OffsetDateTime validUntil,
    int snapshotWindowDays,
    String source,
    List<Card> cards
) {
    public record Card(
        UUID id,
        String kind,
        String title,
        String body,
        String anchor
    ) {}
}
