package com.aiduparc.nutrition.wellbeing.scheduler;

import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import com.aiduparc.nutrition.wellbeing.api.FoodRatingItem;
import com.aiduparc.nutrition.wellbeing.api.WellbeingInsightsResponse;
import com.aiduparc.nutrition.wellbeing.model.WellbeingPatternNotificationEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingPatternNotificationRepository;
import com.aiduparc.nutrition.wellbeing.service.WellbeingService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class WellbeingPatternScheduler {

    private static final Logger log = LoggerFactory.getLogger(WellbeingPatternScheduler.class);

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final WellbeingService wellbeingService;
    private final WellbeingPatternNotificationRepository patternNotificationRepository;

    public WellbeingPatternScheduler(
            PushSubscriptionRepository pushSubscriptionRepository,
            PushNotificationService pushNotificationService,
            WellbeingService wellbeingService,
            WellbeingPatternNotificationRepository patternNotificationRepository
    ) {
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.wellbeingService = wellbeingService;
        this.patternNotificationRepository = patternNotificationRepository;
    }

    @Scheduled(cron = "0 0 10 * * *") // daily at 10:00 UTC
    @Transactional
    public void checkNewPatterns() {
        List<PushSubscriptionEntity> active = pushSubscriptionRepository.findByEnabled(true);
        if (active.isEmpty()) return;

        for (PushSubscriptionEntity sub : active) {
            try {
                processUser(sub);
            } catch (Exception e) {
                log.warn("pattern scheduler error for sub={}: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private void processUser(PushSubscriptionEntity sub) {
        UUID userId = sub.getUserId();
        WellbeingInsightsResponse insights = wellbeingService.getInsights(userId);
        if (!insights.enoughData()) return;

        Set<String> alreadyNotified = patternNotificationRepository.findFoodKeysByUserId(userId);

        notifyPatterns(sub, userId, insights.energizers(), "good", alreadyNotified);
        notifyPatterns(sub, userId, insights.drainers(), "bad", alreadyNotified);
    }

    private void notifyPatterns(
            PushSubscriptionEntity sub,
            UUID userId,
            List<FoodRatingItem> items,
            String tone,
            Set<String> alreadyNotified
    ) {
        double threshold = "good".equals(tone) ? WellbeingService.GOOD_THRESHOLD : WellbeingService.BAD_THRESHOLD;

        for (FoodRatingItem item : items) {
            boolean meetsThreshold = "good".equals(tone)
                ? item.avgRating() >= threshold
                : item.avgRating() <= threshold;
            if (!meetsThreshold) continue;

            String foodKey = WellbeingService.normalizeName(item.name());
            if (alreadyNotified.contains(foodKey)) continue;

            String title;
            String body;
            if ("good".equals(tone)) {
                title = "⚡ Energy pattern found";
                body = String.format("%s consistently gives you energy (avg %.1f/5 from %d check-ins)",
                    item.name(), item.avgRating(), item.sampleCount());
            } else {
                title = "📊 Energy pattern found";
                body = String.format("%s tends to drain your energy (%.1f/5 from %d check-ins)",
                    item.name(), item.avgRating(), item.sampleCount());
            }

            pushNotificationService.send(sub, title, body);

            WellbeingPatternNotificationEntity record = new WellbeingPatternNotificationEntity();
            record.setUserId(userId);
            record.setFoodKey(foodKey);
            record.setTone(tone);
            patternNotificationRepository.save(record);
            alreadyNotified.add(foodKey);

            log.info("pattern notification sent userId={} food={} tone={}", userId, foodKey, tone);
        }
    }
}
