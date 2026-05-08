package com.aiduparc.nutrition.coach.infrastructure;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import java.util.List;

public interface CoachInsightProvider {

    /**
     * Generate up to ~3 insight cards for the given snapshot. May return an
     * empty list when there is not enough signal in the snapshot to say
     * anything useful.
     *
     * @param history past insights the user has seen (most recent first), so
     *                the model can refer back to its own advice and avoid
     *                repeating identical suggestions.
     * @param locale  BCP-47 tag (e.g. "en", "ru") for natural-language fields.
     */
    List<InsightDraft> generate(CoachSnapshotResponse snapshot, List<PastInsight> history, String locale);

    /**
     * Generate a structured Spotify-Wrapped style weekly recap with five
     * fixed sections. Returns null if there is not enough data to fill them.
     */
    WeeklyRecapDraft generateWeeklyRecap(CoachSnapshotResponse snapshot, List<PastInsight> history, String locale);

    /** Identifier of the underlying provider for telemetry (e.g. "openai:gpt-4o-mini" or "stub"). */
    String sourceTag();

    record InsightDraft(
        String kind,
        String title,
        String body,
        String anchor
    ) {}

    record WeeklyRecapDraft(
        Section highlight,
        Section trend,
        Section challenge,
        Section nextWeekGoal,
        String shareLine
    ) {
        public record Section(String title, String body) {}
    }

    /**
     * Compact view of one past insight, fed back into the model so it can
     * follow up on its own advice. {@code daysAgo} is rounded to whole days
     * from the time the insight was generated.
     */
    record PastInsight(
        String kind,
        String title,
        String body,
        String anchor,
        int daysAgo,
        boolean dismissed
    ) {}
}
