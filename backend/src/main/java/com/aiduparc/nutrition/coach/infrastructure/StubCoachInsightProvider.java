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
    public List<InsightDraft> generate(CoachSnapshotResponse snapshot) {
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
    public String sourceTag() {
        return "stub";
    }
}
