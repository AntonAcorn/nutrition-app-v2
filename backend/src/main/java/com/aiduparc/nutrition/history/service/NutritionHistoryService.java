package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.api.MealLogEntryResponse;
import com.aiduparc.nutrition.history.api.MealSlotResponse;
import com.aiduparc.nutrition.history.api.NutritionBalanceSummaryResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsPointResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import com.aiduparc.nutrition.history.model.MealSlotEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import com.aiduparc.nutrition.history.repository.MealSlotRepository;
import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.user.service.UserProfileService;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class NutritionHistoryService {

    private static final Logger log = LoggerFactory.getLogger(NutritionHistoryService.class);
    private static final BigDecimal DEFAULT_DAILY_TARGET_KCAL = BigDecimal.valueOf(2000);

    public static final String SLOT_BREAKFAST = "BREAKFAST";
    public static final String SLOT_LUNCH     = "LUNCH";
    public static final String SLOT_DINNER    = "DINNER";
    public static final String SLOT_SNACK     = "SNACK";

    private static final Map<String, Integer> SLOT_ORDER = Map.of(
        SLOT_BREAKFAST, 0,
        SLOT_LUNCH,     1,
        SLOT_DINNER,    2,
        SLOT_SNACK,     3
    );

    private final DailyNutritionEntryRepository repository;
    private final MealLogEntryRepository mealLogRepository;
    private final MealSlotRepository mealSlotRepository;
    private final UserProfileService userProfileService;
    private final TelegramNotificationService telegramNotificationService;

    public NutritionHistoryService(
            DailyNutritionEntryRepository repository,
            MealLogEntryRepository mealLogRepository,
            MealSlotRepository mealSlotRepository,
            UserProfileService userProfileService,
            TelegramNotificationService telegramNotificationService
    ) {
        this.repository = repository;
        this.mealLogRepository = mealLogRepository;
        this.mealSlotRepository = mealSlotRepository;
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
        BigDecimal dailyTargetCalories = resolveAdaptiveTarget(userId, snapshot.weightKg());
        BigDecimal remainingCalories = dailyTargetCalories.subtract(consumedCalories).max(BigDecimal.ZERO);
        UserProfileService.MacroTargets macroTargets = userProfileService.getMacroTargets(userId);

        int waterGoalGlasses = userProfileService.getWaterGoal(userId);
        BigDecimal targetWeightKg = userProfileService.getTargetWeightKg(userId).orElse(null);
        BigDecimal startingWeightKg = userProfileService.findByNutritionUserId(userId)
            .map(p -> p.getStartingWeightKg())
            .orElse(null);

        int loggingStreakDays = calculateLoggingStreak(userId, entryDate, consumedCalories);

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
            loggingStreakDays
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

    private int calculateLoggingStreak(UUID userId, LocalDate today, BigDecimal todayCalories) {
        LocalDate endDate = todayCalories.compareTo(BigDecimal.ZERO) > 0 ? today : today.minusDays(1);
        List<DailyNutritionEntrySnapshot> recent = findByUserAndRange(userId, endDate.minusDays(89), endDate);
        Set<LocalDate> loggedDates = recent.stream()
            .filter(s -> s.caloriesConsumedKcal() != null && s.caloriesConsumedKcal().compareTo(BigDecimal.ZERO) > 0)
            .map(DailyNutritionEntrySnapshot::entryDate)
            .collect(Collectors.toSet());
        int streak = 0;
        LocalDate current = endDate;
        while (loggedDates.contains(current)) {
            streak++;
            current = current.minusDays(1);
        }
        return streak;
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
                defaultBigDecimal(snapshot.fiberGrams()),
                defaultBigDecimal(snapshot.carbsGrams())
            ))
            .toList();

        LocalDate weeklyFrom = toInclusive.minusDays(6);
        LocalDate monthlyFrom = YearMonth.from(toInclusive).atDay(1);

        List<DailyNutritionEntrySnapshot> weeklySnapshots = findByUserAndRange(userId, weeklyFrom, toInclusive);
        List<DailyNutritionEntrySnapshot> monthlySnapshots = findByUserAndRange(userId, monthlyFrom, toInclusive);

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

    @Transactional
    public DailyNutritionEntrySnapshot updateWeight(UUID userId, LocalDate entryDate, BigDecimal weightKg) {
        DailyNutritionEntryEntity entity = repository
            .findByUserIdAndEntryDate(userId, entryDate)
            .orElseGet(DailyNutritionEntryEntity::new);

        if (entity.getUserId() == null) {
            entity.setUserId(userId);
            entity.setEntryDate(entryDate);
            entity.setCaloriesConsumedKcal(BigDecimal.ZERO);
            entity.setWaterGlasses(0);
        }

        entity.setWeightKg(weightKg);
        entity.setWeightUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        DailyNutritionEntryEntity saved = repository.save(entity);
        telegramNotificationService.notifyActivity(userId, "weight update");
        return DailyNutritionEntrySnapshot.fromEntity(saved);
    }

    @Transactional
    public DailyNutritionEntrySnapshot updateNutritionTotals(
            UUID userId,
            LocalDate entryDate,
            BigDecimal caloriesConsumedKcal,
            BigDecimal proteinGrams,
            BigDecimal fatGrams,
            BigDecimal fiberGrams,
            BigDecimal carbsGrams
    ) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(userId, entryDate);

        DailyNutritionEntrySnapshot result = upsert(new UpsertDailyNutritionEntryCommand(
            userId, entryDate, caloriesConsumedKcal,
            current.calorieTargetKcal(), current.weightKg(),
            proteinGrams, fatGrams, fiberGrams, carbsGrams,
            current.notes(), current.waterGlasses()
        ));
        telegramNotificationService.notifyActivity(userId, "nutrition totals update");
        return result;
    }

    @Transactional
    public void subtractFromDailyTotals(SubtractFromDailyTotalsCommand command) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(command.userId(), command.entryDate());

        upsert(new UpsertDailyNutritionEntryCommand(
            command.userId(), command.entryDate(),
            defaultBigDecimal(current.caloriesConsumedKcal()).subtract(defaultBigDecimal(command.caloriesConsumedKcal())).max(BigDecimal.ZERO),
            current.calorieTargetKcal(), current.weightKg(),
            defaultBigDecimal(current.proteinGrams()).subtract(defaultBigDecimal(command.proteinGrams())).max(BigDecimal.ZERO),
            defaultBigDecimal(current.fatGrams()).subtract(defaultBigDecimal(command.fatGrams())).max(BigDecimal.ZERO),
            defaultBigDecimal(current.fiberGrams()).subtract(defaultBigDecimal(command.fiberGrams())).max(BigDecimal.ZERO),
            defaultBigDecimal(current.carbsGrams()).subtract(defaultBigDecimal(command.carbsGrams())).max(BigDecimal.ZERO),
            current.notes(), current.waterGlasses()
        ));
    }

    public record SubtractFromDailyTotalsCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams,
        BigDecimal carbsGrams
    ) {}

    @Transactional
    public DailyNutritionEntrySnapshot addToDailyTotals(AddToDailyTotalsCommand command) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(command.userId(), command.entryDate());

        DailyNutritionEntrySnapshot result = upsert(new UpsertDailyNutritionEntryCommand(
            command.userId(), command.entryDate(),
            defaultBigDecimal(current.caloriesConsumedKcal()).add(defaultBigDecimal(command.caloriesConsumedKcal())),
            current.calorieTargetKcal(), current.weightKg(),
            defaultBigDecimal(current.proteinGrams()).add(defaultBigDecimal(command.proteinGrams())),
            defaultBigDecimal(current.fatGrams()).add(defaultBigDecimal(command.fatGrams())),
            defaultBigDecimal(current.fiberGrams()).add(defaultBigDecimal(command.fiberGrams())),
            defaultBigDecimal(current.carbsGrams()).add(defaultBigDecimal(command.carbsGrams())),
            mergeNotes(current.notes(), command.notes()), current.waterGlasses()
        ));

        saveMealLogEntry(command);

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

    public List<MealSlotResponse> getMealLog(UUID userId, LocalDate date) {
        List<MealSlotEntity> slots = mealSlotRepository.findByUserIdAndEntryDateOrderBySortOrderAsc(userId, date);
        List<MealLogEntryEntity> entries = mealLogRepository.findByUserIdAndEntryDateOrderByCreatedAtAsc(userId, date);

        Map<UUID, List<MealLogEntryResponse>> bySlot = new LinkedHashMap<>();
        for (MealSlotEntity slot : slots) {
            bySlot.put(slot.getId(), new ArrayList<>());
        }
        for (MealLogEntryEntity e : entries) {
            if (e.getMealSlotId() != null) {
                bySlot.computeIfAbsent(e.getMealSlotId(), k -> new ArrayList<>())
                    .add(toEntryResponse(e));
            }
        }

        return slots.stream()
            .filter(slot -> !bySlot.getOrDefault(slot.getId(), List.of()).isEmpty())
            .map(slot -> new MealSlotResponse(
                slot.getId(),
                slot.getSlotType(),
                slot.getSortOrder(),
                bySlot.get(slot.getId())
            ))
            .toList();
    }

    @Transactional
    public MealSlotEntity getOrCreateSlot(UUID userId, LocalDate date, String slotType) {
        String normalizedType = normalizeSlotType(slotType);
        return mealSlotRepository.findByUserIdAndEntryDateAndSlotType(userId, date, normalizedType)
            .orElseGet(() -> {
                MealSlotEntity slot = new MealSlotEntity();
                slot.setUserId(userId);
                slot.setEntryDate(date);
                slot.setSlotType(normalizedType);
                slot.setSortOrder(SLOT_ORDER.getOrDefault(normalizedType, 3));
                return mealSlotRepository.save(slot);
            });
    }

    private static String normalizeSlotType(String slotType) {
        if (slotType == null || slotType.isBlank()) return SLOT_SNACK;
        String upper = slotType.trim().toUpperCase();
        return SLOT_ORDER.containsKey(upper) ? upper : SLOT_SNACK;
    }

    private static MealLogEntryResponse toEntryResponse(MealLogEntryEntity e) {
        return new MealLogEntryResponse(
            e.getId(), e.getName(), e.getCaloriesKcal(),
            e.getProteinG(), e.getFatG(), e.getCarbsG(), e.getFiberG(),
            e.getSource(), e.getCreatedAt()
        );
    }

    @Transactional
    public MealLogEntryResponse updateMealLogEntry(UUID userId, UUID entryId, com.aiduparc.nutrition.history.api.UpdateMealLogEntryRequest req) {
        MealLogEntryEntity entry = mealLogRepository.findByIdAndUserId(entryId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal not found"));

        if (req.name() != null && !req.name().isBlank()) entry.setName(req.name().trim());
        if (req.caloriesKcal() != null) entry.setCaloriesKcal(req.caloriesKcal());
        if (req.proteinG() != null) entry.setProteinG(req.proteinG());
        if (req.fatG() != null) entry.setFatG(req.fatG());
        if (req.carbsG() != null) entry.setCarbsG(req.carbsG());
        if (req.fiberG() != null) entry.setFiberG(req.fiberG());
        if (req.slotType() != null && !req.slotType().isBlank()) {
            MealSlotEntity targetSlot = getOrCreateSlot(userId, entry.getEntryDate(), req.slotType());
            entry.setMealSlotId(targetSlot.getId());
        }
        mealLogRepository.save(entry);
        mealLogRepository.flush();

        recomputeDailyTotalsFromLog(userId, entry.getEntryDate());
        log.info("meal-log entry updated userId={} entryId={}", userId, entryId);

        return new MealLogEntryResponse(
            entry.getId(), entry.getName(), entry.getCaloriesKcal(),
            entry.getProteinG(), entry.getFatG(), entry.getCarbsG(), entry.getFiberG(),
            entry.getSource(), entry.getCreatedAt()
        );
    }

    @Transactional
    public void deleteMealLogEntry(UUID userId, UUID entryId) {
        MealLogEntryEntity entry = mealLogRepository.findByIdAndUserId(entryId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal not found"));

        LocalDate entryDate = entry.getEntryDate();
        mealLogRepository.delete(entry);
        mealLogRepository.flush();

        recomputeDailyTotalsFromLog(userId, entryDate);
        log.info("meal-log entry deleted userId={} entryId={} entryDate={}", userId, entryId, entryDate);
    }

    @Transactional
    public void deleteLatestMealLogEntryByName(UUID userId, LocalDate entryDate, String name) {
        mealLogRepository.findTopByUserIdAndEntryDateAndNameOrderByCreatedAtDesc(userId, entryDate, name)
            .ifPresentOrElse(entry -> {
                mealLogRepository.delete(entry);
                mealLogRepository.flush();
                recomputeDailyTotalsFromLog(userId, entryDate);
            }, () -> log.warn("meal-log entry not found for undo userId={} date={} name={}", userId, entryDate, name));
    }

    @Transactional
    public void resetDayNutrition(UUID userId, LocalDate date) {
        mealLogRepository.deleteByUserIdAndEntryDate(userId, date);
        updateNutritionTotals(userId, date,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    private void recomputeDailyTotalsFromLog(UUID userId, LocalDate date) {
        List<MealLogEntryEntity> remaining = mealLogRepository.findByUserIdAndEntryDateOrderByCreatedAtAsc(userId, date);
        BigDecimal calories = remaining.stream().map(MealLogEntryEntity::getCaloriesKcal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal protein  = remaining.stream().map(MealLogEntryEntity::getProteinG).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fat      = remaining.stream().map(MealLogEntryEntity::getFatG).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fiber    = remaining.stream().map(MealLogEntryEntity::getFiberG).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal carbs    = remaining.stream().map(MealLogEntryEntity::getCarbsG).reduce(BigDecimal.ZERO, BigDecimal::add);
        updateNutritionTotals(userId, date, calories, protein, fat, fiber, carbs);
    }

    private void saveMealLogEntry(AddToDailyTotalsCommand command) {
        MealSlotEntity slot = getOrCreateSlot(command.userId(), command.entryDate(), command.slotType());
        var entry = new MealLogEntryEntity();
        entry.setUserId(command.userId());
        entry.setEntryDate(command.entryDate());
        entry.setMealSlotId(slot.getId());
        entry.setName(command.mealName() != null && !command.mealName().isBlank() ? command.mealName() : "Manual entry");
        entry.setCaloriesKcal(defaultBigDecimal(command.caloriesConsumedKcal()));
        entry.setProteinG(defaultBigDecimal(command.proteinGrams()));
        entry.setFatG(defaultBigDecimal(command.fatGrams()));
        entry.setCarbsG(defaultBigDecimal(command.carbsGrams()));
        entry.setFiberG(defaultBigDecimal(command.fiberGrams()));
        entry.setSource(command.source());
        mealLogRepository.save(entry);
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
        entity.setCarbsGrams(command.carbsGrams());
        entity.setWaterGlasses(command.waterGlasses());
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
        BigDecimal carbsGrams,
        String notes,
        int waterGlasses
    ) {
        public UpsertDailyNutritionEntryCommand(
            UUID userId, LocalDate entryDate, BigDecimal caloriesConsumedKcal,
            BigDecimal calorieTargetKcal, BigDecimal weightKg,
            BigDecimal proteinGrams, BigDecimal fatGrams, BigDecimal fiberGrams,
            BigDecimal carbsGrams, String notes
        ) {
            this(userId, entryDate, caloriesConsumedKcal, calorieTargetKcal, weightKg,
                proteinGrams, fatGrams, fiberGrams, carbsGrams, notes, 0);
        }
    }

    public record AddToDailyTotalsCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams,
        BigDecimal carbsGrams,
        String notes,
        String mealName,
        String source,
        String slotType
    ) {
        public AddToDailyTotalsCommand(
            UUID userId, LocalDate entryDate, BigDecimal caloriesConsumedKcal,
            BigDecimal proteinGrams, BigDecimal fatGrams, BigDecimal fiberGrams,
            BigDecimal carbsGrams, String notes
        ) {
            this(userId, entryDate, caloriesConsumedKcal, proteinGrams, fatGrams, fiberGrams, carbsGrams, notes, null, null, null);
        }
    }
    @Transactional
    public void updateWater(UUID userId, LocalDate entryDate, int glasses) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(userId, entryDate);
        upsert(new UpsertDailyNutritionEntryCommand(
            userId, entryDate,
            defaultBigDecimal(current.caloriesConsumedKcal()),
            current.calorieTargetKcal(), current.weightKg(),
            current.proteinGrams(), current.fatGrams(), current.fiberGrams(), current.carbsGrams(),
            current.notes(), Math.max(0, Math.min(glasses, 10))
        ));
    }

    private DailyNutritionEntrySnapshot getOrCreateEmptySnapshot(UUID userId, LocalDate entryDate) {
        return findByUserAndDate(userId, entryDate)
            .orElseGet(() -> new DailyNutritionEntrySnapshot(
                null, userId, entryDate,
                null, null, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                0, null, null, null
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

    private BigDecimal resolveAdaptiveTarget(UUID userId, BigDecimal currentWeightKg) {
        return userProfileService.findByNutritionUserId(userId)
            .map(profile -> currentWeightKg != null
                ? userProfileService.getAdaptiveCalorieTarget(profile, currentWeightKg)
                : profile.getDailyCalorieTargetKcal())
            .orElse(DEFAULT_DAILY_TARGET_KCAL);
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
