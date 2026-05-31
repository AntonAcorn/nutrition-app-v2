package com.aiduparc.nutrition.notifications.push;

import java.security.Security;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    private final PushService webPushService;
    private final ApnsPushService apnsPushService;

    public PushNotificationService(
            @Value("${nutrition.push.vapid-public-key:}") String vapidPublicKey,
            @Value("${nutrition.push.vapid-private-key:}") String vapidPrivateKey,
            @Value("${nutrition.push.vapid-subject:mailto:admin@rumblyeats.org}") String vapidSubject,
            ApnsPushService apnsPushService
    ) throws Exception {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (StringUtils.hasText(vapidPublicKey) && StringUtils.hasText(vapidPrivateKey)) {
            this.webPushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
        } else {
            log.warn("VAPID keys not configured — web push notifications disabled");
            this.webPushService = null;
        }
        this.apnsPushService = apnsPushService;
    }

    /**
     * @return true when the subscription is permanently dead and the caller
     *         should delete it (stale APNs token, 404/410 web-push endpoint).
     */
    public boolean send(PushSubscriptionEntity sub, String title, String body) {
        if ("apns".equals(sub.getPlatform())) {
            return apnsPushService.send(sub.getDeviceToken(), title, body);
        }
        return sendWebPush(sub, title, body);
    }

    private boolean sendWebPush(PushSubscriptionEntity sub, String title, String body) {
        if (webPushService == null) return false;
        String payload = """
                {"title":"%s","body":"%s"}
                """.formatted(escape(title), escape(body)).strip();
        try {
            Subscription subscription = new Subscription(
                    sub.getEndpoint(),
                    new Subscription.Keys(sub.getP256dh(), sub.getAuth())
            );
            var response = webPushService.send(new Notification(subscription, payload));
            int status = response.getStatusLine().getStatusCode();
            // 404 / 410 mean the browser revoked the subscription — never deliver again.
            return status == 404 || status == 410;
        } catch (Exception e) {
            log.warn("Failed to send web push to user={} endpoint={}: {}", sub.getUserId(), sub.getEndpoint(), e.getMessage());
            return false;
        }
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
