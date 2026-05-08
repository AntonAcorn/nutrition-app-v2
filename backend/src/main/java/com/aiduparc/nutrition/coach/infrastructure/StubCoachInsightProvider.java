package com.aiduparc.nutrition.coach.infrastructure;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Deterministic stub used in development and tests. Produces a small set of
 * obvious insights from the snapshot without calling any external LLM.
 * It exists so the rest of the pipeline (storage, endpoints, frontend)
 * can be developed and tested without an API key.
 */
@Component
@ConditionalOnProperty(prefix = "nutrition.coach", name = "provider", havingValue = "openai-stub", matchIfMissing = true)
public class StubCoachInsightProvider implements CoachInsightProvider {

    @Override
    public List<InsightDraft> generate(CoachSnapshotResponse snapshot, List<PastInsight> history, String locale) {
        List<InsightDraft> out = new ArrayList<>();
        var totals = snapshot.totals();
        if (totals.loggedDays() < 3) {
            return out;
        }

        if (totals.noOverrunStreakDays() >= 3) {
            out.add(new InsightDraft(
                "behavioral",
                "Streak holding strong",
                totals.noOverrunStreakDays() + " days within target — keep the rhythm.",
                "totals.noOverrunStreakDays = " + totals.noOverrunStreakDays()
            ));
        }

        if (totals.daysOverTarget() >= 3 && totals.daysOverTarget() > totals.daysInZone()) {
            out.add(new InsightDraft(
                "behavioral",
                "Overruns piling up",
                "Over target on " + totals.daysOverTarget() + " of " + totals.loggedDays() + " logged days. Look at your dinners.",
                "totals.daysOverTarget = " + totals.daysOverTarget()
            ));
        }

        var timing = snapshot.mealTiming();
        if (timing != null && timing.lateMealsCount() >= 3) {
            out.add(new InsightDraft(
                "timing",
                "Late-night eating pattern",
                timing.lateMealsCount() + " meals after 21:00 this window. Eating earlier may help recovery.",
                "mealTiming.lateMealsCount = " + timing.lateMealsCount()
            ));
        }

        return out.size() > 3 ? out.subList(0, 3) : out;
    }

    @Override
    public WeeklyRecapDraft generateWeeklyRecap(CoachSnapshotResponse snapshot, List<PastInsight> history, String locale) {
        var totals = snapshot.totals();
        if (totals.loggedDays() < 3) return null;

        Integer avg = totals.avgConsumedKcal();
        int over = totals.daysOverTarget();
        int zone = totals.daysInZone();
        int streak = totals.noOverrunStreakDays();

        var highlight = new WeeklyRecapDraft.Section(
            "Logged " + totals.loggedDays() + "/7 days",
            "Streak inside target: " + streak + " days. Average " + (avg != null ? avg : 0) + " kcal/day."
        );

        Double delta = snapshot.weightTrend() != null ? snapshot.weightTrend().deltaKg() : null;
        var trend = new WeeklyRecapDraft.Section(
            "Weight " + (delta != null && delta < 0 ? "down " + String.format("%.1f", Math.abs(delta)) + " kg" :
                          delta != null && delta > 0 ? "up " + String.format("%.1f", delta) + " kg" : "steady"),
            "In-zone days: " + zone + " of " + totals.loggedDays() + " logged."
        );

        var challenge = new WeeklyRecapDraft.Section(
            over >= 2 ? "Over target on " + over + " days" : "Stayed under target",
            over >= 2
                ? "Max overrun was " + (totals.maxOverrunKcal() != null ? totals.maxOverrunKcal() : 0) + " kcal."
                : "No big overruns. Keep this rhythm."
        );

        var nextGoal = new WeeklyRecapDraft.Section(
            "Next week",
            "Hit at least " + Math.min(7, totals.loggedDays() + 1) + " logged days."
        );

        String share = "📊 Coach week: " + totals.loggedDays() + " logged · streak " + streak + " · "
            + (delta != null ? (delta < 0 ? Math.abs(delta) + " kg down" : delta > 0 ? delta + " kg up" : "steady") : "");

        return new WeeklyRecapDraft(highlight, trend, challenge, nextGoal, share);
    }

    @Override
    public String sourceTag() {
        return "stub";
    }
}
