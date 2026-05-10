package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.api.InlineTipResponse;
import com.aiduparc.nutrition.coach.config.CoachInsightProperties;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rule-based "what happens if I add this?" tip shown inline before the user
 * saves a meal. Deliberately stateless and LLM-free so it can refresh as
 * fast as the user types. Three signals:
 *  - resulting % of target after this meal would land
 *  - what time of day they're committing those kcal
 *  - slot context (heavy breakfast leaves the day open vs heavy late dinner)
 */
@Service
@Transactional(readOnly = true)
public class CoachInlineTipService {

    private static final Logger log = LoggerFactory.getLogger(CoachInlineTipService.class);
    private static final BigDecimal MIN_PROBE_KCAL = BigDecimal.valueOf(50);
    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";
    private static final long CACHE_TTL_MS = 5 * 60_000L;
    private static final int KCAL_BUCKET = 50;

    private final UserProfileRepository userProfileRepository;
    private final DailyNutritionEntryRepository dailyEntryRepository;
    private final CoachSnapshotService snapshotService;
    private final CoachInsightProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    /**
     * Tiny in-process cache so rapid keystrokes don't multiply OpenAI calls.
     * Key: userId|slot|kcalBucket. Value: response + insertion timestamp.
     */
    private final ConcurrentHashMap<String, CachedTip> tipCache = new ConcurrentHashMap<>();

