package com.aiduparc.nutrition.notifications.push;

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
import java.util.List;

@Component
public class PushScheduler {

    private static final Logger log = LoggerFactory.getLogger(PushScheduler.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final DailyNutritionEntryRepository nutritionEntryRepository;
    private final CalorieBankService calorieBankService;

    public PushScheduler(
            PushSubscriptionRepository subscriptionRepository,
            PushNotificationService pushNotificationService,
            DailyNutritionEntryRepository nutritionEntryRepository,
            CalorieBankService calorieBankService
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.nutritionEntryRepository = nutritionEntryRepository;
        this.calorieBankService = calorieBankService;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void sendReminders() {
        List<PushSubscriptionEntity> active = subscriptionRepository.findByEnabled(true);
        if (active.isEmpty()) return;

        int currentUtcHour = ZonedDateTime.now(java.time.ZoneOffset.UTC).getHour();

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

                if (loggedToday) {
                    int deposit = calorieBankService.getTodayDeposit(sub.getUserId(), today);
                    if (deposit >= 100) {
                        pushNotificationService.send(sub,
                                "🏦 +" + deposit + " in bank",
                                "Stayed under target today — saving up for the weekend.");
                    } else {
                        int streak = calculateStreak(sub.getUserId(), today);
                        if (streak >= 3) {
                            pushNotificationService.send(sub,
                                    "Day " + streak + " streak! 🔥",
                                    "You've logged every day for " + streak + " days. Keep going!");
                        }
                    }
                } else {
                    pushNotificationService.send(sub,
                            "Don't forget to log today 🍽",
                            "A quick photo or description takes 10 seconds.");
                }
            } catch (Exception e) {
                log.warn("Scheduler error for subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private int calculateStreak(java.util.UUID userId, LocalDate today) {
        int streak = 0;
        LocalDate date = today;
        while (true) {
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
