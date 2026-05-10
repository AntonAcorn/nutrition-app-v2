package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.calorieBank.model.RelaxDayEntity;
import com.aiduparc.nutrition.calorieBank.repository.RelaxDayRepository;
import com.aiduparc.nutrition.history.api.NutritionBalanceSummaryResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsPointResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.service.UserProfileService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only computations over daily nutrition history. Produces the
 * today summary (calorie ring + streak + trends) and the multi-day
 * statistics response (chart data + balance summaries).
 */
@Service
@Transactional(readOnly = true)
public class NutritionStatisticsCalculator {

    private static final Logger log = LoggerFactory.getLogger(NutritionStatisticsCalculator.class);
    private static final BigDecimal DEFAULT_DAILY_TARGET_KCAL = BigDecimal.valueOf(2000);

    private final DailyNutritionEntryRepository repository;
    private final UserProfileService userProfileService;
    private final RelaxDayRepository relaxDayRepository;

    public NutritionStatisticsCalculator(
            DailyNutritionEntryRepository repository,
            UserProfileService userProfileService,
            RelaxDayRepository relaxDayRepository
    ) {
        this.repository = repository;
        this.userProfileService = userProfileService;
        this.relaxDayRepository = relaxDayRepository;
    }

    public TodaySummaryResponse getTodaySummary(UUID userId, LocalDate entryDate) {
        DailyNutritionEntrySnapshot snapshot = getOrCreateEmptySnapshot(userId, entryDate);

        BigDecimal consumedCalories = defaultBigDecimal(snapshot.caloriesConsumedKcal());
        BigDecimal dailyTargetCalories = resolveAdaptiveTarget(userId, snapshot.weightKg());
        BigDecimal remainingCalories = dailyTargetCalories.subtract(consumedCalories).max(BigDecimal.ZERO);
        UserProfileService.MacroTargets macroTargets = userProfileService.getMacroTargets(userId);

        int waterGoalGlasses = userProfileService.getWaterGoal(userId);
        BigDecimal targetWeightKg = userProfileService.getTargetWeightKg(userId).orElse(null);
        BigDecimal startingWeightKg = userProfileService.findByNutritionUserId(userId)
            .map(p -> p.getStartingWeightKg())
            .orElse(null);

        int loggingStreakDays = calculateLoggingStreak(userId, entryDate, consumedCalories);
        BigDecimal weightTrend7d = calculateWeightTrend7d(userId, entryDate, snapshot.weightKg());

        TodaySummaryResponse response = new TodaySummaryResponse(
            userId,
            entryDate,
            snapshot.weightKg(),
            snapshot.weightUpdatedAt(),
            consumedCalories,
            dailyTargetCalories,
            remainingCalories,
            defaultBigDecimal(snapshot.proteinGrams()),
            defaultBigDecimal(snapshot.fatGrams()),
            defaultBigDecimal(snapshot.fiberGrams()),
            defaultBigDecimal(snapshot.carbsGrams()),
            macroTargets.proteinG(),
            macroTargets.fatG(),
            macroTargets.carbsG(),
            macroTargets.fiberG(),
            snapshot.waterGlasses(),
            waterGoalGlasses,
            targetWeightKg,
            startingWeightKg,
            loggingStreakDays,
            weightTrend7d
        );

        log.info(
            "today-summary resolved userId={} entryDate={} calories={} target={} protein={} fat={} fiber={}",
            userId,
            entryDate,
            response.consumedCalories(),
            response.dailyTargetCalories(),
            response.proteinGrams(),
            response.fatGrams(),
            response.fiberGrams()
        );

        return response;
    }

