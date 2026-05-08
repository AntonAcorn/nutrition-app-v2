package com.aiduparc.nutrition.wellbeing.service;

import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import com.aiduparc.nutrition.history.model.MealSlotEntity;
import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import com.aiduparc.nutrition.history.repository.MealSlotRepository;
import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingEntryRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WellbeingService {

    private static final Logger log = LoggerFactory.getLogger(WellbeingService.class);
    private static final Duration MEAL_PROXIMITY_WINDOW = Duration.ofHours(2);

    private final WellbeingEntryRepository entryRepository;
    private final MealLogEntryRepository mealLogEntryRepository;
    private final MealSlotRepository mealSlotRepository;

    public WellbeingService(
        WellbeingEntryRepository entryRepository,
        MealLogEntryRepository mealLogEntryRepository,
        MealSlotRepository mealSlotRepository
    ) {
        this.entryRepository = entryRepository;
        this.mealLogEntryRepository = mealLogEntryRepository;
        this.mealSlotRepository = mealSlotRepository;
    }

    @Transactional
    public void saveRating(UUID userId, int rating) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        LocalDate today = now.toLocalDate();
        String slot = inferSlot(userId, today, now);

        WellbeingEntryEntity entry = new WellbeingEntryEntity();
        entry.setUserId(userId);
        entry.setRating(rating);
        entry.setEntryDate(today);
        entry.setMealSlot(slot);
        entryRepository.save(entry);

        log.info("wellbeing rating saved userId={} rating={} slot={}", userId, rating, slot);
    }

    /**
     * Try to attach the rating to the slot of the most recent meal within
     * a {@value #MEAL_PROXIMITY_WINDOW}-hour window. If no nearby meal,
     * fall back to a coarse time-of-day mapping. Returns null only if the
     * fallback also can't decide (extremely late/early hour without slot).
     */
    private String inferSlot(UUID userId, LocalDate today, OffsetDateTime now) {
        // 1. Look up the most recent meal log entry within the proximity window.
        OffsetDateTime cutoff = now.minus(MEAL_PROXIMITY_WINDOW);
        Optional<MealLogEntryEntity> recent = mealLogEntryRepository
            .findTopByUserIdAndCreatedAtBeforeOrderByCreatedAtDesc(userId, now)
            .filter(m -> !m.getCreatedAt().isBefore(cutoff))
            .filter(m -> m.getMealSlotId() != null);

        if (recent.isPresent()) {
            UUID slotId = recent.get().getMealSlotId();
            // We don't have a findById on MealSlotRepository for slotId+userId,
            // but we have entryDate-based lookups. Load all slots for that day.
            LocalDate mealDate = recent.get().getEntryDate();
            Map<UUID, String> idToType = loadSlotsForDay(userId, mealDate);
            String type = idToType.get(slotId);
            if (type != null) return type;
        }

        // 2. Fallback to time-of-day. Hour is in UTC here — we don't have the
        // user's timezone in this code path, so this is a best-effort coarse
        // mapping. Most users get the slot from the meal lookup above.
        int hour = now.getHour();
        if (hour >= 4 && hour < 11) return "BREAKFAST";
        if (hour >= 11 && hour < 16) return "LUNCH";
        if (hour >= 16 && hour < 22) return "DINNER";
        return "SNACK";
    }

    private Map<UUID, String> loadSlotsForDay(UUID userId, LocalDate date) {
        Map<UUID, String> out = new HashMap<>();
        for (MealSlotEntity s : mealSlotRepository.findByUserIdAndEntryDateOrderBySortOrderAsc(userId, date)) {
            out.put(s.getId(), s.getSlotType());
        }
        return out;
    }
}
