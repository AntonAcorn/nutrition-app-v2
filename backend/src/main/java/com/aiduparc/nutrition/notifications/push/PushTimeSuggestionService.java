package com.aiduparc.nutrition.notifications.push;

import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Looks at recent meal-log timestamps to recommend a smarter reminder hour.
 * The hour shown in Profile is "when we nudge you if you haven't logged" —
 * if the user typically logs at 7:30 PM, an 8 PM reminder is too late and
 * a noon reminder is too early. We compute the median hour-of-day from the
 * last two weeks of activity and suggest it back through the API.
 *
 * <p>Returns null when there isn't enough data (< 10 entries) or when the
 * median already matches the current reminderHour — no point pestering the
 * user when they're already optimal.
 */
@Service
public class PushTimeSuggestionService {

    private static final int LOOKBACK_DAYS = 14;
    private static final int MIN_LOGS = 10;

    private final MealLogEntryRepository mealRepo;

    public PushTimeSuggestionService(MealLogEntryRepository mealRepo) {
        this.mealRepo = mealRepo;
    }

    public record Suggestion(Integer suggestedHour, int basedOnLogs) {}

    public Suggestion compute(UUID userId, ZoneId zone, int currentReminderHour) {
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(LOOKBACK_DAYS);
        List<OffsetDateTime> times = mealRepo.findCreatedAtByUserIdSince(userId, since);
        if (times.size() < MIN_LOGS) return new Suggestion(null, times.size());

        List<Integer> hours = times.stream()
                .map(ts -> ts.atZoneSameInstant(zone).getHour())
                .sorted()
                .toList();
        // Use the dinner-time biased median: meals cluster at noon and 7pm, so
        // we want the LATER cluster as the cutoff. Pick the 60th percentile,
        // not the 50th, so the reminder lands at or slightly after the typical
        // last meal rather than between breakfast and dinner.
        int index = Math.min(hours.size() - 1, (int) Math.round(hours.size() * 0.6));
        int median = hours.get(index);

        if (median == currentReminderHour) return new Suggestion(null, hours.size());
        // Avoid suggesting quiet hours (22-7) — keep within sane reminder
        // window. If the median lands there, clamp to the nearest waking hour.
        if (median >= 22) median = 21;
        if (median < 8)   median = 8;
        if (median == currentReminderHour) return new Suggestion(null, hours.size());

        return new Suggestion(median, hours.size());
    }

    public Suggestion empty() {
        return new Suggestion(null, 0);
    }

    public Suggestion emptyWithCount(int count) {
        return new Suggestion(null, count);
    }

    public static List<OffsetDateTime> emptyList() {
        return Collections.emptyList();
    }
}
