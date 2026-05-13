package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.api.MealLogEntryResponse;
import com.aiduparc.nutrition.history.api.MealSlotResponse;
import com.aiduparc.nutrition.history.api.NutritionStatisticsResponse;
import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
import com.aiduparc.nutrition.history.api.UpdateMealLogEntryRequest;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.model.MealSlotEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public facade over nutrition-history operations. Delegates statistics
 * computation to NutritionStatisticsCalculator and meal-log management
 * to MealLogService; owns the daily-entry write operations directly.
 *
 * <p>Slot constants and Command record types are kept here for backward
 * compatibility with existing callers that reference them via
 * NutritionHistoryService.AddToDailyTotalsCommand etc.
 */
@Service
@Transactional(readOnly = true)
public class NutritionHistoryService {

    private static final Logger log = LoggerFactory.getLogger(NutritionHistoryService.class);

    public static final String SLOT_BREAKFAST = MealLogService.SLOT_BREAKFAST;
    public static final String SLOT_LUNCH     = MealLogService.SLOT_LUNCH;
    public static final String SLOT_DINNER    = MealLogService.SLOT_DINNER;
    public static final String SLOT_SNACK     = MealLogService.SLOT_SNACK;

    private final DailyNutritionEntryRepository repository;
    private final NutritionStatisticsCalculator statisticsCalculator;
    private final MealLogService mealLogService;
    private final UserProfileRepository userProfileRepository;

    public NutritionHistoryService(
            DailyNutritionEntryRepository repository,
            NutritionStatisticsCalculator statisticsCalculator,
            MealLogService mealLogService,
            UserProfileRepository userProfileRepository
    ) {
        this.repository = repository;
        this.statisticsCalculator = statisticsCalculator;
        this.mealLogService = mealLogService;
        this.userProfileRepository = userProfileRepository;
    }

    // ── Read-through: snapshots ──────────────────────────────────────────────

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

    // ── Delegated: statistics ────────────────────────────────────────────────

    public TodaySummaryResponse getTodaySummary(UUID userId, LocalDate entryDate) {
        return statisticsCalculator.getTodaySummary(userId, entryDate);
    }

    public NutritionStatisticsResponse getStatistics(UUID userId, LocalDate fromInclusive, LocalDate toInclusive) {
        return statisticsCalculator.getStatistics(userId, fromInclusive, toInclusive);
    }

    // ── Delegated: meal log ──────────────────────────────────────────────────

    public List<MealSlotResponse> getMealLog(UUID userId, LocalDate date) {
        return mealLogService.getMealLog(userId, date);
    }

    public List<com.aiduparc.nutrition.history.api.FrequentMealResponse> getFrequentMeals(UUID userId, int days, int limit) {
        return mealLogService.getFrequentMeals(userId, days, limit);
    }

    @Transactional
    public MealSlotEntity getOrCreateSlot(UUID userId, LocalDate date, String slotType) {
        return mealLogService.getOrCreateSlot(userId, date, slotType);
    }

    @Transactional
    public MealLogEntryResponse updateMealLogEntry(UUID userId, UUID entryId, UpdateMealLogEntryRequest req) {
        return mealLogService.updateMealLogEntry(userId, entryId, req);
    }

    @Transactional
    public void deleteMealLogEntry(UUID userId, UUID entryId) {
        mealLogService.deleteMealLogEntry(userId, entryId);
    }

    @Transactional
    public void deleteLatestMealLogEntryByName(UUID userId, LocalDate entryDate, String name) {
        mealLogService.deleteLatestMealLogEntryByName(userId, entryDate, name);
    }

    // ── Daily-entry writes (owned here) ──────────────────────────────────────

