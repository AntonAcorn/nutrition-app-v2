package com.aiduparc.nutrition.coach.trigger;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Single-purpose detector that decides whether to fire a specific kind of
 * coach push for a given user right now. Implementations stay stateless;
 * they query repositories on demand.
 */
public interface TriggerDetector {

    /** Stable identifier persisted in coach_triggers.kind. */
    String kind();

    /**
     * Time window after the last fire during which the same trigger is
     * suppressed for the same user.
     */
    java.time.Duration cooldown();

    /** Returns true only at the right local hour/day for this trigger. */
    boolean isFiringWindow(ZonedDateTime localNow);

    /**
     * Heavy work — only run if {@link #isFiringWindow} is true and the
     * trigger isn't on cooldown.
     */
    Optional<TriggerPayload> detect(UUID userId, LocalDate today, ZoneId zone);

    record TriggerPayload(
        String pushTitle,
        String pushBody,
        String anchor
    ) {}
}
