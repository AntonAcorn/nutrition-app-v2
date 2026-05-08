package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Totals;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.WeightTrend;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Detects when a user has earned a goal escalation and applies it.
 *
 * Eligibility for "weight loss" escalation (mild → optimal → aggressive):
 *   - profile.goal == "lose"
 *   - current strategy below "aggressive"
 *   - 3+ weeks (≥21 days) of no-overrun streak in the snapshot
 *   - weight is moving the right way (≥0.3 kg down over the window)
 *
 * The service deliberately does only one suggestion at a time — the
 * caller persists it as a UserInsight with kind=escalation and a
 * concrete action payload, then the user accepts via /escalation/accept.
 */
@Service
@Transactional(readOnly = true)
public class CoachGoalAdjustmentService {

    private static final Logger log = LoggerFactory.getLogger(CoachGoalAdjustmentService.class);

    private static final int MIN_STREAK_DAYS = 21;
    private static final double MIN_WEIGHT_DELTA_KG = 0.3;

    private final UserProfileRepository userProfileRepository;

    public CoachGoalAdjustmentService(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * Returns a non-null suggestion only when the user has clearly earned
     * an escalation. Caller decides what to do with it.
     */
    public Optional<EscalationSuggestion> evaluate(UUID userId, CoachSnapshotResponse snapshot) {
        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId).orElse(null);
        if (profile == null || profile.getGoal() == null) return Optional.empty();
        if (!"lose".equalsIgnoreCase(profile.getGoal())) return Optional.empty();

        String current = profile.getWeightLossStrategy();
        String next = nextStrategy(current);
        if (next == null) return Optional.empty();

        Totals totals = snapshot.totals();
        if (totals == null || totals.noOverrunStreakDays() < MIN_STREAK_DAYS) return Optional.empty();

        WeightTrend trend = snapshot.weightTrend();
        if (trend == null || trend.deltaKg() == null) return Optional.empty();
        if (trend.deltaKg() > -MIN_WEIGHT_DELTA_KG) return Optional.empty();

        return Optional.of(new EscalationSuggestion(
            current,
            next,
            "Streak " + totals.noOverrunStreakDays() + " days, weight "
                + String.format("%.1f", Math.abs(trend.deltaKg())) + " kg down."
        ));
    }

    @Transactional
    public void applyWeightLossStrategy(UUID userId, String newStrategy) {
        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        if (!"lose".equalsIgnoreCase(profile.getGoal())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Strategy escalation only valid for lose goal");
        }
        if (!isValidStrategy(newStrategy)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown strategy: " + newStrategy);
        }
        if (newStrategy.equalsIgnoreCase(profile.getWeightLossStrategy())) return;

        profile.setWeightLossStrategy(newStrategy.toLowerCase());
        BigDecimal currentTarget = profile.getDailyCalorieTargetKcal();
        if (currentTarget != null) {
            // Approximate adjustment: −150 kcal optimal vs mild, −300 kcal aggressive vs mild.
            // Real calc lives in user-profile bootstrap; this nudges the daily target so
            // the new strategy starts taking effect right away without waiting for next
            // profile recompute.
            BigDecimal delta = strategyDeltaKcal(profile.getWeightLossStrategy());
            profile.setDailyCalorieTargetKcal(currentTarget.add(delta).max(BigDecimal.valueOf(1200)));
        }
        userProfileRepository.save(profile);
        log.info("user weight-loss strategy escalated userId={} → {}", userId, newStrategy);
    }

    private static String nextStrategy(String current) {
        if (current == null || current.isBlank() || "mild".equalsIgnoreCase(current)) return "optimal";
        if ("optimal".equalsIgnoreCase(current)) return "aggressive";
        return null;
    }

    private static boolean isValidStrategy(String s) {
        return s != null && (s.equalsIgnoreCase("mild") || s.equalsIgnoreCase("optimal") || s.equalsIgnoreCase("aggressive"));
    }

    private static BigDecimal strategyDeltaKcal(String strategy) {
        return switch (strategy.toLowerCase()) {
            case "optimal" -> BigDecimal.valueOf(-150);
            case "aggressive" -> BigDecimal.valueOf(-300);
            default -> BigDecimal.ZERO;
        };
    }

    public record EscalationSuggestion(
        String currentStrategy,
        String suggestedStrategy,
        String rationale
    ) {}
}