    public NutritionStatisticsResponse getStatistics(UUID userId, LocalDate fromInclusive, LocalDate toInclusive) {
        List<DailyNutritionEntrySnapshot> selectedSnapshots = findRange(userId, fromInclusive, toInclusive);

        List<NutritionStatisticsPointResponse> points = completeRangeWithMissingDays(userId, selectedSnapshots, fromInclusive, toInclusive).stream()
            .map(snapshot -> new NutritionStatisticsPointResponse(
                snapshot.entryDate(),
                roundToSingleDecimal(snapshot.weightKg()),
                defaultBigDecimal(snapshot.caloriesConsumedKcal()),
                defaultTarget(snapshot.calorieTargetKcal(), userId),
                defaultBigDecimal(snapshot.caloriesConsumedKcal()).subtract(defaultTarget(snapshot.calorieTargetKcal(), userId)),
                defaultBigDecimal(snapshot.proteinGrams()),
                defaultBigDecimal(snapshot.fatGrams()),
                defaultBigDecimal(snapshot.fiberGrams()),
                defaultBigDecimal(snapshot.carbsGrams())
            ))
            .toList();

        LocalDate weeklyFrom = toInclusive.minusDays(6);
        LocalDate monthlyFrom = YearMonth.from(toInclusive).atDay(1);

        List<DailyNutritionEntrySnapshot> weeklySnapshots = findRange(userId, weeklyFrom, toInclusive);
        List<DailyNutritionEntrySnapshot> monthlySnapshots = findRange(userId, monthlyFrom, toInclusive);

        NutritionBalanceSummaryResponse selectedPeriodSummary = summarizeBalance(selectedSnapshots, fromInclusive, toInclusive, userId);
        NutritionBalanceSummaryResponse weeklySummary = summarizeBalance(weeklySnapshots, weeklyFrom, toInclusive, userId);
        NutritionBalanceSummaryResponse monthlySummary = summarizeBalance(monthlySnapshots, monthlyFrom, toInclusive, userId);

        BigDecimal targetWeightKg = userProfileService.getTargetWeightKg(userId).orElse(null);

        return new NutritionStatisticsResponse(
            userId,
            fromInclusive,
            toInclusive,
            selectedPeriodSummary,
            weeklySummary,
            monthlySummary,
            averageWeight(weeklySnapshots),
            averageWeight(monthlySnapshots),
            targetWeightKg,
            points
        );
    }

