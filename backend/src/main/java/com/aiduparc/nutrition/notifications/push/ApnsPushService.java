package com.aiduparc.nutrition.notifications.push;

import com.eatthepath.pushy.apns.ApnsClient;
import com.eatthepath.pushy.apns.ApnsClientBuilder;
import com.eatthepath.pushy.apns.PushNotificationResponse;
import com.eatthepath.pushy.apns.util.SimpleApnsPayloadBuilder;
import com.eatthepath.pushy.apns.util.SimpleApnsPushNotification;
import com.eatthepath.pushy.apns.util.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.annotation.PreDestroy;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutionException;

@Service
public class ApnsPushService {

    private static final Logger log = LoggerFactory.getLogger(ApnsPushService.class);

    private final ApnsClient apnsClient;
    private final String bundleId;

    public ApnsPushService(
            @Value("${nutrition.push.apns.key:}") String apnsKey,
            @Value("${nutrition.push.apns.key-id:}") String keyId,
            @Value("${nutrition.push.apns.team-id:}") String teamId,
            @Value("${nutrition.push.apns.bundle-id:com.aiduparc.rumblyeats}") String bundleId
    ) throws Exception {
        this.bundleId = bundleId;
        if (StringUtils.hasText(apnsKey) && StringUtils.hasText(keyId) && StringUtils.hasText(teamId)) {
            this.apnsClient = new ApnsClientBuilder()
                    .setApnsServer(ApnsClientBuilder.PRODUCTION_APNS_HOST)
                    .setSigningKey(com.eatthepath.pushy.apns.auth.ApnsSigningKey.loadFromInputStream(
                            new ByteArrayInputStream(apnsKey.getBytes(StandardCharsets.UTF_8)),
                            teamId, keyId))
                    .build();
            log.info("APNs client initialized for bundle: {}", bundleId);
        } else {
            log.warn("APNs credentials not configured — native push notifications disabled");
            this.apnsClient = null;
        }
    }

    public void send(String deviceToken, String title, String body) {
        if (apnsClient == null) return;
        try {
            String payload = new SimpleApnsPayloadBuilder()
                    .setAlertTitle(title)
                    .setAlertBody(body)
                    .build();
            String token = TokenUtil.sanitizeTokenString(deviceToken);
            SimpleApnsPushNotification notification = new SimpleApnsPushNotification(token, bundleId, payload);
            PushNotificationResponse<SimpleApnsPushNotification> response =
                    apnsClient.sendNotification(notification).get();
            if (!response.isAccepted()) {
                log.warn("APNs rejected push for token={}: {}", deviceToken, response.getRejectionReason().orElse("unknown"));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("APNs send interrupted for token={}", deviceToken);
        } catch (ExecutionException e) {
            log.warn("APNs send failed for token={}: {}", deviceToken, e.getMessage());
        }
    }

    @PreDestroy
    void shutdown() {
        if (apnsClient != null) {
            try {
                apnsClient.close();
            } catch (Exception ignored) {}
        }
    }
}
