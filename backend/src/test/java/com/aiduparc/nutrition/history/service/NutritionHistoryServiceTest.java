package com.aiduparc.nutrition.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.MealSlotEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.wellbeing.service.WellbeingService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests the daily-entry write operations owned by NutritionHistoryService:
 * addToDailyTotals, upsert, updateWeight, updateNutritionTotals.
 *
 * Statistics tests live in NutritionStatisticsCalculatorTest; meal-log
 * tests would live in MealLogServiceTest (not yet created — covered
 * indirectly by integration tests via controllers).
 */
@ExtendWith(MockitoExtension.class)
class NutritionHistoryServiceTest {

    @Mock private DailyNutritionEntryRepository repository;
    @Mock private TelegramNotificationService telegramNotificationService;
    @Mock private NutritionStatisticsCalculator statisticsCalculator;
    @Mock private MealLogService mealLogService;
    @Mock private WellbeingService wellbeingService;

    @InjectMocks private NutritionHistoryService service;

    @BeforeEach
    void stubMealLog() {
        // addToDailyTotals invokes mealLogService — return a stub slot so the
        // test focuses on the totals computation. Slot.id auto-generated; null is fine here.
        lenient().when(mealLogService.getOrCreateSlot(any(), any(), nullable(String.class))).thenReturn(new MealSlotEntity());
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
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var saved = service.addToDailyTotals(new NutritionHistoryService.AddToDailyTotalsCommand(
            userId, entryDate,
            new BigDecimal("560.00"),
            new BigDecimal("30.00"),
            new BigDecimal("17.00"),
            new BigDecimal("8.00"),
            null,
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
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(inv -> {
            DailyNutritionEntryEntity entity = inv.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        NutritionHistoryService.UpsertDailyNutritionEntryCommand command = new NutritionHistoryService.UpsertDailyNutritionEntryCommand(
            userId, entryDate,
            new BigDecimal("2200.00"),
            new BigDecimal("2500.00"),
            new BigDecimal("82.10"),
            new BigDecimal("165.00"),
            null,
            new BigDecimal("27.00"),
            null,
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
    void updateWeightPreservesExistingNutritionValues() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 5);
        DailyNutritionEntryEntity existing = new DailyNutritionEntryEntity();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setEntryDate(entryDate);
        existing.setCaloriesConsumedKcal(new BigDecimal("1800.00"));
        existing.setCalorieTargetKcal(new BigDecimal("2000.00"));
        existing.setProteinGrams(new BigDecimal("120.00"));
        existing.setFatGrams(new BigDecimal("60.00"));
        existing.setFiberGrams(new BigDecimal("20.00"));
        existing.setNotes("old");

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(existing));
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var saved = service.updateWeight(userId, entryDate, new BigDecimal("81.74"));

        assertThat(saved.weightKg()).isEqualByComparingTo("81.74");
        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("1800.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("120.00");
        assertThat(saved.notes()).isEqualTo("old");
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
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        NutritionHistoryService.UpsertDailyNutritionEntryCommand command = new NutritionHistoryService.UpsertDailyNutritionEntryCommand(
            userId, entryDate,
            new BigDecimal("2050.00"),
            null, null,
            new BigDecimal("140.00"),
            null,
            new BigDecimal("24.00"),
            null,
            "corrected"
        );

        var saved = service.upsert(command);

        assertThat(saved.id()).isEqualTo(existing.getId());
        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("2050.00");
        assertThat(saved.notes()).isEqualTo("corrected");
    }

    @Test
    void updateNutritionTotalsReplacesValuesAndPreservesWeightAndNotes() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 5);
        DailyNutritionEntryEntity existing = new DailyNutritionEntryEntity();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setEntryDate(entryDate);
        existing.setWeightKg(new BigDecimal("81.74"));
        existing.setCaloriesConsumedKcal(new BigDecimal("1800.00"));
        existing.setCalorieTargetKcal(new BigDecimal("2000.00"));
        existing.setProteinGrams(new BigDecimal("120.00"));
        existing.setFatGrams(new BigDecimal("60.00"));
        existing.setFiberGrams(new BigDecimal("20.00"));
        existing.setNotes("breakfast");

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(existing));
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var saved = service.updateNutritionTotals(
            userId, entryDate,
            new BigDecimal("1200.00"),
            new BigDecimal("90.00"),
            new BigDecimal("40.00"),
            new BigDecimal("18.00"),
            null
        );

        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("1200.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("90.00");
        assertThat(saved.fatGrams()).isEqualByComparingTo("40.00");
        assertThat(saved.fiberGrams()).isEqualByComparingTo("18.00");
        assertThat(saved.weightKg()).isEqualByComparingTo("81.74");
        assertThat(saved.notes()).isEqualTo("breakfast");
    }

    @Test
    void updateNutritionTotalsCreatesEntryWhenNoneExists() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 5);

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.empty());
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(inv -> {
            DailyNutritionEntryEntity entity = inv.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        var saved = service.updateNutritionTotals(
            userId, entryDate,
            new BigDecimal("900.00"),
            new BigDecimal("70.00"),
            new BigDecimal("30.00"),
            new BigDecimal("12.00"),
            null
        );

        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("900.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("70.00");
        assertThat(saved.weightKg()).isNull();
    }
}
