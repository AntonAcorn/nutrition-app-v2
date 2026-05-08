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
 * Friday evening: weight has stayed within ±0.3 kg over the past 14 days
 * (and there are at least 4 weight points). Coach suggests it's time to
 * shake something up; recap on Sunday will give specifics.
 */
@Component
public class PlateauDetector implements TriggerDetector {

    private static final BigDecimal SPREAD_KG = BigDecimal.valueOf(0.3);
    private static final int LOOKBACK_DAYS = 14;
    private static final int MIN_POINTS = 4;
    private static final int FIRE_HOUR = 20;

    private final DailyNutritionEntryRepository dailyRepo;

    public PlateauDetector(DailyNutritionEntryRepository dailyRepo) {
        this.dailyRepo = dailyRepo;
    }

    @Override public String kind() { return "plateau"; }
    @Override public Duration cooldown() { return Duration.ofDays(14); }

    @Override
    public boolean isFiringWindow(ZonedDateTime localNow) {
        return localNow.getDayOfWeek() == DayOfWeek.FRIDAY && localNow.getHour() == FIRE_HOUR;
    }

    @Override
    public Optional<TriggerPayload> detect(UUID userId, LocalDate today, ZoneId zone) {
        LocalDate from = today.minusDays(LOOKBACK_DAYS);
        List<DailyNutritionEntryEntity> rows = dailyRepo
            .findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, from, today);
        BigDecimal min = null, max = null;
        int points = 0;
        for (DailyNutritionEntryEntity r : rows) {
            if (r.getWeightKg() == null) continue;
            BigDecimal w = r.getWeightKg();
            if (min == null || w.compareTo(min) < 0) min = w;
            if (max == null || w.compareTo(max) > 0) max = w;
            points++;
        }
        if (points < MIN_POINTS || min == null || max == null) return Optional.empty();
        BigDecimal spread = max.subtract(min);
        if (spread.compareTo(SPREAD_KG) > 0) return Optional.empty();

        String s = spread.setScale(1, java.math.RoundingMode.HALF_UP).toPlainString();
        return Optional.of(new TriggerPayload(
            "Weight plateaued",
            "Only " + s + " kg movement in 14 days. Open Coach — let's shake it up.",
            "plateau.spreadKg=" + s
        ));
    }
}
