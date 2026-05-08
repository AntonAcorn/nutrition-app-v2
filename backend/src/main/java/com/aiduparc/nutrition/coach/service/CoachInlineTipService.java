package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.InlineTipResponse;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rule-based "what happens if I add this?" tip shown inline before the user
 * saves a meal. Deliberately stateless and LLM-free so it can refresh as
 * fast as the user types. Three signals:
 *  - resulting % of target after this meal would land
 *  - what time of day they're committing those kcal
 *  - slot context (heavy breakfast leaves the day open vs heavy late dinner)
 */
@Service
@Transactional(readOnly = true)
public class CoachInlineTipService {

    private static final BigDecimal MIN_PROBE_KCAL = BigDecimal.valueOf(50);

    private final UserProfileRepository userProfileRepository;
    private final DailyNutritionEntryRepository dailyEntryRepository;

    public CoachInlineTipService(
        UserProfileRepository userProfileRepository,
        DailyNutritionEntryRepository dailyEntryRepository
    ) {
        this.userProfileRepository = userProfileRepository;
        this.dailyEntryRepository = dailyEntryRepository;
    }

    public InlineTipResponse compute(UUID userId, BigDecimal kcal, String slotType, ZoneId zone) {
        if (kcal == null || kcal.compareTo(MIN_PROBE_KCAL) < 0) {
            return muted();
        }

        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId).orElse(null);
        if (profile == null) return muted();

        int target = profile.getDailyCalorieTargetKcal().intValue();
        if (target <= 0) return muted();

        LocalDate today = LocalDate.now(zone);
        DailyNutritionEntryEntity entry = dailyEntryRepository
            .findByUserIdAndEntryDate(userId, today).orElse(null);
        int alreadyConsumed = entry != null && entry.getCaloriesConsumedKcal() != null
            ? entry.getCaloriesConsumedKcal().intValue() : 0;

        int incoming = kcal.intValue();
        int after = alreadyConsumed + incoming;
        int remaining = target - after;
        double afterRatio = (double) after / target;

        int hour = ZonedDateTime.now(zone).getHour();
        String slot = slotType != null ? slotType.toUpperCase() : null;

        // 1. Over the daily target.
        if (afterRatio > 1.05) {
            int over = after - target;
            return new InlineTipResponse(
                "over",
                "+" + over + " kcal over today's target. Drop a side, or split this with tomorrow.",
                after, target
            );
        }

        // 2. Will land tight (95-105% of target).
        if (afterRatio >= 0.95) {
            return new InlineTipResponse(
                "caution",
                "This puts you at " + Math.round(afterRatio * 100) + "% of target. " +
                "Keep the rest of the day light (≤" + Math.max(0, remaining) + " kcal left).",
                after, target
            );
        }

        // 3. Heavy meal early in the day — flag time-of-day risk.
        if (("BREAKFAST".equals(slot) || hour < 11) && incoming > target * 0.4) {
            return new InlineTipResponse(
                "caution",
                "Heavy start — " + incoming + " kcal at breakfast leaves " + remaining + " kcal for the rest of the day.",
                after, target
            );
        }

        // 4. Late-night heavy meal — flag if landing >70% target after 21:00.
        if (hour >= 21 && afterRatio > 0.7 && incoming > 400) {
            return new InlineTipResponse(
                "caution",
                "Late dinner of " + incoming + " kcal lands you at " + Math.round(afterRatio * 100) + "% — " +
                "consider lighter or earlier next time.",
                after, target
            );
        }

        // 5. Default: looking good.
        return new InlineTipResponse(
            "good",
            "On track — " + remaining + " kcal left after this.",
            after, target
        );
    }

    public InlineTipResponse computeUtc(UUID userId, BigDecimal kcal, String slotType) {
        return compute(userId, kcal, slotType, ZoneOffset.UTC);
    }

    private static InlineTipResponse muted() {
        return new InlineTipResponse("muted", null, null, null);
    }
}
