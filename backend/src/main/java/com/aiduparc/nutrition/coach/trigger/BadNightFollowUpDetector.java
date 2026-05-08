package com.aiduparc.nutrition.coach.trigger;

import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingEntryRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Fires the morning after a low (≤2★) wellbeing rating. Frames the push
 * as curiosity ("here's what coach noticed"), inviting the user back in
 * to look at correlations rather than dwelling on the bad night.
 */
@Component
public class BadNightFollowUpDetector implements TriggerDetector {

    private static final int MAX_BAD_RATING = 2;
    private static final int FIRE_HOUR = 9;

    private final WellbeingEntryRepository wellbeingRepo;

    public BadNightFollowUpDetector(WellbeingEntryRepository wellbeingRepo) {
        this.wellbeingRepo = wellbeingRepo;
    }

    @Override public String kind() { return "bad_night_followup"; }
    @Override public Duration cooldown() { return Duration.ofDays(1); }

    @Override
    public boolean isFiringWindow(ZonedDateTime localNow) {
        return localNow.getHour() == FIRE_HOUR;
    }

    @Override
    public Optional<TriggerPayload> detect(UUID userId, LocalDate today, ZoneId zone) {
        LocalDate yesterday = today.minusDays(1);
        List<WellbeingEntryEntity> entries = wellbeingRepo
            .findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, yesterday, yesterday);
        if (entries.isEmpty()) return Optional.empty();

        int worst = entries.stream().mapToInt(WellbeingEntryEntity::getRating).min().orElse(5);
        if (worst > MAX_BAD_RATING) return Optional.empty();

        return Optional.of(new TriggerPayload(
            "Yesterday felt rough",
            "Your rating was " + worst + "★. Open Coach — there might be a pattern in what you ate.",
            "bad_night_followup.worstRating=" + worst
        ));
    }
}
