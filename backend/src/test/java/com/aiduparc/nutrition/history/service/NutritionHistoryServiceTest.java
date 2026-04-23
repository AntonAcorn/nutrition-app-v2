package com.aiduparc.nutrition.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.user.service.UserProfileService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;

@ExtendWith(MockitoExtension.class)
class NutritionHistoryServiceTest {

    @Mock
    private DailyNutritionEntryRepository repository;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    @InjectMocks
    private NutritionHistoryService service;

    @BeforeEach
    void stubNoProfile() {
        lenient().when(userProfileService.findByNutritionUserId(any())).thenReturn(Optional.empty());
    }

    @Test
    void getTodaySummaryReturnsPersistedValues() {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);
        DailyNutritionEntryEntity entity = new DailyNutritionEntryEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(userId);
        entity.setEntryDate(entryDate);
        entity.setWeightKg(new BigDecimal("82.40"));
        entity.setCaloriesConsumedKcal(new BigDecimal("1640.00"));
        entity.setCalorieTargetKcal(BigDecimal.ZERO);
        entity.setProteinGrams(new BigDecimal("108.00"));
        entity.setFatGrams(new BigDecimal("52.00"));
        entity.setFiberGrams(new BigDecimal("24.00"));

        when(repository.findByUserIdAndEntryDate(userId, entryDate)).thenReturn(Optional.of(entity));

        TodaySummaryResponse summary = service.getTodaySummary(userId, entryDate);

        assertThat(summary.weightKg()).isEqualByComparingTo("82.40");
        assertThat(summary.consumedCalories()).isEqualByComparingTo("1640.00");
        assertThat(summary.dailyTargetCalories()).isEqualByComparingTo("2000.00");
        assertThat(summary.remainingCalories()).isEqualByComparingTo("360.00");
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
        first.setWeightKg(new BigDecimal("82.34"));
        first.setCaloriesConsumedKcal(new BigDecimal("1800.00"));
        first.setCalorieTargetKcal(new BigDecimal("2000.00"));
        first.setProteinGrams(new BigDecimal("110.00"));
        first.setFatGrams(new BigDecimal("60.00"));
        first.setFiberGrams(new BigDecimal("20.00"));

        DailyNutritionEntryEntity second = new DailyNutritionEntryEntity();
        second.setId(UUID.randomUUID());
        second.setUserId(userId);
        second.setEntryDate(toDate);
        second.setWeightKg(new BigDecimal("81.86"));
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
        assertThat(response.points().get(0).weightKg()).isEqualByComparingTo("82.3");
        assertThat(response.points().get(1).weightKg()).isEqualByComparingTo("81.9");
        assertThat(response.points().get(0).calorieBalance()).isEqualByComparingTo("-200.00");
        assertThat(response.points().get(1).calorieBalance()).isEqualByComparingTo("150.00");
        assertThat(response.weeklyAverageWeightKg()).isEqualByComparingTo("82.1");
        assertThat(response.monthlyAverageWeightKg()).isEqualByComparingTo("82.1");
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
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var saved = service.updateWeight(userId, entryDate, new BigDecimal("81.74"));

        assertThat(saved.weightKg()).isEqualByComparingTo("81.74");
        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("1800.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("120.00");
        assertThat(saved.notes()).isEqualTo("old");
    }

    @Test
    void getStatisticsIncludesTodayEvenWhenEntryIsMissing() {
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.of(2026, 4, 9);
        LocalDate yesterday = today.minusDays(1);

        DailyNutritionEntryEntity yesterdayEntry = new DailyNutritionEntryEntity();
        yesterdayEntry.setId(UUID.randomUUID());
        yesterdayEntry.setUserId(userId);
        yesterdayEntry.setEntryDate(yesterday);
        yesterdayEntry.setCaloriesConsumedKcal(new BigDecimal("1800.00"));
        yesterdayEntry.setCalorieTargetKcal(new BigDecimal("2000.00"));
        yesterdayEntry.setProteinGrams(new BigDecimal("120.00"));
        yesterdayEntry.setFatGrams(new BigDecimal("60.00"));
        yesterdayEntry.setFiberGrams(new BigDecimal("20.00"));

        when(repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, yesterday, today))
            .thenReturn(java.util.List.of(yesterdayEntry));
        when(repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, today.minusDays(6), today))
            .thenReturn(java.util.List.of(yesterdayEntry));
        when(repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, LocalDate.of(2026, 4, 1), today))
            .thenReturn(java.util.List.of(yesterdayEntry));

        NutritionStatisticsResponse response = service.getStatistics(userId, yesterday, today);

        assertThat(response.points()).hasSize(2);
        assertThat(response.points().get(0).entryDate()).isEqualTo(yesterday);
        assertThat(response.points().get(1).entryDate()).isEqualTo(today);
        assertThat(response.points().get(1).consumedCalories()).isEqualByComparingTo("0.00");
        assertThat(response.points().get(1).calorieTarget()).isEqualByComparingTo("2000.00");
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
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var saved = service.updateNutritionTotals(
            userId, entryDate,
            new BigDecimal("1200.00"),
            new BigDecimal("90.00"),
            new BigDecimal("40.00"),
            new BigDecimal("18.00")
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
        when(repository.save(any(DailyNutritionEntryEntity.class))).thenAnswer(invocation -> {
            DailyNutritionEntryEntity entity = invocation.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        var saved = service.updateNutritionTotals(
            userId, entryDate,
            new BigDecimal("900.00"),
            new BigDecimal("70.00"),
            new BigDecimal("30.00"),
            new BigDecimal("12.00")
        );

        assertThat(saved.caloriesConsumedKcal()).isEqualByComparingTo("900.00");
        assertThat(saved.proteinGrams()).isEqualByComparingTo("70.00");
        assertThat(saved.weightKg()).isNull();
    }
}
