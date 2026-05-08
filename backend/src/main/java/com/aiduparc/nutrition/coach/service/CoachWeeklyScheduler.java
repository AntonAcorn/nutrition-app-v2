package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.CoachInsightResponse;
import com.aiduparc.nutrition.coach.repository.UserInsightRepository;
import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Weekly job that auto-generates coach insights for active users and
 * pushes a notification when new cards are produced. Fires every hour
 * and emits to users whose local clock just passed Sunday 18:00.
 *
 * Each user gets at most one notification per ~23h window thanks to
 * the recency guard, so transient cron retries don't spam.
 */
@Component
public class CoachWeeklyScheduler {

    private static final Logger log = LoggerFactory.getLogger(CoachWeeklyScheduler.class);
    private static final DayOfWeek FIRE_DAY = DayOfWeek.SUNDAY;
    private static final int FIRE_HOUR = 18;

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final CoachInsightService coachInsightService;
    private final UserInsightRepository insightRepository;

    public CoachWeeklyScheduler(
        PushSubscriptionRepository subscriptionRepository,
        PushNotificationService pushNotificationService,
        CoachInsightService coachInsightService,
        UserInsightRepository insightRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.coachInsightService = coachInsightService;
        this.insightRepository = insightRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void sendWeeklyInsights() {
        List<PushSubscriptionEntity> active = subscriptionRepository.findByEnabled(true);
        if (active.isEmpty()) return;

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime recencyCutoff = now.minusHours(23);

        for (PushSubscriptionEntity sub : active) {
            try {
                ZoneId zone = safeZone(sub.getTimezone());
                ZonedDateTime local = ZonedDateTime.now(zone);
                if (local.getDayOfWeek() != FIRE_DAY || local.getHour() != FIRE_HOUR) continue;

                long recent = insightRepository.countByUserIdAndGeneratedAtAfter(sub.getUserId(), recencyCutoff);
                if (recent > 0) continue;

                LocalDate today = LocalDate.now(zone);
                CoachInsightResponse insights = coachInsightService.refresh(
                    sub.getUserId(), today, 7, zone, null);

                if (insights.cards().isEmpty()) continue;

                String title = "Coach has new insights";
                String body = insights.cards().get(0).title();
                pushNotificationService.send(sub, title, body);
            } catch (Exception e) {
                log.warn("Coach weekly scheduler error for subscription {}: {}", sub.getId(), e.getMessage());
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
