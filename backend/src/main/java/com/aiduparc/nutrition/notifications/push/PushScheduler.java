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
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class PushScheduler {

    private static final Logger log = LoggerFactory.getLogger(PushScheduler.class);

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
                ZoneId zone = safeZone(sub.getTimezone());
                int localHour = ZonedDateTime.now(zone).getHour();
                if (localHour != sub.getReminderHour()) continue;

                LocalDate today = LocalDate.now(zone);
                boolean loggedToday = nutritionEntryRepository
                        .findByUserIdAndEntryDate(sub.getUserId(), today)
                        .map(e -> e.getCaloriesConsumedKcal() != null
                                && e.getCaloriesConsumedKcal().compareTo(BigDecimal.ZERO) > 0)
                        .orElse(false);

                boolean dead = false;
                if (loggedToday) {
                    int deposit = calorieBankService.getTodayDeposit(sub.getUserId(), today);
                    if (deposit >= 100) {
                        dead = pushNotificationService.send(sub,
                                "🏦 +" + deposit + " in bank",
                                "Stayed under target today — saving up for the weekend.");
                    } else {
                        int streak = calculateStreak(sub.getUserId(), today);
                        if (streak >= 3) {
                            dead = pushNotificationService.send(sub,
                                    "Day " + streak + " streak! 🔥",
                                    "You've logged every day for " + streak + " days. Keep going!");
                        }
                    }
                } else {
                    dead = pushNotificationService.send(sub,
                            "Don't forget to log today 🍽",
                            "A quick photo or description takes 10 seconds.");
                }
                if (dead) {
                    // Token / endpoint is permanently revoked — drop it so we don't
                    // keep paying for failed deliveries every hour.
                    subscriptionRepository.delete(sub);
                    log.info("Removed dead push subscription id={} platform={}", sub.getId(), sub.getPlatform());
                }
            } catch (Exception e) {
                log.warn("Scheduler error for subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private int calculateStreak(java.util.UUID userId, LocalDate today) {
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
