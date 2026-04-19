package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.api.NutritionBalanceSummaryResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsPointResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.user.service.UserProfileService;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NutritionHistoryService {

    private static final Logger log = LoggerFactory.getLogger(NutritionHistoryService.class);
    private static final BigDecimal DEFAULT_DAILY_TARGET_KCAL = BigDecimal.valueOf(2000);

    private final DailyNutritionEntryRepository repository;
    private final UserProfileService userProfileService;
    private final TelegramNotificationService telegramNotificationService;

    public NutritionHistoryService(
            DailyNutritionEntryRepository repository,
            UserProfileService userProfileService,
            TelegramNotificationService telegramNotificationService
    ) {
        this.repository = repository;
        this.userProfileService = userProfileService;
        this.telegramNotificationService = telegramNotificationService;
    }

    public Optional<DailyNutritionEntrySnapshot> findByUserAndDate(UUID userId, LocalDate entryDate) {
        return repository.findByUserIdAndEntryDate(userId, entryDate)
            .map(DailyNutritionEntrySnapshot::fromEntity);
    }

    public List<DailyNutritionEntrySnapshot> findByUserAndRange(UUID userId, LocalDate fromInclusive, LocalDate toInclusive) {
        return repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, fromInclusive, toInclusive)
            .stream()
            .map(DailyNutritionEntrySnapshot::fromEntity)
            .toList();
    }

    public TodaySummaryResponse getTodaySummary(UUID userId, LocalDate entryDate) {
        DailyNutritionEntrySnapshot snapshot = getOrCreateEmptySnapshot(userId, entryDate);

        BigDecimal consumedCalories = defaultBigDecimal(snapshot.caloriesConsumedKcal());
        BigDecimal dailyTargetCalories = defaultTarget(snapshot.calorieTargetKcal(), userId);
        BigDecimal remainingCalories = dailyTargetCalories.subtract(consumedCalories).max(BigDecimal.ZERO);

        TodaySummaryResponse response = new TodaySummaryResponse(
            userId,
            entryDate,
            snapshot.weightKg(),
            consumedCalories,
            dailyTargetCalories,
            remainingCalories,
            defaultBigDecimal(snapshot.proteinGrams()),
            defaultBigDecimal(snapshot.fatGrams()),
            defaultBigDecimal(snapshot.fiberGrams())
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
        List<DailyNutritionEntrySnapshot> selectedSnapshots = findByUserAndRange(userId, fromInclusive, toInclusive);

        List<NutritionStatisticsPointResponse> points = completeRangeWithMissingDays(userId, selectedSnapshots, fromInclusive, toInclusive).stream()
            .map(snapshot -> new NutritionStatisticsPointResponse(
                snapshot.entryDate(),
                roundToSingleDecimal(snapshot.weightKg()),
                defaultBigDecimal(snapshot.caloriesConsumedKcal()),
                defaultTarget(snapshot.calorieTargetKcal(), userId),
                defaultBigDecimal(snapshot.caloriesConsumedKcal()).subtract(defaultTarget(snapshot.calorieTargetKcal(), userId)),
                defaultBigDecimal(snapshot.proteinGrams()),
                defaultBigDecimal(snapshot.fatGrams()),
                defaultBigDecimal(snapshot.fiberGrams())
            ))
            .toList();

        LocalDate weeklyFrom = toInclusive.minusDays(6);
        LocalDate monthlyFrom = YearMonth.from(toInclusive).atDay(1);

        List<DailyNutritionEntrySnapshot> weeklySnapshots = findByUserAndRange(userId, weeklyFrom, toInclusive);
        List<DailyNutritionEntrySnapshot> monthlySnapshots = findByUserAndRange(userId, monthlyFrom, toInclusive);

        NutritionBalanceSummaryResponse selectedPeriodSummary = summarizeBalance(selectedSnapshots, fromInclusive, toInclusive, userId);
        NutritionBalanceSummaryResponse weeklySummary = summarizeBalance(weeklySnapshots, weeklyFrom, toInclusive, userId);
        NutritionBalanceSummaryResponse monthlySummary = summarizeBalance(monthlySnapshots, monthlyFrom, toInclusive, userId);

        return new NutritionStatisticsResponse(
            userId,
            fromInclusive,
            toInclusive,
            selectedPeriodSummary,
            weeklySummary,
            monthlySummary,
            averageWeight(weeklySnapshots),
            averageWeight(monthlySnapshots),
            points
        );
    }

    @Transactional
    public DailyNutritionEntrySnapshot updateWeight(UUID userId, LocalDate entryDate, BigDecimal weightKg) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(userId, entryDate);

        DailyNutritionEntrySnapshot result = upsert(new UpsertDailyNutritionEntryCommand(
            userId,
            entryDate,
            defaultBigDecimal(current.caloriesConsumedKcal()),
            current.calorieTargetKcal(),
            weightKg,
            current.proteinGrams(),
            current.fatGrams(),
            current.fiberGrams(),
            current.notes()
        ));
        telegramNotificationService.notifyActivity(userId, "weight update");
        return result;
    }

    @Transactional
    public DailyNutritionEntrySnapshot addToDailyTotals(AddToDailyTotalsCommand command) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(command.userId(), command.entryDate());

        DailyNutritionEntrySnapshot result = upsert(new UpsertDailyNutritionEntryCommand(
            command.userId(),
            command.entryDate(),
            defaultBigDecimal(current.caloriesConsumedKcal()).add(defaultBigDecimal(command.caloriesConsumedKcal())),
            current.calorieTargetKcal(),
            current.weightKg(),
            defaultBigDecimal(current.proteinGrams()).add(defaultBigDecimal(command.proteinGrams())),
            defaultBigDecimal(current.fatGrams()).add(defaultBigDecimal(command.fatGrams())),
            defaultBigDecimal(current.fiberGrams()).add(defaultBigDecimal(command.fiberGrams())),
            mergeNotes(current.notes(), command.notes())
        ));

        log.info(
            "daily-totals updated userId={} entryDate={} calories={} protein={} fat={} fiber={}",
            result.userId(),
            result.entryDate(),
            result.caloriesConsumedKcal(),
            result.proteinGrams(),
            result.fatGrams(),
            result.fiberGrams()
        );
        telegramNotificationService.notifyActivity(command.userId(), "added calories");
        return result;
    }

    @Transactional
    public DailyNutritionEntrySnapshot upsert(UpsertDailyNutritionEntryCommand command) {
        DailyNutritionEntryEntity entity = repository
            .findByUserIdAndEntryDate(command.userId(), command.entryDate())
            .orElseGet(DailyNutritionEntryEntity::new);

        entity.setUserId(command.userId());
        entity.setEntryDate(command.entryDate());
        entity.setWeightKg(command.weightKg());
        entity.setCaloriesConsumedKcal(command.caloriesConsumedKcal());
        entity.setCalorieTargetKcal(command.calorieTargetKcal());
        entity.setProteinGrams(command.proteinGrams());
        entity.setFatGrams(command.fatGrams());
        entity.setFiberGrams(command.fiberGrams());
        entity.setNotes(command.notes());

        DailyNutritionEntryEntity saved = repository.save(entity);
        return DailyNutritionEntrySnapshot.fromEntity(saved);
    }

    public record UpsertDailyNutritionEntryCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal calorieTargetKcal,
        BigDecimal weightKg,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams,
        String notes
    ) {
    }

    public record AddToDailyTotalsCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams,
        String notes
    ) {
    }

    private DailyNutritionEntrySnapshot getOrCreateEmptySnapshot(UUID userId, LocalDate entryDate) {
        return findByUserAndDate(userId, entryDate)
            .orElseGet(() -> new DailyNutritionEntrySnapshot(
                null,
                userId,
                entryDate,
                null,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null,
                null,
                null
            ));
    }

    private static BigDecimal defaultBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
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

    private static List<DailyNutritionEntrySnapshot> completeRangeWithMissingDays(
        UUID userId,
        List<DailyNutritionEntrySnapshot> snapshots,
        LocalDate fromInclusive,
        LocalDate toInclusive
    ) {
        java.util.Map<LocalDate, DailyNutritionEntrySnapshot> snapshotsByDate = snapshots.stream()
            .collect(java.util.stream.Collectors.toMap(DailyNutritionEntrySnapshot::entryDate, snapshot -> snapshot));

        java.util.List<DailyNutritionEntrySnapshot> completed = new java.util.ArrayList<>();

        for (LocalDate cursor = fromInclusive; !cursor.isAfter(toInclusive); cursor = cursor.plusDays(1)) {
            DailyNutritionEntrySnapshot existing = snapshotsByDate.get(cursor);
            if (existing != null) {
                completed.add(existing);
                continue;
            }

            completed.add(new DailyNutritionEntrySnapshot(
                null,
                userId,
                cursor,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
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

        BigDecimal target = BigDecimal.ZERO;
        for (LocalDate cursor = fromInclusive; !cursor.isAfter(toInclusive); cursor = cursor.plusDays(1)) {
            BigDecimal dayTarget = resolvedDefaultTarget(userId);
            for (DailyNutritionEntrySnapshot snapshot : snapshots) {
                if (snapshot.entryDate().equals(cursor)) {
                    dayTarget = defaultTarget(snapshot.calorieTargetKcal(), userId);
                    break;
                }
            }
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

    private static BigDecimal roundToSingleDecimal(BigDecimal value) {
        return value == null ? null : value.setScale(1, RoundingMode.HALF_UP);
    }

    private static String mergeNotes(String currentNotes, String incomingNotes) {
        if (incomingNotes == null || incomingNotes.isBlank()) {
            return currentNotes;
        }
        if (currentNotes == null || currentNotes.isBlank()) {
            return incomingNotes;
        }
        return currentNotes + "\n" + incomingNotes;
    }
}
