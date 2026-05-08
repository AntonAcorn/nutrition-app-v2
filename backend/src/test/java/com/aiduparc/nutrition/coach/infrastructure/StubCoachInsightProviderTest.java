package com.aiduparc.nutrition.coach.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.BankStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.MacroAvg;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.MacroTargets;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.MealTiming;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.PriorWindow;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Profile;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.RelaxDayStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Totals;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.WeightTrend;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.WellbeingStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Window;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StubCoachInsightProviderTest {

    private final StubCoachInsightProvider provider = new StubCoachInsightProvider();

    @Test
    void returnsEmptyWhenLoggedDaysBelowMinimum() {
        var snapshot = snapshot(totals(2, 0, 0, 0, 0));

        var result = provider.generate(snapshot, List.of(), "en");

        assertThat(result).isEmpty();
    }

    @Test
    void emitsStreakInsightWhenNoOverrunStreakIsHealthy() {
        var snapshot = snapshot(totals(7, 5, 0, 0, 0)); // 7 logged days, streak=5

        var result = provider.generate(snapshot, List.of(), "en");

        assertThat(result).extracting(CoachInsightProvider.InsightDraft::title)
            .anyMatch(t -> t.toLowerCase().contains("streak"));
    }

    @Test
    void emitsOverrunInsightWhenOverrunsDominate() {
        // 6 logged days, daysOver=4 > daysInZone=1, streak=0
        var snapshot = snapshot(new Totals(
            6,        // loggedDays
            2200,     // avgConsumedKcal
            new MacroAvg(110, 80, 250, 22),
            4,        // daysOverTarget
            1,        // daysUnderTarget
            1,        // daysInZone
            450,      // maxOverrun
            null,
            0,        // loggingStreak
            0         // noOverrunStreak
        ));

        var result = provider.generate(snapshot, List.of(), "en");

        assertThat(result).extracting(CoachInsightProvider.InsightDraft::title)
            .anyMatch(t -> t.toLowerCase().contains("overrun"));
    }

    @Test
    void emitsTimingInsightWhenLateMealsPileUp() {
        var snapshot = withTiming(snapshot(totals(5, 0, 0, 0, 0)), 4);

        var result = provider.generate(snapshot, List.of(), "en");

        assertThat(result).extracting(CoachInsightProvider.InsightDraft::kind)
            .anyMatch("timing"::equals);
    }

    @Test
    void capsResultAtThreeCards() {
        // Trigger all three branches at once
        var snapshot = withTiming(snapshot(new Totals(
            7, 2200,
            new MacroAvg(110, 80, 250, 22),
            5, 1, 1,
            500, null,
            0, 4
        )), 5);

        var result = provider.generate(snapshot, List.of(), "en");

        assertThat(result).hasSizeLessThanOrEqualTo(3);
    }

    @Test
    void sourceTagIsStub() {
        assertThat(provider.sourceTag()).isEqualTo("stub");
    }

    // ── helpers ──

    private static Totals totals(int loggedDays, int noOverrunStreak, int daysOver, int daysUnder, int daysInZone) {
        return new Totals(
            loggedDays,
            loggedDays > 0 ? 1800 : null,
            new MacroAvg(100, 60, 200, 25),
            daysOver, daysUnder, daysInZone,
            null, null,
            0, noOverrunStreak
        );
    }

    private static CoachSnapshotResponse snapshot(Totals totals) {
        return new CoachSnapshotResponse(
            new Profile("Anton", "lose", "optimal", "moderately_active", 30, "male",
                1800, new MacroTargets(120, 60, 200, 30), 82.0, 75.0),
            new Window(7, LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 7)),
            totals,
            new PriorWindow(0, null, new MacroAvg(null, null, null, null), 0),
            Map.of(),
            Map.of(),
            new MealTiming(8, 19, 0, 0),
            new WeightTrend(82.0, 81.5, -0.5, 6.5),
            new BankStat(0, 0, 0),
            new RelaxDayStat(0, 0, 2),
            new WellbeingStat(0, null, Map.of(), Map.of()),
            List.of(),
            null,
            null,
            List.of()
        );
    }

    private static CoachSnapshotResponse withTiming(CoachSnapshotResponse base, int lateCount) {
        return new CoachSnapshotResponse(
            base.profile(), base.window(), base.totals(),
            base.priorWindow(), base.byDayOfWeek(), base.bySlot(),
            new MealTiming(8, 22, lateCount, 0),
            base.weightTrend(), base.bank(),
            base.relaxDays(), base.wellbeing(), base.topMeals(),
            base.bestDay(), base.worstDay(), base.recentMeals()
        );
    }
}
