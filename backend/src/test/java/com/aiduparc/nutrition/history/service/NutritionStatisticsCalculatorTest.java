package com.aiduparc.nutrition.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.calorieBank.repository.RelaxDayRepository;
import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.service.UserProfileService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NutritionStatisticsCalculatorTest {

    @Mock private DailyNutritionEntryRepository repository;
    @Mock private UserProfileService userProfileService;
    @Mock private RelaxDayRepository relaxDayRepository;

    @InjectMocks private NutritionStatisticsCalculator calculator;

    @BeforeEach
    void stubNoProfile() {
        lenient().when(userProfileService.findByNutritionUserId(any())).thenReturn(Optional.empty());
        lenient().when(userProfileService.getMacroTargets(any())).thenReturn(UserProfileService.MacroTargets.DEFAULT);
        lenient().when(relaxDayRepository.findByUserIdAndRelaxDateBetween(any(), any(), any())).thenReturn(Collections.emptyList());
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

        TodaySummaryResponse summary = calculator.getTodaySummary(userId, entryDate);

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

        NutritionStatisticsResponse response = calculator.getStatistics(userId, fromDate, toDate);

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

        NutritionStatisticsResponse response = calculator.getStatistics(userId, yesterday, today);

        assertThat(response.points()).hasSize(2);
        assertThat(response.points().get(0).entryDate()).isEqualTo(yesterday);
        assertThat(response.points().get(1).entryDate()).isEqualTo(today);
        assertThat(response.points().get(1).consumedCalories()).isEqualByComparingTo("0.00");
        assertThat(response.points().get(1).calorieTarget()).isEqualByComparingTo("2000.00");
    }
}
