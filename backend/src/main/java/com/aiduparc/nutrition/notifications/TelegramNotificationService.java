package com.aiduparc.nutrition.notifications;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TelegramNotificationService {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotificationService.class);
    private static final String API_BASE = "https://api.telegram.org/bot";

    private final TelegramProperties properties;
    private final HttpClient httpClient;

    public TelegramNotificationService(TelegramProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public void notifyNewUser(String email, String displayName) {
        if (!properties.enabled()) {
            return;
        }
        String text = "New user: " + displayName + " (" + email + ")";
        String url = API_BASE + properties.botToken() + "/sendMessage";
        String body = "{\"chat_id\":\"" + properties.chatId() + "\",\"text\":\"" + escapeJson(text) + "\"}";

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() >= 400) {
                log.warn("Telegram notification failed with status {}", response.statusCode());
            }
        } catch (Exception e) {
            log.warn("Telegram notification failed: {}", e.getMessage());
        }
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
