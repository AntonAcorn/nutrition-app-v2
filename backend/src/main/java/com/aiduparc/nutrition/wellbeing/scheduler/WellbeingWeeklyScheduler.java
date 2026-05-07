package com.aiduparc.nutrition.wellbeing.scheduler;

import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import com.aiduparc.nutrition.wellbeing.model.WellbeingWeeklyTrackingEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingWeeklyTrackingRepository;
import com.aiduparc.nutrition.wellbeing.service.WellbeingService;
import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class WellbeingWeeklyScheduler {

    private static final Logger log = LoggerFactory.getLogger(WellbeingWeeklyScheduler.class);
    private static final int SEND_HOUR = 18; // local hour to send weekly report
    private static final long MIN_DAYS_BETWEEN_REPORTS = 6;

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final WellbeingWeeklyTrackingRepository trackingRepository;
    private final WellbeingService wellbeingService;

    public WellbeingWeeklyScheduler(
            PushSubscriptionRepository pushSubscriptionRepository,
            PushNotificationService pushNotificationService,
            WellbeingWeeklyTrackingRepository trackingRepository,
            WellbeingService wellbeingService
    ) {
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.trackingRepository = trackingRepository;
        this.wellbeingService = wellbeingService;
    }

    @Scheduled(cron = "0 0 * * * *") // every hour
    @Transactional
    public void sendWeeklyReports() {
        List<PushSubscriptionEntity> active = pushSubscriptionRepository.findByEnabled(true);
        if (active.isEmpty()) return;

        for (PushSubscriptionEntity sub : active) {
            try {
                ZoneId zone = safeZone(sub.getTimezone());
                ZonedDateTime localNow = ZonedDateTime.now(zone);

                if (localNow.getDayOfWeek() != DayOfWeek.SUNDAY) continue;
                if (localNow.getHour() != SEND_HOUR) continue;

                // Prevent duplicate sends within 6 days
                boolean alreadySentThisWeek = trackingRepository
                    .findTopByUserIdOrderBySentAtDesc(sub.getUserId())
                    .map(t -> t.getSentAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC).minusDays(MIN_DAYS_BETWEEN_REPORTS)))
                    .orElse(false);

                if (alreadySentThisWeek) continue;

                String title;
                String body;

                WellbeingService.WeeklyReport report = wellbeingService.computeWeeklyReport(sub.getUserId());

                if (!report.hasData()) {
                    title = "Weekly energy check ⚡";
                    body = "Keep responding to after-meal prompts — your energy profile is building.";
                } else if (report.topFood() != null) {
                    title = "Your weekly energy report ⚡";
                    body = String.format("%s gave you top energy this week. Avg: %.1f/5. Open Stats to see more.", report.topFood(), report.avgRating());
                } else {
                    title = "Weekly energy check ⚡";
                    body = String.format("Your energy this week averaged %.1f/5. Keep logging to see patterns.", report.avgRating());
                }

                pushNotificationService.send(sub, title, body);

                WellbeingWeeklyTrackingEntity tracking = new WellbeingWeeklyTrackingEntity();
                tracking.setUserId(sub.getUserId());
                trackingRepository.save(tracking);

                log.info("wellbeing weekly report sent userId={}", sub.getUserId());

            } catch (Exception e) {
                log.warn("wellbeing weekly scheduler error for sub={}: {}", sub.getId(), e.getMessage());
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
