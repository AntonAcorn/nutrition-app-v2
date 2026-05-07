package com.aiduparc.nutrition.wellbeing.scheduler;

import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import com.aiduparc.nutrition.wellbeing.model.WellbeingPushQueueEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingEntryRepository;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingPushQueueRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class WellbeingNotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(WellbeingNotificationScheduler.class);

    private final WellbeingPushQueueRepository queueRepository;
    private final WellbeingEntryRepository entryRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final MealLogEntryRepository mealLogEntryRepository;

    public WellbeingNotificationScheduler(
            WellbeingPushQueueRepository queueRepository,
            WellbeingEntryRepository entryRepository,
            PushSubscriptionRepository pushSubscriptionRepository,
            PushNotificationService pushNotificationService,
            MealLogEntryRepository mealLogEntryRepository
    ) {
        this.queueRepository = queueRepository;
        this.entryRepository = entryRepository;
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.mealLogEntryRepository = mealLogEntryRepository;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void processPending() {
        List<WellbeingPushQueueEntity> ready =
            queueRepository.findByScheduledAtBeforeAndSentAtIsNull(OffsetDateTime.now(ZoneOffset.UTC));

        for (WellbeingPushQueueEntity item : ready) {
            try {
                // Skip if user already responded to a check in the last 3 hours
                boolean recentlyResponded = entryRepository.existsByUserIdAndCreatedAtAfter(
                    item.getUserId(),
                    OffsetDateTime.now(ZoneOffset.UTC).minusHours(3)
                );

                if (!recentlyResponded) {
                    List<PushSubscriptionEntity> subs =
                        pushSubscriptionRepository.findByUserId(item.getUserId())
                            .stream()
                            .filter(PushSubscriptionEntity::isEnabled)
                            .toList();

                    String mealName = mealLogEntryRepository
                        .findTopByUserIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                            item.getUserId(), item.getScheduledAt())
                        .map(MealLogEntryEntity::getName)
                        .orElse(null);

                    String body = mealName != null
                        ? String.format("How's your energy after %s? 🔋", mealName)
                        : "Tap to help us learn your energy patterns 🔋";

                    for (PushSubscriptionEntity sub : subs) {
                        pushNotificationService.send(sub, "How are you feeling?", body);
                    }

                    if (!subs.isEmpty()) {
                        log.info("wellbeing push sent userId={}", item.getUserId());
                    }
                }

                item.setSentAt(OffsetDateTime.now(ZoneOffset.UTC));
                queueRepository.save(item);

            } catch (Exception e) {
                log.warn("wellbeing scheduler error for queue item={}: {}", item.getId(), e.getMessage());
            }
        }
    }
}