    @Transactional
    public DailyNutritionEntrySnapshot updateWeight(UUID userId, LocalDate entryDate, BigDecimal weightKg) {
        DailyNutritionEntryEntity entity = repository
            .findByUserIdAndEntryDate(userId, entryDate)
            .orElseGet(DailyNutritionEntryEntity::new);

        if (entity.getUserId() == null) {
            entity.setUserId(userId);
            entity.setEntryDate(entryDate);
            entity.setCaloriesConsumedKcal(BigDecimal.ZERO);
            entity.setProteinGrams(BigDecimal.ZERO);
            entity.setFatGrams(BigDecimal.ZERO);
            entity.setFiberGrams(BigDecimal.ZERO);
            entity.setCarbsGrams(BigDecimal.ZERO);
            entity.setWaterGlasses(0);
        }

        entity.setCalorieTargetKcal(resolveTarget(userId, entity.getCalorieTargetKcal()));
        entity.setWeightKg(weightKg);
        entity.setWeightUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        DailyNutritionEntryEntity saved = repository.save(entity);
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

        return upsert(new UpsertDailyNutritionEntryCommand(
            userId, entryDate, caloriesConsumedKcal,
            current.calorieTargetKcal(), current.weightKg(),
            proteinGrams, fatGrams, fiberGrams, carbsGrams,
            current.notes(), current.waterGlasses()
        ));
    }

    @Transactional
    public void subtractFromDailyTotals(SubtractFromDailyTotalsCommand command) {
        DailyNutritionEntryEntity entity = lockOrCreateDailyEntry(command.userId(), command.entryDate());

        entity.setCaloriesConsumedKcal(defaultBigDecimal(entity.getCaloriesConsumedKcal())
            .subtract(defaultBigDecimal(command.caloriesConsumedKcal())).max(BigDecimal.ZERO));
        entity.setProteinGrams(defaultBigDecimal(entity.getProteinGrams())
            .subtract(defaultBigDecimal(command.proteinGrams())).max(BigDecimal.ZERO));
        entity.setFatGrams(defaultBigDecimal(entity.getFatGrams())
            .subtract(defaultBigDecimal(command.fatGrams())).max(BigDecimal.ZERO));
        entity.setFiberGrams(defaultBigDecimal(entity.getFiberGrams())
            .subtract(defaultBigDecimal(command.fiberGrams())).max(BigDecimal.ZERO));
        entity.setCarbsGrams(defaultBigDecimal(entity.getCarbsGrams())
            .subtract(defaultBigDecimal(command.carbsGrams())).max(BigDecimal.ZERO));
        entity.setCalorieTargetKcal(resolveTarget(command.userId(), entity.getCalorieTargetKcal()));

        repository.save(entity);
    }

    @Transactional
    public DailyNutritionEntrySnapshot addToDailyTotals(AddToDailyTotalsCommand command) {
        DailyNutritionEntryEntity entity = lockOrCreateDailyEntry(command.userId(), command.entryDate());

        entity.setCaloriesConsumedKcal(defaultBigDecimal(entity.getCaloriesConsumedKcal())
            .add(defaultBigDecimal(command.caloriesConsumedKcal())));
        entity.setProteinGrams(defaultBigDecimal(entity.getProteinGrams())
            .add(defaultBigDecimal(command.proteinGrams())));
        entity.setFatGrams(defaultBigDecimal(entity.getFatGrams())
            .add(defaultBigDecimal(command.fatGrams())));
        entity.setFiberGrams(defaultBigDecimal(entity.getFiberGrams())
            .add(defaultBigDecimal(command.fiberGrams())));
        entity.setCarbsGrams(defaultBigDecimal(entity.getCarbsGrams())
            .add(defaultBigDecimal(command.carbsGrams())));
        entity.setNotes(mergeNotes(entity.getNotes(), command.notes()));
        entity.setCalorieTargetKcal(resolveTarget(command.userId(), entity.getCalorieTargetKcal()));

        DailyNutritionEntryEntity saved = repository.save(entity);
        DailyNutritionEntrySnapshot result = DailyNutritionEntrySnapshot.fromEntity(saved);

        MealSlotEntity slot = mealLogService.getOrCreateSlot(command.userId(), command.entryDate(), command.slotType());
        mealLogService.saveEntry(
            command.userId(), command.entryDate(), slot.getId(),
            command.mealName() != null && !command.mealName().isBlank() ? command.mealName() : "Manual entry",
            command.caloriesConsumedKcal(),
            command.proteinGrams(),
            command.fatGrams(),
            command.carbsGrams(),
            command.fiberGrams(),
            command.source()
        );

        log.info(
            "daily-totals updated userId={} entryDate={} calories={} protein={} fat={} fiber={}",
            result.userId(), result.entryDate(),
            result.caloriesConsumedKcal(), result.proteinGrams(), result.fatGrams(), result.fiberGrams()
        );
        return result;
    }

