package com.aiduparc.nutrition.notifications.push;

import com.aiduparc.nutrition.calorieBank.repository.RelaxDayRepository;
import com.aiduparc.nutrition.calorieBank.service.CalorieBankService;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Hourly fan-out of push notifications. Three slots per user per day:
 *
 * <ul>
 *   <li><b>Regular slot</b> at the user's chosen reminder hour. One of:
 *       daily-log nudge / bank-win celebration / streak milestone. The
 *       streak save below replaces this when applicable.</li>
 *   <li><b>Streak save slot</b> at 21:00 local. Only when the user has a
 *       3+ day streak and still hasn't logged. Triggers a higher-urgency
 *       message — the in-app calorie-bank streak is the retention lever.</li>
 *   <li><b>Quiet hours</b> 22:00–07:59 local. No "extra" pushes. The
 *       explicit reminder_hour is always honoured (a user who set 6 AM
 *       wants 6 AM) but auto-triggered slots like streak save respect them.</li>
 * </ul>
 *
 * <p>Dedup: every successful send stamps {@code last_sent_at}; subsequent
 * checks the same local day suppress further pushes so a streak save can't
 * pile on top of a regular reminder.
 */
@Component
public class PushScheduler {

    private static final Logger log = LoggerFactory.getLogger(PushScheduler.class);
    private static final int STREAK_SAVE_HOUR = 21;
    private static final int QUIET_HOURS_START = 22;
    private static final int QUIET_HOURS_END = 8;

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final DailyNutritionEntryRepository nutritionEntryRepository;
    private final CalorieBankService calorieBankService;
    private final RelaxDayRepository relaxDayRepository;

    public PushScheduler(
            PushSubscriptionRepository subscriptionRepository,
            PushNotificationService pushNotificationService,
            DailyNutritionEntryRepository nutritionEntryRepository,
            CalorieBankService calorieBankService,
            RelaxDayRepository relaxDayRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.nutritionEntryRepository = nutritionEntryRepository;
        this.calorieBankService = calorieBankService;
        this.relaxDayRepository = relaxDayRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void sendReminders() {
        List<PushSubscriptionEntity> active = subscriptionRepository.findByEnabled(true);
        if (active.isEmpty()) return;

        for (PushSubscriptionEntity sub : active) {
            try {
                processSubscription(sub);
            } catch (Exception e) {
                log.warn("Scheduler error for subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private void processSubscription(PushSubscriptionEntity sub) {
        ZoneId zone = safeZone(sub.getTimezone());
        ZonedDateTime now = ZonedDateTime.now(zone);
        int localHour = now.getHour();
        LocalDate today = now.toLocalDate();
        boolean isRegularSlot = localHour == sub.getReminderHour();
        boolean isStreakSaveSlot = localHour == STREAK_SAVE_HOUR;
        if (!isRegularSlot && !isStreakSaveSlot) return;

        // Quiet hours apply to the auto-triggered streak save only — a user who
        // explicitly set their reminder for 23:00 still gets 23:00.
        if (isStreakSaveSlot && !isRegularSlot && isQuietHour(localHour)) return;

        // Already greeted today? Block both slots to avoid pile-on.
        if (alreadySentToday(sub, zone, today)) return;

        boolean loggedToday = nutritionEntryRepository
                .findByUserIdAndEntryDate(sub.getUserId(), today)
                .map(e -> e.getCaloriesConsumedKcal() != null
                        && e.getCaloriesConsumedKcal().compareTo(BigDecimal.ZERO) > 0)
                .orElse(false);

        // Streak save takes priority over the regular slot when both qualify.
        if (isStreakSaveSlot && !loggedToday && sub.isNotifyStreak()) {
            int streak = calculateStreak(sub.getUserId(), today);
            if (streak >= 3) {
                deliverAndStamp(sub, PushMessageVariants.streakSave(streak));
                return;
            }
        }

        if (!isRegularSlot) return;

        // Regular slot dispatch.
        PushMessageVariants.Message picked = null;
        if (loggedToday) {
            int deposit = calorieBankService.getTodayDeposit(sub.getUserId(), today);
            if (deposit >= 100 && sub.isNotifyBankWin()) {
                picked = bankWinMessage(deposit);
            } else if (sub.isNotifyStreak()) {
                int streak = calculateStreak(sub.getUserId(), today);
                if (streak >= 3) picked = PushMessageVariants.streakMilestone(streak);
            }
        } else {
            // No log yet — if a 3+ streak is at risk, hold the reminder for
            // the streak-save slot rather than firing a generic nudge now.
            // Falls back to daily log only when there's no streak to protect.
            int streak = sub.isNotifyStreak() ? calculateStreak(sub.getUserId(), today) : 0;
            boolean willSaveLater = streak >= 3
                    && sub.isNotifyStreak()
                    && sub.getReminderHour() < STREAK_SAVE_HOUR;
            if (!willSaveLater && sub.isNotifyDailyLog()) {
                picked = PushMessageVariants.dailyLog();
            }
        }
        if (picked != null) deliverAndStamp(sub, picked);
    }

    private PushMessageVariants.Message bankWinMessage(int deposit) {
        PushMessageVariants.Message base = PushMessageVariants.bankWin();
        // Inject the actual deposit number into the title so the user sees the
        // win as concretely as the old "+N in bank" version.
        return new PushMessageVariants.Message(
                base.title() + " — +" + deposit + " kcal",
                base.body()
        );
    }

    private void deliverAndStamp(PushSubscriptionEntity sub, PushMessageVariants.Message msg) {
        boolean dead = pushNotificationService.send(sub, msg.title(), msg.body());
        if (dead) {
            subscriptionRepository.delete(sub);
            log.info("Removed dead push subscription id={} platform={}", sub.getId(), sub.getPlatform());
            return;
        }
        sub.setLastSentAt(OffsetDateTime.now(ZoneOffset.UTC));
        subscriptionRepository.save(sub);
    }

    private boolean alreadySentToday(PushSubscriptionEntity sub, ZoneId zone, LocalDate today) {
        OffsetDateTime last = sub.getLastSentAt();
        if (last == null) return false;
        LocalDate lastLocal = last.atZoneSameInstant(zone).toLocalDate();
        return lastLocal.equals(today);
    }

    private static boolean isQuietHour(int localHour) {
        return localHour >= QUIET_HOURS_START || localHour < QUIET_HOURS_END;
    }

    private int calculateStreak(UUID userId, LocalDate today) {
        // Relax days count as "streak intact" even with no log — that's the promise.
        LocalDate lookbackStart = today.minusDays(365);
        Set<LocalDate> relaxDates = new HashSet<>();
        relaxDayRepository.findByUserIdAndRelaxDateBetween(userId, lookbackStart, today)
                .forEach(r -> relaxDates.add(r.getRelaxDate()));

        int streak = 0;
        LocalDate date = today;
        while (true) {
            if (relaxDates.contains(date)) {
                streak++;
                date = date.minusDays(1);
                if (streak > 365) break;
                continue;
            }
            boolean hasEntry = nutritionEntryRepository
                    .findByUserIdAndEntryDate(userId, date)
                    .map(e -> e.getCaloriesConsumedKcal() != null
                            && e.getCaloriesConsumedKcal().compareTo(BigDecimal.ZERO) > 0)
                    .orElse(false);
            if (!hasEntry) break;
            streak++;
            date = date.minusDays(1);
            if (streak > 365) break;
        }
        return streak;
    }

    private static ZoneId safeZone(String tz) {
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return java.time.ZoneOffset.UTC;
        }
    }
}