    public CoachInlineTipService(
        UserProfileRepository userProfileRepository,
        DailyNutritionEntryRepository dailyEntryRepository,
        CoachSnapshotService snapshotService,
        CoachInsightProperties properties,
        ObjectMapper objectMapper
    ) {
        this.userProfileRepository = userProfileRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.snapshotService = snapshotService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(timeoutMs()))
            .build();
    }

    private record CachedTip(InlineTipResponse tip, long storedAt) {}

    public InlineTipResponse compute(UUID userId, BigDecimal kcal, String slotType, ZoneId zone) {
        if (kcal == null || kcal.compareTo(MIN_PROBE_KCAL) < 0) {
            return muted();
        }

        // Cache lookup first — same user, same slot, same kcal bucket → reuse.
        // Both LLM and rule-based responses are cached; saves work on repeats
        // and aggressive token spend on hot inputs.
        String cacheKey = cacheKey(userId, slotType, kcal.intValue());
        CachedTip cached = tipCache.get(cacheKey);
        if (cached != null && (System.currentTimeMillis() - cached.storedAt()) < CACHE_TTL_MS) {
            return cached.tip();
        }

        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId).orElse(null);
        if (profile == null) return muted();

        int target = profile.getDailyCalorieTargetKcal().intValue();
        if (target <= 0) return muted();

        LocalDate today = LocalDate.now(zone);
        DailyNutritionEntryEntity entry = dailyEntryRepository
            .findByUserIdAndEntryDate(userId, today).orElse(null);
        int alreadyConsumed = entry != null && entry.getCaloriesConsumedKcal() != null
            ? entry.getCaloriesConsumedKcal().intValue() : 0;

        int incoming = kcal.intValue();
        int after = alreadyConsumed + incoming;
        int remaining = target - after;
        double afterRatio = (double) after / target;

        int hour = ZonedDateTime.now(zone).getHour();
        String slot = slotType != null ? slotType.toUpperCase() : null;

        InlineTipResponse base;
        // 1. Over the daily target.
        if (afterRatio > 1.05) {
            int over = after - target;
            base = new InlineTipResponse(
                "over",
                "+" + over + " kcal over today's target. Drop a side, or split this with tomorrow.",
                after, target
            );
        }
        // 2. Will land tight (95-105% of target).
        else if (afterRatio >= 0.95) {
            base = new InlineTipResponse(
                "caution",
                "This puts you at " + Math.round(afterRatio * 100) + "% of target. " +
                "Keep the rest of the day light (≤" + Math.max(0, remaining) + " kcal left).",
                after, target
            );
        }
        // 3. Heavy meal early in the day — flag time-of-day risk.
        else if (("BREAKFAST".equals(slot) || hour < 11) && incoming > target * 0.4) {
            base = new InlineTipResponse(
                "caution",
                "Heavy start — " + incoming + " kcal at breakfast leaves " + remaining + " kcal for the rest of the day.",
                after, target
            );
        }
        // 4. Late-night heavy meal — flag if landing >70% target after 21:00.
        else if (hour >= 21 && afterRatio > 0.7 && incoming > 400) {
            base = new InlineTipResponse(
                "caution",
                "Late dinner of " + incoming + " kcal lands you at " + Math.round(afterRatio * 100) + "% of target.",
                after, target
            );
        }
        // 5. Default: looking good.
        else {
            base = new InlineTipResponse(
                "good",
                "On track — " + remaining + " kcal left after this.",
                after, target
            );
        }

        InlineTipResponse upgraded = upgradeWithLlmIfPossible(userId, today, zone, slot, incoming, base);
        tipCache.put(cacheKey, new CachedTip(upgraded, System.currentTimeMillis()));
        return upgraded;
    }

    public InlineTipResponse computeUtc(UUID userId, BigDecimal kcal, String slotType) {
        return compute(userId, kcal, slotType, ZoneOffset.UTC);
    }

    private static InlineTipResponse muted() {
        return new InlineTipResponse("muted", null, null, null);
    }

    private static String cacheKey(UUID userId, String slot, int kcal) {
        int bucket = Math.max(0, (kcal / KCAL_BUCKET) * KCAL_BUCKET);
        return userId + "|" + (slot == null ? "_" : slot) + "|" + bucket;
    }

    /**
     * If LLM provider is configured, swap the rule-based body text with a
     * personalized one that may reference patterns the user has shown
     * (e.g. 'on Mondays a 400 kcal lunch leads to dinner overruns 70% of
     * the time'). Tone and `kcalAfter`/`kcalTarget` carry over from the
     * rule-based pass — we trust the math, only replace the prose.
     *
     * Any failure (no API key, timeout, parse) returns the original
     * rule-based response unchanged.
     */
    private InlineTipResponse upgradeWithLlmIfPossible(
        UUID userId, LocalDate today, ZoneId zone, String slot, int incomingKcal, InlineTipResponse fallback
    ) {
        if (!"openai".equalsIgnoreCase(properties.provider())) return fallback;
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) return fallback;

        try {
            CoachSnapshotResponse snapshot = snapshotService.buildSnapshot(userId, today, 14, zone);
            String snapshotJson = objectMapper.writeValueAsString(snapshot);
            String text = invokeOpenAi(apiKey.trim(),
                snapshotJson, fallback.tone(), slot, incomingKcal, fallback.kcalAfter(), fallback.kcalTarget());
            if (text == null || text.isBlank()) return fallback;
            return new InlineTipResponse(fallback.tone(), text, fallback.kcalAfter(), fallback.kcalTarget());
        } catch (Exception e) {
            log.debug("inline-tip llm upgrade failed: {}", e.getMessage());
            return fallback;
        }
    }

    private static final String SYSTEM_PROMPT = String.join(" ",
        "You write a SINGLE inline tip shown the moment a user is logging a meal,",
        "before they tap save. The tone (good/caution/over) is fixed by the math",
        "and given to you — do not change it. Output one short sentence ≤140 chars",
        "that references either:",
        "  - a multi-day pattern in the snapshot (e.g. day-of-week, slot, after-meal",
        "    wellbeing) tied to this kind of meal, or",
        "  - a concrete next-step grounded in numbers (verb + number + unit).",
        "Never use filler verbs (consider, try to, aim, plan). Be direct and warm,",
        "like a friend looking over the shoulder. Echo the user's first name only",
        "if it lands naturally, max once.",
        "This app's mechanic is anti-shame: under-target days deposit into a calorie",
        "bank, over-target days can withdraw, plus relax days each month. When `bank`",
        "or `relaxDays` is in the snapshot, you may reference them naturally",
        "('bank covers it', 'this would draw +200 from bank', 'relax day handles it').",
        "Never moralize about food choices. No 'too much', 'avoid', 'cut back'."
    );

    private String invokeOpenAi(
        String apiKey, String snapshotJson, String tone, String slot,
        int incomingKcal, Integer kcalAfter, Integer kcalTarget
    ) throws IOException, InterruptedException {
        String userMsg = String.join("\n",
            "Tone (locked): " + tone,
            "Incoming meal: " + incomingKcal + " kcal at slot " + (slot == null ? "unknown" : slot),
            "After this: " + kcalAfter + " / target " + kcalTarget,
            "Snapshot:",
            snapshotJson
        );
        Map<String, Object> body = Map.of(
            "model", properties.openai().model(),
            "temperature", 0.4,
            "response_format", Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                    "name", "inline_tip",
                    "schema", schema(),
                    "strict", true
                )
            ),
            "messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userMsg)
            )
        );
        String payload = objectMapper.writeValueAsString(body);

        HttpRequest req = HttpRequest.newBuilder(URI.create(normalizeBaseUrl() + "/chat/completions"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .timeout(Duration.ofMillis(timeoutMs()))
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 400) return null;
        JsonNode root = objectMapper.readTree(res.body());
        String content = root.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) return null;
        JsonNode parsed = objectMapper.readTree(content);
        String text = parsed.path("text").asText("");
        if (text.length() > 200) text = text.substring(0, 200);
        return text;
    }

    private static Map<String, Object> schema() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("type", "object");
        s.put("additionalProperties", false);
        s.put("required", List.of("text"));
        s.put("properties", Map.of("text", Map.of("type", "string")));
        return s;
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
}
