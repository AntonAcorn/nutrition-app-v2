package com.aiduparc.nutrition.coach.infrastructure;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import java.util.List;

public interface CoachInsightProvider {

    /**
     * Generate up to ~3 insight cards for the given snapshot. May return an
     * empty list when there is not enough signal in the snapshot to say
     * anything useful. The locale is a BCP-47 tag (e.g. "en", "ru") used
     * to localize natural-language fields in the response.
     */
    List<InsightDraft> generate(CoachSnapshotResponse snapshot, String locale);

    /**
     * Generate a structured Spotify-Wrapped style weekly recap with five
     * fixed sections. Returns null if there is not enough data to fill them.
     */
    WeeklyRecapDraft generateWeeklyRecap(CoachSnapshotResponse snapshot, String locale);

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
}
