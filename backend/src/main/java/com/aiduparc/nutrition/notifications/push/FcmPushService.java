package com.aiduparc.nutrition.notifications.push;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Android native push delivery. The Capacitor app on Android registers via
 * @capacitor/push-notifications, which under the hood uses Firebase Cloud
 * Messaging and returns an FCM device token. We store it with platform="fcm"
 * and route deliveries through this service.
 *
 * <p>Configured by splitting a Firebase service-account JSON key into three
 * env vars so no .json file needs to ship with the build:
 * <ul>
 *   <li>FIREBASE_PROJECT_ID — visible in the Firebase Console settings</li>
 *   <li>FIREBASE_CLIENT_EMAIL — service-account email
 *       (firebase-adminsdk-...@PROJECT.iam.gserviceaccount.com)</li>
 *   <li>FIREBASE_PRIVATE_KEY — the PEM block; in env vars, literal \n
 *       sequences are converted to real newlines before parsing.</li>
 * </ul>
 *
 * <p>If any of the three is missing, push is silently disabled — same
 * pattern as ApnsPushService for ungated dev environments.
 */
@Service
public class FcmPushService {

    private static final Logger log = LoggerFactory.getLogger(FcmPushService.class);

    private final FirebaseMessaging messaging;

    public FcmPushService(
            @Value("${nutrition.push.fcm.project-id:}") String projectId,
            @Value("${nutrition.push.fcm.client-email:}") String clientEmail,
            @Value("${nutrition.push.fcm.private-key:}") String privateKey
    ) throws Exception {
        if (!StringUtils.hasText(projectId)
                || !StringUtils.hasText(clientEmail)
                || !StringUtils.hasText(privateKey)) {
            log.warn("FCM credentials not configured — Android push notifications disabled");
            this.messaging = null;
            return;
        }
        // Env vars can't contain real newlines easily; convention is to use \n
        // and let the consumer unescape.
        String pemKey = privateKey.replace("\\n", "\n");
        String serviceAccountJson = ""
                + "{\"type\":\"service_account\","
                + "\"project_id\":\"" + projectId + "\","
                + "\"client_email\":\"" + clientEmail + "\","
                + "\"private_key\":\"" + pemKey.replace("\n", "\\n").replace("\"", "\\\"") + "\"}";

        GoogleCredentials credentials = GoogleCredentials.fromStream(
                new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8)));
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .setProjectId(projectId)
                .build();
        // Named app so we don't clash with other FirebaseApp consumers.
        FirebaseApp app = FirebaseApp.getApps().stream()
                .filter(a -> "nutrition".equals(a.getName()))
                .findFirst()
                .orElseGet(() -> FirebaseApp.initializeApp(options, "nutrition"));
        this.messaging = FirebaseMessaging.getInstance(app);
        log.info("FCM client initialized: project={}", projectId);
    }

    /**
     * @return true when the token is permanently invalid and the caller
     *         should delete the subscription.
     */
    public boolean send(String deviceToken, String title, String body) {
        if (messaging == null) return false;
        Message message = Message.builder()
                .setToken(deviceToken)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .build();
        try {
            messaging.send(message);
            return false;
        } catch (FirebaseMessagingException e) {
            MessagingErrorCode code = e.getMessagingErrorCode();
            // UNREGISTERED + INVALID_ARGUMENT are terminal — token will never deliver again.
            if (code == MessagingErrorCode.UNREGISTERED
                    || code == MessagingErrorCode.INVALID_ARGUMENT
                    || code == MessagingErrorCode.SENDER_ID_MISMATCH) {
                log.warn("FCM rejected push for token={}: {}", deviceToken, code);
                return true;
            }
            log.warn("FCM send failed for token={}: {}", deviceToken, e.getMessage());
            return false;
        }
    }
}
