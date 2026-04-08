package com.aiduparc.nutrition.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
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
        entity.setFatGrams(new BigDecimal("52.00"));
        entity.setFiberGrams(new BigDecimal("24.00"));

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(entity));

        TodaySummaryResponse summary = service.getTodaySummary(userId, entryDate);

        assertThat(summary.consumedCalories()).isEqualByComparingTo("1640.00");
        assertThat(summary.dailyTargetCalories()).isEqualByComparingTo("2100.00");
        assertThat(summary.remainingCalories()).isEqualByComparingTo("460.00");
        assertThat(summary.proteinGrams()).isEqualByComparingTo("108.00");
        assertThat(summary.fatGrams()).isEqualByComparingTo("52.00");
        assertThat(summary.fiberGrams()).isEqualByComparingTo("24.00");
    }

    @Test
    void getStatisticsReturnsDerivedBalanceForRange() {
        UUID userId = UUID.randomUUID();
        LocalDate fromDate = LocalDate.of(2026, 4, 1);
        LocalDate toDate = LocalDate.of(2026, 4, 2);

        DailyNutritionEntryEntity first = new DailyNutritionEntryEntity();
        first.setId(UUID.randomUUID());
        first.setUserId(userId);
        first.setEntryDate(fromDate);
        first.setCaloriesConsumedKcal(new BigDecimal("1800.00"));
        first.setCalorieTargetKcal(new BigDecimal("2000.00"));
        first.setProteinGrams(new BigDecimal("110.00"));
        first.setFatGrams(new BigDecimal("60.00"));
        first.setFiberGrams(new BigDecimal("20.00"));

        DailyNutritionEntryEntity second = new DailyNutritionEntryEntity();
        second.setId(UUID.randomUUID());
        second.setUserId(userId);
        second.setEntryDate(toDate);
        second.setCaloriesConsumedKcal(new BigDecimal("2150.00"));
        second.setCalorieTargetKcal(new BigDecimal("2000.00"));
        second.setProteinGrams(new BigDecimal("125.00"));
        second.setFatGrams(new BigDecimal("72.00"));
        second.setFiberGrams(new BigDecimal("24.00"));

        when(repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, fromDate, toDate))
            .thenReturn(java.util.List.of(first, second));
        when(repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, LocalDate.of(2026, 3, 27), toDate))
            .thenReturn(java.util.List.of(first, second));
        when(repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, LocalDate.of(2026, 4, 1), toDate))
            .thenReturn(java.util.List.of(first, second));

        NutritionStatisticsResponse response = service.getStatistics(userId, fromDate, toDate);

        assertThat(response.points()).hasSize(2);
        assertThat(response.points().get(0).calorieBalance()).isEqualByComparingTo("-200.00");
        assertThat(response.points().get(1).calorieBalance()).isEqualByComparingTo("150.00");
        assertThat(response.weeklySummary().calorieBalance()).isEqualByComparingTo("-10050.00");
        assertThat(response.monthlySummary().calorieBalance()).isEqualByComparingTo("-50.00");
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
        existing.setFatGrams(new BigDecimal("35.00"));
        existing.setFiberGrams(new BigDecimal("18.00"));
        existing.setNotes("breakfast");

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(existing));
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var saved = service.addToDailyTotals(new NutritionHistoryService.AddToDailyTotalsCommand(
            userId,
            entryDate,
            new BigDecimal("560.00"),
            new BigDecimal("30.00"),
            new BigDecimal("17.00"),
            new BigDecimal("8.00"),
            "lunch"
        ));

        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("1760.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("110.00");
        assertThat(saved.fatGrams()).isEqualByComparingTo("52.00");
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
            null,
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
            null,
            new BigDecimal("24.00"),
            "corrected"
        );

        var saved = service.upsert(command);

        assertThat(saved.id()).isEqualTo(existing.getId());
        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("2050.00");
        assertThat(saved.notes()).isEqualTo("corrected");
    }
}
