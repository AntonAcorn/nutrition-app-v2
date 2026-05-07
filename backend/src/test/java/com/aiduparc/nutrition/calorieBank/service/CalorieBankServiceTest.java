package com.aiduparc.nutrition.calorieBank.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiduparc.nutrition.calorieBank.service.CalorieBankService.DailyDelta;
import java.util.List;
import org.junit.jupiter.api.Test;

class CalorieBankServiceTest {

    private static final int DAILY_CAP = 300;
    private static final int BANK_MAX = 2000;

    @Test
    void emptyHistoryGivesZero() {
        int bank = CalorieBankService.simulateBank(List.of(), DAILY_CAP, BANK_MAX);
        assertThat(bank).isZero();
    }

    @Test
    void unloggedDaysContributeNothing() {
        List<DailyDelta> days = List.of(
            DailyDelta.notLogged(),
            DailyDelta.notLogged(),
            DailyDelta.notLogged()
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX)).isZero();
    }

    @Test
    void smallDailyDeficitsAccumulate() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1800, false),
            DailyDelta.logged(2000, 1850, false),
            DailyDelta.logged(2000, 1900, false)
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX))
            .isEqualTo(200 + 150 + 100);
    }

    @Test
    void dailyDepositCappedByDailyCap() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1000, false), // delta = 1000, capped to 300
            DailyDelta.logged(2000, 800, false)   // delta = 1200, capped to 300
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX)).isEqualTo(600);
    }

    @Test
    void totalBankCappedAtBankMax() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1700, false),
            DailyDelta.logged(2000, 1700, false),
            DailyDelta.logged(2000, 1700, false),
            DailyDelta.logged(2000, 1700, false),
            DailyDelta.logged(2000, 1700, false),
            DailyDelta.logged(2000, 1700, false),
            DailyDelta.logged(2000, 1700, false)
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX))
            .isEqualTo(BANK_MAX);
    }

    @Test
    void overrunsAreDeductedFromBank() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1800, false), // +200
            DailyDelta.logged(2000, 1700, false), // +300 (capped)
            DailyDelta.logged(2000, 2200, false)  // -200 → 300
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX)).isEqualTo(300);
    }

    @Test
    void hugeOverrunIsClampedAtZero() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1800, false), // +200
            DailyDelta.logged(2000, 4000, false)  // -2000 → 0, not negative
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX)).isZero();
    }

    @Test
    void relaxDaysAreSkipped() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1800, false), // +200
            DailyDelta.logged(2000, 4000, true),  // RELAX — no impact
            DailyDelta.logged(2000, 1850, false)  // +150 → 350
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX)).isEqualTo(350);
    }

    @Test
    void mixedRealisticWeek() {
        List<DailyDelta> days = List.of(
            DailyDelta.logged(2000, 1800, false), // +200 → 200
            DailyDelta.logged(2000, 1900, false), // +100 → 300
            DailyDelta.notLogged(),               // skip
            DailyDelta.logged(2000, 2050, false), // -50 → 250
            DailyDelta.logged(2000, 1700, false), // +300 → 550
            DailyDelta.logged(2000, 2400, true),  // relax — skip
            DailyDelta.logged(2000, 1850, false)  // +150 → 700
        );
        assertThat(CalorieBankService.simulateBank(days, DAILY_CAP, BANK_MAX)).isEqualTo(700);
    }
}
