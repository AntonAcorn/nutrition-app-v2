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

    public void send(PushSubscriptionEntity sub, String title, String body) {
        if ("apns".equals(sub.getPlatform())) {
            apnsPushService.send(sub.getDeviceToken(), title, body);
        } else {
            sendWebPush(sub, title, body);
        }
    }

    private void sendWebPush(PushSubscriptionEntity sub, String title, String body) {
        if (webPushService == null) return;
        String payload = """
                {"title":"%s","body":"%s"}
                """.formatted(escape(title), escape(body)).strip();
        try {
            Subscription subscription = new Subscription(
                    sub.getEndpoint(),
                    new Subscription.Keys(sub.getP256dh(), sub.getAuth())
            );
            webPushService.send(new Notification(subscription, payload));
        } catch (Exception e) {
            log.warn("Failed to send web push to user={} endpoint={}: {}", sub.getUserId(), sub.getEndpoint(), e.getMessage());
        }
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
