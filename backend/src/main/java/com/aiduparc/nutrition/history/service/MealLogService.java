package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.api.FrequentMealResponse;
import com.aiduparc.nutrition.history.api.MealLogEntryResponse;
import com.aiduparc.nutrition.history.api.MealSlotResponse;
import com.aiduparc.nutrition.history.api.UpdateMealLogEntryRequest;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import com.aiduparc.nutrition.history.model.MealSlotEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import com.aiduparc.nutrition.history.repository.MealSlotRepository;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owns all meal-log entries and meal-slot management (CRUD + recompute of
 * daily totals from the meal log). When entries are added/edited/deleted,
 * the daily nutrition entry is recomputed by summing all log entries.
 */
@Service
@Transactional(readOnly = true)
public class MealLogService {

    private static final Logger log = LoggerFactory.getLogger(MealLogService.class);

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

    private final MealLogEntryRepository mealLogRepository;
    private final MealSlotRepository mealSlotRepository;
    private final DailyNutritionEntryRepository dailyEntryRepository;
    private final UserProfileRepository userProfileRepository;

    public MealLogService(
            MealLogEntryRepository mealLogRepository,
            MealSlotRepository mealSlotRepository,
            DailyNutritionEntryRepository dailyEntryRepository,
            UserProfileRepository userProfileRepository
    ) {
        this.mealLogRepository = mealLogRepository;
        this.mealSlotRepository = mealSlotRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.userProfileRepository = userProfileRepository;
    }

    public List<FrequentMealResponse> getFrequentMeals(UUID userId, int days, int limit) {
        int safeDays = days <= 0 ? 7 : Math.min(days, 90);
        int safeLimit = limit <= 0 ? 5 : Math.min(limit, 20);
        LocalDate since = LocalDate.now().minusDays(safeDays);
        return mealLogRepository.findFrequentMeals(userId, since, safeLimit).stream()
            .map(row -> new FrequentMealResponse(
                (String) row[0],
                toBigDecimal(row[1]),
                toBigDecimal(row[2]),
                toBigDecimal(row[3]),
                toBigDecimal(row[4]),
                toBigDecimal(row[5]),
                ((Number) row[6]).longValue()
            ))
            .toList();
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
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

    @Transactional
    public MealLogEntryResponse updateMealLogEntry(UUID userId, UUID entryId, UpdateMealLogEntryRequest req) {
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

        return toEntryResponse(entry);
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
    public void deleteAllForDate(UUID userId, LocalDate date) {
        mealLogRepository.deleteByUserIdAndEntryDate(userId, date);
    }

    @Transactional
    public void saveEntry(
        UUID userId, LocalDate entryDate, UUID slotId,
        String name, BigDecimal calories, BigDecimal protein,
        BigDecimal fat, BigDecimal carbs, BigDecimal fiber, String source
    ) {
        var entry = new MealLogEntryEntity();
        entry.setUserId(userId);
        entry.setEntryDate(entryDate);
        entry.setMealSlotId(slotId);
        entry.setName(name);
        entry.setCaloriesKcal(defaultBigDecimal(calories));
        entry.setProteinG(defaultBigDecimal(protein));
        entry.setFatG(defaultBigDecimal(fat));
        entry.setCarbsG(defaultBigDecimal(carbs));
        entry.setFiberG(defaultBigDecimal(fiber));
        entry.setSource(source);
        mealLogRepository.save(entry);
    }

    /**
     * Recomputes the daily nutrition totals as the sum of all meal log
     * entries for the given date. Preserves weight, water, notes, and the
     * stored daily target. If no daily entry exists yet, creates one with
     * zero defaults.
     */
    @Transactional
    public void recomputeDailyTotalsFromLog(UUID userId, LocalDate date) {
        List<MealLogEntryEntity> remaining = mealLogRepository.findByUserIdAndEntryDateOrderByCreatedAtAsc(userId, date);
        BigDecimal calories = remaining.stream().map(MealLogEntryEntity::getCaloriesKcal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal protein  = remaining.stream().map(MealLogEntryEntity::getProteinG).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fat      = remaining.stream().map(MealLogEntryEntity::getFatG).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fiber    = remaining.stream().map(MealLogEntryEntity::getFiberG).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal carbs    = remaining.stream().map(MealLogEntryEntity::getCarbsG).reduce(BigDecimal.ZERO, BigDecimal::add);

        DailyNutritionEntryEntity entity = dailyEntryRepository
            .findByUserIdAndEntryDate(userId, date)
            .orElseGet(DailyNutritionEntryEntity::new);

        if (entity.getUserId() == null) {
            entity.setUserId(userId);
            entity.setEntryDate(date);
            entity.setWaterGlasses(0);
            // Snapshot the profile's daily target on creation so future profile
            // changes don't retroactively rewrite history.
            userProfileRepository.findByNutritionUserId(userId)
                .map(p -> p.getDailyCalorieTargetKcal())
                .ifPresent(entity::setCalorieTargetKcal);
        }
        entity.setCaloriesConsumedKcal(calories);
        entity.setProteinGrams(protein);
        entity.setFatGrams(fat);
        entity.setFiberGrams(fiber);
        entity.setCarbsGrams(carbs);

        dailyEntryRepository.save(entity);
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

    private static BigDecimal defaultBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
