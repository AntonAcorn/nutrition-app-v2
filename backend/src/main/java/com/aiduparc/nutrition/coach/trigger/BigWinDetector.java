package com.aiduparc.nutrition.coach.trigger;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Sunday evening: did the user lose ≥0.7 kg over the past 7 days? If so,
 * celebrate with the actual delta. We keep it short — the recap card
 * does the discussion later.
 */
@Component
public class BigWinDetector implements TriggerDetector {

    private static final BigDecimal MIN_DROP_KG = BigDecimal.valueOf(0.7);
    private static final int FIRE_HOUR = 19;

    private final DailyNutritionEntryRepository dailyRepo;

    public BigWinDetector(DailyNutritionEntryRepository dailyRepo) {
        this.dailyRepo = dailyRepo;
    }

    @Override public String kind() { return "big_win"; }
    @Override public Duration cooldown() { return Duration.ofDays(7); }

    @Override
    public boolean isFiringWindow(ZonedDateTime localNow) {
        return localNow.getDayOfWeek() == DayOfWeek.SUNDAY && localNow.getHour() == FIRE_HOUR;
    }

    @Override
    public Optional<TriggerPayload> detect(UUID userId, LocalDate today, ZoneId zone) {
        LocalDate from = today.minusDays(7);
        List<DailyNutritionEntryEntity> rows = dailyRepo
            .findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, from, today);
        BigDecimal first = null, last = null;
        for (DailyNutritionEntryEntity r : rows) {
            if (r.getWeightKg() == null) continue;
            if (first == null) first = r.getWeightKg();
            last = r.getWeightKg();
        }
        if (first == null || last == null) return Optional.empty();
        BigDecimal delta = first.subtract(last); // positive = lost weight
        if (delta.compareTo(MIN_DROP_KG) < 0) return Optional.empty();

        String d = delta.setScale(1, java.math.RoundingMode.HALF_UP).toPlainString();
        return Optional.of(new TriggerPayload(
            "Big week — down " + d + " kg",
            "Your weekly recap is ready. Tap to see what worked.",
            "big_win.deltaKg=" + d
        ));
    }
}
