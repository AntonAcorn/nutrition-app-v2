package com.aiduparc.nutrition.coach.trigger;

import com.aiduparc.nutrition.coach.model.CoachTriggerEntity;
import com.aiduparc.nutrition.coach.repository.CoachTriggerRepository;
import com.aiduparc.nutrition.coach.trigger.TriggerDetector.TriggerPayload;
import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hourly cron that runs every registered TriggerDetector against every
 * active push subscription. For each (user, detector):
 *   1. skip if the detector's firing window doesn't match the user's
 *      local time (cheap)
 *   2. skip if the same trigger fired for this user inside its cooldown
 *      (one DB query)
 *   3. otherwise let the detector decide based on data
 *   4. if it fires — send the push and persist the row so we don't
 *      double-send on the next cron tick
 */
@Component
public class CoachTriggerScheduler {

    private static final Logger log = LoggerFactory.getLogger(CoachTriggerScheduler.class);

    private final List<TriggerDetector> detectors;
    private final PushSubscriptionRepository subscriptionRepository;
    private final PushNotificationService pushNotificationService;
    private final CoachTriggerRepository triggerRepository;

    public CoachTriggerScheduler(
        List<TriggerDetector> detectors,
        PushSubscriptionRepository subscriptionRepository,
        PushNotificationService pushNotificationService,
        CoachTriggerRepository triggerRepository
    ) {
        this.detectors = detectors;
        this.subscriptionRepository = subscriptionRepository;
        this.pushNotificationService = pushNotificationService;
        this.triggerRepository = triggerRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void tick() {
        List<PushSubscriptionEntity> subs = subscriptionRepository.findByEnabled(true);
        if (subs.isEmpty()) return;

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (PushSubscriptionEntity sub : subs) {
            ZoneId zone = safeZone(sub.getTimezone());
            ZonedDateTime localNow = ZonedDateTime.now(zone);
            LocalDate today = localNow.toLocalDate();

            for (TriggerDetector detector : detectors) {
                try {
                    if (!detector.isFiringWindow(localNow)) continue;
                    if (onCooldown(sub.getUserId(), detector, now)) continue;

                    Optional<TriggerPayload> payload = detector.detect(sub.getUserId(), today, zone);
                    if (payload.isEmpty()) continue;

                    fire(sub, detector, payload.get(), now);
                } catch (Exception e) {
                    log.warn("trigger detector {} failed for sub {}: {}",
                        detector.kind(), sub.getId(), e.getMessage());
                }
            }
        }
    }

    private boolean onCooldown(java.util.UUID userId, TriggerDetector detector, OffsetDateTime now) {
        Duration cooldown = detector.cooldown();
        if (cooldown == null || cooldown.isZero()) return false;
        OffsetDateTime cutoff = now.minus(cooldown);
        return triggerRepository.existsByUserIdAndKindAndFiredAtAfter(userId, detector.kind(), cutoff);
    }

    @Transactional
    protected void fire(
        PushSubscriptionEntity sub,
        TriggerDetector detector,
        TriggerPayload payload,
        OffsetDateTime now
    ) {
        try {
            pushNotificationService.send(sub, payload.pushTitle(), payload.pushBody());
        } catch (Exception e) {
            log.warn("trigger push send failed kind={} sub={}: {}",
                detector.kind(), sub.getId(), e.getMessage());
            return;
        }

        CoachTriggerEntity row = new CoachTriggerEntity();
        row.setUserId(sub.getUserId());
        row.setKind(detector.kind());
        row.setFiredAt(now);
        row.setPayloadJson(payload.anchor()); // small enough to live as text
        triggerRepository.save(row);

        log.info("coach trigger fired userId={} kind={}", sub.getUserId(), detector.kind());
    }

    private static ZoneId safeZone(String tz) {
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneOffset.UTC;
        }
    }
}