    private List<DailyNutritionEntrySnapshot> findRange(UUID userId, LocalDate from, LocalDate to) {
        return repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, from, to)
            .stream()
            .map(DailyNutritionEntrySnapshot::fromEntity)
            .toList();
    }

    private DailyNutritionEntrySnapshot getOrCreateEmptySnapshot(UUID userId, LocalDate entryDate) {
        return repository.findByUserIdAndEntryDate(userId, entryDate)
            .map(DailyNutritionEntrySnapshot::fromEntity)
            .orElseGet(() -> new DailyNutritionEntrySnapshot(
                null, userId, entryDate,
                null, null, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                0, null, null, null
            ));
    }

    private BigDecimal calculateWeightTrend7d(UUID userId, LocalDate today, BigDecimal currentWeight) {
        if (currentWeight == null) return null;
        List<DailyNutritionEntrySnapshot> week = findRange(userId, today.minusDays(7), today.minusDays(1));
        return week.stream()
            .filter(s -> s.weightKg() != null)
            .max(Comparator.comparing(DailyNutritionEntrySnapshot::entryDate))
            .map(s -> currentWeight.subtract(s.weightKg()).setScale(1, RoundingMode.HALF_UP))
            .orElse(null);
    }

    private int calculateLoggingStreak(UUID userId, LocalDate today, BigDecimal todayCalories) {
        LocalDate endDate = todayCalories.compareTo(BigDecimal.ZERO) > 0 ? today : today.minusDays(1);
        LocalDate windowStart = endDate.minusDays(89);
        List<DailyNutritionEntrySnapshot> recent = findRange(userId, windowStart, endDate);
        Set<LocalDate> loggedDates = recent.stream()
            .filter(s -> s.caloriesConsumedKcal() != null && s.caloriesConsumedKcal().compareTo(BigDecimal.ZERO) > 0)
            .map(DailyNutritionEntrySnapshot::entryDate)
            .collect(Collectors.toSet());
        // Relax days count as "streak holds" even with no log — the product promise.
        Set<LocalDate> relaxDates = new HashSet<>();
        relaxDayRepository.findByUserIdAndRelaxDateBetween(userId, windowStart, endDate)
            .stream().map(RelaxDayEntity::getRelaxDate).forEach(relaxDates::add);
        int streak = 0;
        LocalDate current = endDate;
        while (loggedDates.contains(current) || relaxDates.contains(current)) {
            streak++;
            current = current.minusDays(1);
        }
        return streak;
    }

    private static List<DailyNutritionEntrySnapshot> completeRangeWithMissingDays(
        UUID userId,
        List<DailyNutritionEntrySnapshot> snapshots,
        LocalDate fromInclusive,
        LocalDate toInclusive
    ) {
        Map<LocalDate, DailyNutritionEntrySnapshot> snapshotsByDate = new HashMap<>();
        for (DailyNutritionEntrySnapshot s : snapshots) {
            snapshotsByDate.put(s.entryDate(), s);
        }

        List<DailyNutritionEntrySnapshot> completed = new ArrayList<>();
        for (LocalDate cursor = fromInclusive; !cursor.isAfter(toInclusive); cursor = cursor.plusDays(1)) {
            DailyNutritionEntrySnapshot existing = snapshotsByDate.get(cursor);
            if (existing != null) {
                completed.add(existing);
                continue;
            }
            completed.add(new DailyNutritionEntrySnapshot(
                null, userId, cursor,
                null, null, null, null, null, null, null, null, 0, null, null, null
            ));
        }
        return completed;
    }

    private NutritionBalanceSummaryResponse summarizeBalance(
        List<DailyNutritionEntrySnapshot> snapshots,
        LocalDate fromInclusive,
        LocalDate toInclusive,
        UUID userId
    ) {
        BigDecimal consumed = snapshots.stream()
            .map(snapshot -> defaultBigDecimal(snapshot.caloriesConsumedKcal()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<LocalDate, DailyNutritionEntrySnapshot> byDate = new HashMap<>();
        for (DailyNutritionEntrySnapshot s : snapshots) byDate.put(s.entryDate(), s);
        BigDecimal target = BigDecimal.ZERO;
        BigDecimal defaultTarget = resolvedDefaultTarget(userId);
        for (LocalDate cursor = fromInclusive; !cursor.isAfter(toInclusive); cursor = cursor.plusDays(1)) {
            DailyNutritionEntrySnapshot snapshot = byDate.get(cursor);
            BigDecimal dayTarget = snapshot != null
                ? defaultTarget(snapshot.calorieTargetKcal(), userId)
                : defaultTarget;
            target = target.add(dayTarget);
        }

        return new NutritionBalanceSummaryResponse(consumed, target, consumed.subtract(target));
    }

    private static BigDecimal averageWeight(List<DailyNutritionEntrySnapshot> snapshots) {
        List<BigDecimal> weights = snapshots.stream()
            .map(DailyNutritionEntrySnapshot::weightKg)
            .filter(value -> value != null)
            .toList();

        if (weights.isEmpty()) {
            return null;
        }

        BigDecimal total = weights.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(weights.size()), 1, RoundingMode.HALF_UP);
    }

    private BigDecimal resolvedDefaultTarget(UUID userId) {
        return userProfileService.findByNutritionUserId(userId)
            .map(p -> p.getDailyCalorieTargetKcal())
            .orElse(DEFAULT_DAILY_TARGET_KCAL);
    }

    private BigDecimal defaultTarget(BigDecimal value, UUID userId) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            return resolvedDefaultTarget(userId);
        }
        return value;
    }

    private BigDecimal resolveAdaptiveTarget(UUID userId, BigDecimal currentWeightKg) {
        return userProfileService.findByNutritionUserId(userId)
            .map(profile -> currentWeightKg != null
                ? userProfileService.getAdaptiveCalorieTarget(profile, currentWeightKg)
                : profile.getDailyCalorieTargetKcal())
            .orElse(DEFAULT_DAILY_TARGET_KCAL);
    }

    private static BigDecimal defaultBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal roundToSingleDecimal(BigDecimal value) {
        return value == null ? null : value.setScale(1, RoundingMode.HALF_UP);
    }
}
