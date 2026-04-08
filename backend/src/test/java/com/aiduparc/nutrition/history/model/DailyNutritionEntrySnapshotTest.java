package com.aiduparc.nutrition.history.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DailyNutritionEntrySnapshotTest {

    @Test
    void calorieBalanceIsComputedFromTargetMinusConsumed() {
        DailyNutritionEntrySnapshot snapshot = new DailyNutritionEntrySnapshot(
            UUID.randomUUID(),
            UUID.randomUUID(),
            LocalDate.of(2026, 4, 5),
            new BigDecimal("82.40"),
            new BigDecimal("2100.00"),
            new BigDecimal("2400.00"),
            new BigDecimal("150.00"),
            new BigDecimal("70.00"),
            new BigDecimal("28.00"),
            "training day",
            OffsetDateTime.now(ZoneOffset.UTC),
            OffsetDateTime.now(ZoneOffset.UTC)
        );

        assertThat(snapshot.calorieBalanceKcal()).contains(new BigDecimal("300.00"));
    }

    @Test
    void calorieBalanceIsEmptyWhenTargetIsMissing() {
        DailyNutritionEntrySnapshot snapshot = new DailyNutritionEntrySnapshot(
            UUID.randomUUID(),
            UUID.randomUUID(),
            LocalDate.of(2026, 4, 5),
            null,
            new BigDecimal("2100.00"),
            null,
            null,
            null,
            null,
            null,
            OffsetDateTime.now(ZoneOffset.UTC),
            OffsetDateTime.now(ZoneOffset.UTC)
        );

        assertThat(snapshot.calorieBalanceKcal()).isEmpty();
    }
}
