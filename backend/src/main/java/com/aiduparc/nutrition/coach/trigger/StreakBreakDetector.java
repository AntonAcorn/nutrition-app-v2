package com.aiduparc.nutrition.coach.trigger;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Fires the morning after a streak of ≥4 consecutive logged days breaks.
 * Acts as a friendly nudge, not a guilt trip — we ask what changed rather
 * than scolding.
 */
@Component
public class StreakBreakDetector implements TriggerDetector {

    private static final int MIN_STREAK = 4;
    private static final int FIRE_HOUR = 9;

    private final DailyNutritionEntryRepository dailyRepo;

    public StreakBreakDetector(DailyNutritionEntryRepository dailyRepo) {
        this.dailyRepo = dailyRepo;
    }

    @Override public String kind() { return "streak_break"; }
    @Override public Duration cooldown() { return Duration.ofDays(7); }

    @Override
    public boolean isFiringWindow(ZonedDateTime localNow) {
        return localNow.getHour() == FIRE_HOUR;
    }

    @Override
    public Optional<TriggerPayload> detect(UUID userId, LocalDate today, ZoneId zone) {
        // Yesterday must be empty, the day before that must be logged, and
        // there must be a ≥MIN_STREAK run of logged days ending two days ago.
        LocalDate yesterday = today.minusDays(1);
        if (isLogged(userId, yesterday)) return Optional.empty();

        int streak = 0;
        LocalDate cursor = today.minusDays(2);
        while (streak < 30 && isLogged(userId, cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        if (streak < MIN_STREAK) return Optional.empty();

        return Optional.of(new TriggerPayload(
            "Quiet yesterday",
            streak + "-day streak paused. What was different?",
            "streak_break.streak=" + streak
        ));
    }

    private boolean isLogged(UUID userId, LocalDate date) {
        return dailyRepo.findByUserIdAndEntryDate(userId, date)
            .map(DailyNutritionEntryEntity::getCaloriesConsumedKcal)
            .map(v -> v != null && v.compareTo(BigDecimal.ZERO) > 0)
            .orElse(false);
    }
}
