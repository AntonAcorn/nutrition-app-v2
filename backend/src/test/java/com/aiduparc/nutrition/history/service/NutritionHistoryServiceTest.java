package com.aiduparc.nutrition.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.history.api.TodaySummaryResponse;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NutritionHistoryServiceTest {

    @Mock
    private DailyNutritionEntryRepository repository;

    @InjectMocks
    private NutritionHistoryService service;

    @Test
    void getTodaySummaryReturnsPersistedValues() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);
        DailyNutritionEntryEntity entity = new DailyNutritionEntryEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(userId);
        entity.setEntryDate(entryDate);
        entity.setCaloriesConsumedKcal(new BigDecimal("1640.00"));
        entity.setCalorieTargetKcal(new BigDecimal("2100.00"));
        entity.setProteinGrams(new BigDecimal("108.00"));
        entity.setFiberGrams(new BigDecimal("24.00"));

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(entity));

        TodaySummaryResponse summary = service.getTodaySummary(userId, entryDate);

        assertThat(summary.consumedCalories()).isEqualByComparingTo("1640.00");
        assertThat(summary.dailyTargetCalories()).isEqualByComparingTo("2100.00");
        assertThat(summary.remainingCalories()).isEqualByComparingTo("460.00");
        assertThat(summary.proteinGrams()).isEqualByComparingTo("108.00");
        assertThat(summary.fiberGrams()).isEqualByComparingTo("24.00");
    }

    @Test
    void addToDailyTotalsAccumulatesExistingDayValues() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);
        DailyNutritionEntryEntity existing = new DailyNutritionEntryEntity();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setEntryDate(entryDate);
        existing.setCaloriesConsumedKcal(new BigDecimal("1200.00"));
        existing.setCalorieTargetKcal(new BigDecimal("2100.00"));
        existing.setProteinGrams(new BigDecimal("80.00"));
        existing.setFiberGrams(new BigDecimal("18.00"));
        existing.setNotes("breakfast");

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(existing));
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var saved = service.addToDailyTotals(new NutritionHistoryService.AddToDailyTotalsCommand(
            userId,
            entryDate,
            new BigDecimal("560.00"),
            new BigDecimal("30.00"),
            new BigDecimal("8.00"),
            "lunch"
        ));

        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("1760.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("110.00");
        assertThat(saved.fiberGrams()).isEqualByComparingTo("26.00");
        assertThat(saved.notes()).isEqualTo("breakfast\nlunch");
    }

    @Test
    void upsertCreatesNewEntryWhenDateIsMissing() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 5);

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.empty());
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> {
            DailyNutritionEntryEntity entity = invocation.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        NutritionHistoryService.UpsertDailyNutritionEntryCommand command = new NutritionHistoryService.UpsertDailyNutritionEntryCommand(
            userId,
            entryDate,
            new BigDecimal("2200.00"),
            new BigDecimal("2500.00"),
            new BigDecimal("82.10"),
            new BigDecimal("165.00"),
            new BigDecimal("27.00"),
            "imported from sheet"
        );

        var saved = service.upsert(command);

        ArgumentCaptor<DailyNutritionEntryEntity> entityCaptor = ArgumentCaptor.forClass(DailyNutritionEntryEntity.class);
        verify(repository).save(entityCaptor.capture());
        DailyNutritionEntryEntity persisted = entityCaptor.getValue();

        assertThat(persisted.getUserId()).isEqualTo(userId);
        assertThat(persisted.getEntryDate()).isEqualTo(entryDate);
        assertThat(persisted.getCaloriesConsumedKcal()).isEqualByComparingTo("2200.00");
        assertThat(saved.calorieBalanceKcal()).contains(new BigDecimal("300.00"));
    }

    @Test
    void upsertUpdatesExistingEntryForSameUserAndDate() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 5);
        DailyNutritionEntryEntity existing = new DailyNutritionEntryEntity();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setEntryDate(entryDate);
        existing.setCaloriesConsumedKcal(new BigDecimal("1800.00"));
        existing.setNotes("old");

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(existing));
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NutritionHistoryService.UpsertDailyNutritionEntryCommand command = new NutritionHistoryService.UpsertDailyNutritionEntryCommand(
            userId,
            entryDate,
            new BigDecimal("2050.00"),
            null,
            null,
            new BigDecimal("140.00"),
            new BigDecimal("24.00"),
            "corrected"
        );

        var saved = service.upsert(command);

        assertThat(saved.id()).isEqualTo(existing.getId());
        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("2050.00");
        assertThat(saved.notes()).isEqualTo("corrected");
    }
}
