package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.WeeklyRecapResponse;
import com.aiduparc.nutrition.coach.repository.CoachWeeklyRecapRepository;
import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Weekly job that generates Spotify-Wrapped style recaps for active users
 * every Sunday at 18:00 local time and pushes a notification when a fresh
 * recap is produced. Fires every hour and only acts at the user's local
 * Sunday 18:00.
 */
@Component
public class CoachWeeklyScheduler {

    private static final Logger log = LoggerFactory.getLogger(CoachWeeklyScheduler.class);
    private static final DayOfWeek FIRE_DAY = DayOfWeek.SUNDAY;
    private static final int FIRE_HOUR = 18;

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final WeeklyRecapService weeklyRecapService;
    private final CoachWeeklyRecapRepository recapRepository;

    public CoachWeeklyScheduler(
        PushSubscriptionRepository subscriptionRepository,
        PushNotificationService pushNotificationService,
        WeeklyRecapService weeklyRecapService,
        CoachWeeklyRecapRepository recapRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.weeklyRecapService = weeklyRecapService;
        this.recapRepository = recapRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void sendWeeklyRecaps() {
        List<PushSubscriptionEntity> active = subscriptionRepository.findByEnabled(true);
        if (active.isEmpty()) return;

        for (PushSubscriptionEntity sub : active) {
            try {
                ZoneId zone = safeZone(sub.getTimezone());
                ZonedDateTime local = ZonedDateTime.now(zone);
                if (local.getDayOfWeek() != FIRE_DAY || local.getHour() != FIRE_HOUR) continue;

                LocalDate today = LocalDate.now(zone);
                LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

                // Idempotent: skip if a recap for this week already exists.
                if (recapRepository.findByUserIdAndWeekStart(sub.getUserId(), weekStart).isPresent()) continue;

                WeeklyRecapResponse recap = weeklyRecapService.generateForCurrentWeek(
                    sub.getUserId(), today, zone, null);
                if (recap == null) continue;

                String title = "Your weekly recap is ready";
                String body = recap.shareLine() != null && !recap.shareLine().isBlank()
                    ? recap.shareLine()
                    : recap.highlight() != null ? recap.highlight().title() : "Tap to see your week.";
                pushNotificationService.send(sub, title, body);
            } catch (Exception e) {
                log.warn("Coach weekly recap scheduler error for subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private static ZoneId safeZone(String tz) {
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneOffset.UTC;
        }
    }
}
