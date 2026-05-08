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
    /** gpt-4o-mini-tts is the newer, more expressive model and it accepts an
     *  `instructions` field for tone control. Falls back via env var if it's
     *  not yet available on a given key. */
    private static final String DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
    /** 'coral' and 'sage' read as the warmest in conversational use. */
    private static final String DEFAULT_VOICE = "coral";
    private static final String DEFAULT_INSTRUCTIONS = String.join(" ",
        "Speak as a warm, calm friend who actually cares.",
        "Conversational, not robotic. Natural micro-pauses between sentences.",
        "Slight smile in the voice. Don't sound rehearsed or sales-y.",
        "Numbers spoken naturally, not over-articulated."
    );

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
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "OPENAI_API_KEY required for voice summary");
        }

        // Try the LLM-generated personal script first; fall back to a tight
        // rule-based template if the model call fails. The TTS step is the
        // same in both cases.
        String text;
        try {
            text = generateScriptViaLlm(apiKey.trim(), userId, today, zone);
        } catch (RuntimeException ex) {
            log.debug("voice summary llm script failed, falling back: {}", ex.getMessage());
            text = buildText(userId, today, zone);
        }
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

    private static final String SCRIPT_SYSTEM_PROMPT = String.join(" ",
        "You write a 25-30 second spoken brief for a nutrition coach app.",
        "It is read aloud by a TTS — write it like a friend speaking, not like a written report.",
        "",
        "CRITICAL: the user already sees today's calories, target, remaining,",
        "weight, streak, and bank balance on screen. Do NOT recite those numbers.",
        "If you find yourself saying 'so far today you've had X calories' — delete it.",
        "",
        "What to say instead — pick ONE or TWO of these:",
        "  - a multi-day pattern from the snapshot (week-over-week, day-of-week,",
        "    sleep × meals, slot × wellbeing) the user wouldn't notice on their own",
        "  - a specific food they actually logged (use the exact name from",
        "    recentMeals — never invent dish names) tied to a result",
        "  - a concrete action for the next meal/today",
        "",
        "Style:",
        "  - 70-90 words total. ~25-30 seconds when spoken.",
        "  - Address the user by first name once at the open if profile.displayName is set.",
        "  - Conversational sentences, contractions ('you're', 'that's'), short clauses.",
        "  - End on a single, concrete suggestion. Not 'consider' / 'try to' /",
        "    'aim for' — use 'add', 'move', 'swap', 'cut'.",
        "  - No emoji, no markdown, no asterisks, no list bullets — plain prose only.",
        "  - Numbers should feel natural ('a hundred and eighty grams', not '180 g').",
        "  - If the snapshot is too thin (logged_days < 4), produce a short single-sentence",
        "    encouragement that names the user and asks them to log a couple more days."
    );

    private String generateScriptViaLlm(String apiKey, UUID userId, LocalDate today, ZoneId zone) {
        var snapshot = snapshotService.buildSnapshot(userId, today, 14, zone);
        String snapshotJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(snapshot);
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize snapshot", e);
        }

        try {
            String endpoint = normalizeBaseUrl() + "/chat/completions";
            String chatModel = properties.openai().model();
            java.util.LinkedHashMap<String, Object> chatBody = new java.util.LinkedHashMap<>();
            chatBody.put("model", chatModel);
            chatBody.put("temperature", 0.55);
            chatBody.put("messages", List.of(
                Map.of("role", "system", "content", SCRIPT_SYSTEM_PROMPT),
                Map.of("role", "user", "content", "Snapshot:\n" + snapshotJson)
            ));

            HttpRequest req = HttpRequest.newBuilder(URI.create(endpoint))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMillis(timeoutMs()))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(chatBody)))
                .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 400) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI script error " + res.statusCode());
            }
            var root = objectMapper.readTree(res.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("").trim();
            if (content.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty script");
            }
            return content;
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Voice script request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Voice script interrupted", e);
        }
    }

    private byte[] invokeTts(String apiKey, String text) {
        try {
            String endpoint = normalizeBaseUrl() + "/audio/speech";
            // Build the request body manually so 'instructions' (only
            // supported on gpt-4o-mini-tts) is included.
            java.util.LinkedHashMap<String, Object> requestBody = new java.util.LinkedHashMap<>();
            requestBody.put("model", DEFAULT_TTS_MODEL);
            requestBody.put("input", text);
            requestBody.put("voice", DEFAULT_VOICE);
            requestBody.put("format", "mp3");
            requestBody.put("instructions", DEFAULT_INSTRUCTIONS);
            String payload = objectMapper.writeValueAsString(requestBody);

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
