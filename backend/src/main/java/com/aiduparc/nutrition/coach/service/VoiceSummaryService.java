package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.calorieBank.service.CalorieBankService;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.config.CoachInsightProperties;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Generates a short, ~30-second spoken summary of the user's day so far.
 * Text comes from the snapshot deterministically (no LLM = no surprises),
 * audio comes from OpenAI's TTS endpoint. Output is MP3 bytes streamed
 * straight to the caller; no on-disk caching for now.
 */
@Service
@Transactional(readOnly = true)
public class VoiceSummaryService {

    private static final Logger log = LoggerFactory.getLogger(VoiceSummaryService.class);
    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";
    private static final String DEFAULT_TTS_MODEL = "tts-1";
    private static final String DEFAULT_VOICE = "nova";

    private final UserProfileRepository userProfileRepository;
    private final DailyNutritionEntryRepository dailyEntryRepository;
    private final CalorieBankService calorieBankService;
    private final CoachSnapshotService snapshotService;
    private final CoachInsightProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public VoiceSummaryService(
        UserProfileRepository userProfileRepository,
        DailyNutritionEntryRepository dailyEntryRepository,
        CalorieBankService calorieBankService,
        CoachSnapshotService snapshotService,
        CoachInsightProperties properties,
        ObjectMapper objectMapper
    ) {
        this.userProfileRepository = userProfileRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.calorieBankService = calorieBankService;
        this.snapshotService = snapshotService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(timeoutMs()))
            .build();
    }

    public byte[] generate(UUID userId, LocalDate today, ZoneId zone) {
        if (!"openai".equalsIgnoreCase(properties.provider())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Voice summary needs nutrition.coach.provider=openai");
        }
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "OPENAI_API_KEY required for voice summary");
        }

        String text = buildText(userId, today, zone);
        return invokeTts(apiKey.trim(), text);
    }

    private String buildText(UUID userId, LocalDate today, ZoneId zone) {
        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Optional<DailyNutritionEntryEntity> todayEntry = dailyEntryRepository
            .findByUserIdAndEntryDate(userId, today);
        int target = profile.getDailyCalorieTargetKcal().intValue();
        int consumed = todayEntry.map(e -> e.getCaloriesConsumedKcal().intValue()).orElse(0);
        int remaining = Math.max(0, target - consumed);

        Optional<DailyNutritionEntryEntity> yesterdayEntry = dailyEntryRepository
            .findByUserIdAndEntryDate(userId, today.minusDays(1));
        int yKcal = yesterdayEntry.map(e -> e.getCaloriesConsumedKcal().intValue()).orElse(0);
        int yTarget = yesterdayEntry.map(e -> e.getCalorieTargetKcal() != null
            ? e.getCalorieTargetKcal().intValue() : target).orElse(target);

        CoachSnapshotResponse snapshot = snapshotService.buildSnapshot(userId, today, 7, zone);
        int streak = snapshot.totals() != null ? snapshot.totals().noOverrunStreakDays() : 0;
        int bank = 0;
        try {
            bank = calorieBankService.getSnapshot(userId, today).bank();
        } catch (RuntimeException ignored) {
        }

        StringBuilder sb = new StringBuilder();
        sb.append(greeting(zone)).append(". ");

        if (consumed > 0) {
            sb.append("So far today, ").append(consumed).append(" calories. ");
            sb.append("You have ").append(remaining).append(" left to hit your target. ");
        } else {
            sb.append("Your target today is ").append(target).append(" calories. ");
        }

        if (yKcal > 0) {
            int delta = yKcal - yTarget;
            if (delta > 50) {
                sb.append("Yesterday you went ").append(delta).append(" calories over. ");
            } else if (delta < -50) {
                sb.append("Yesterday you came in ").append(Math.abs(delta)).append(" under target — well done. ");
            } else {
                sb.append("Yesterday you landed right on target. ");
            }
        }

        if (streak >= 3) {
            sb.append("Streak: ").append(streak).append(" days inside target. ");
        }
        if (bank >= 200) {
            sb.append("Your bank is plus ").append(bank).append(" calories. ");
        }

        // Single concrete suggestion based on what's missing today.
        if (remaining > 600 && consumed > 0) {
            sb.append("Plenty of room left — keep dinner balanced.");
        } else if (consumed == 0) {
            sb.append("Start with a protein-forward breakfast — 30 grams will set you up well.");
        } else if (remaining < 200) {
            sb.append("Tight margin tonight. Keep dinner under ").append(Math.max(0, remaining)).append(" calories.");
        } else {
            sb.append("On track. Let's keep it steady.");
        }

        return sb.toString();
    }

    private String greeting(ZoneId zone) {
        int hour = java.time.ZonedDateTime.now(zone).getHour();
        if (hour < 5)  return "Still up?";
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        if (hour < 22) return "Good evening";
        return "Late check-in";
    }

    private byte[] invokeTts(String apiKey, String text) {
        try {
            String endpoint = normalizeBaseUrl() + "/audio/speech";
            String payload = objectMapper.writeValueAsString(Map.of(
                "model", DEFAULT_TTS_MODEL,
                "input", text,
                "voice", DEFAULT_VOICE,
                "format", "mp3"
            ));

            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMillis(timeoutMs()))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 400) {
                String body = new String(response.body() != null ? response.body() : new byte[0]);
                log.warn("OpenAI TTS error status={} body={}", response.statusCode(), body);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "OpenAI TTS error " + response.statusCode());
            }
            byte[] body = response.body();
            if (body == null || body.length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty TTS response");
            }
            return body;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TTS request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TTS interrupted", e);
        }
    }

    private String normalizeBaseUrl() {
        String configured = properties.openai().baseUrl();
        String value = (configured == null || configured.isBlank()) ? DEFAULT_BASE_URL : configured.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private int timeoutMs() {
        int configured = properties.openai().timeoutMs();
        return configured > 0 ? configured : 30_000;
    }

    @SuppressWarnings("unused")
    private static List<String> noop() { return List.of(); }
}