    /**
     * Fetch the daily-totals row for (userId, entryDate) under a row-level
     * write lock, creating an empty row on the fly if one doesn't exist. The
     * pessimistic lock serialises concurrent read-modify-write calls (e.g.
     * "Save all N meals" sending parallel /confirm requests), preventing the
     * second writer from clobbering the first writer's increment.
     */
    private DailyNutritionEntryEntity lockOrCreateDailyEntry(UUID userId, LocalDate entryDate) {
        Optional<DailyNutritionEntryEntity> found =
            repository.findByUserIdAndEntryDateForUpdate(userId, entryDate);
        if (found.isPresent()) return found.get();

        DailyNutritionEntryEntity fresh = new DailyNutritionEntryEntity();
        fresh.setUserId(userId);
        fresh.setEntryDate(entryDate);
        fresh.setCaloriesConsumedKcal(BigDecimal.ZERO);
        fresh.setProteinGrams(BigDecimal.ZERO);
        fresh.setFatGrams(BigDecimal.ZERO);
        fresh.setFiberGrams(BigDecimal.ZERO);
        fresh.setCarbsGrams(BigDecimal.ZERO);
        fresh.setWaterGlasses(0);
        fresh.setCalorieTargetKcal(resolveTarget(userId, null));

        try {
            repository.saveAndFlush(fresh);
        } catch (DataIntegrityViolationException ignored) {
            // Concurrent insert won the unique-constraint race; re-fetch below.
        }

        return repository.findByUserIdAndEntryDateForUpdate(userId, entryDate)
            .orElseThrow(() -> new IllegalStateException(
                "Daily entry vanished after lockOrCreate for user=" + userId + " date=" + entryDate));
    }

    @Transactional
    public void resetDayNutrition(UUID userId, LocalDate date) {
        mealLogService.deleteAllForDate(userId, date);
        updateNutritionTotals(userId, date,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
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
        entity.setCalorieTargetKcal(resolveTarget(command.userId(), command.calorieTargetKcal()));
        entity.setProteinGrams(command.proteinGrams());
        entity.setFatGrams(command.fatGrams());
        entity.setFiberGrams(command.fiberGrams());
        entity.setCarbsGrams(command.carbsGrams());
        entity.setWaterGlasses(command.waterGlasses());
        entity.setNotes(command.notes());

        DailyNutritionEntryEntity saved = repository.save(entity);
        return DailyNutritionEntrySnapshot.fromEntity(saved);
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

    // ── Helpers ──────────────────────────────────────────────────────────────

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

    /**
     * Pin the calorie target on a daily entry: keep what's already there if
     * it's a sane positive number, otherwise pull the live target from the
     * user's profile. Prevents bank/badge calculations from misfiring when
     * an entry was created via a code path that didn't pass a target
     * (e.g. early water-only or weight-only writes), or when an entry got
     * persisted with a stale 0 from an earlier bug.
     */
    private BigDecimal resolveTarget(UUID userId, BigDecimal current) {
        if (current != null && current.signum() > 0) return current;
        return userProfileRepository.findByNutritionUserId(userId)
            .map(UserProfileEntity::getDailyCalorieTargetKcal)
            .orElse(current);
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

    // ── Command record types (kept here for backward compatibility) ──────────

    public record SubtractFromDailyTotalsCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal proteinGrams,
        BigDecimal fatGrams,
        BigDecimal fiberGrams,
        BigDecimal carbsGrams
    ) {}

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
}
