package com.aiduparc.nutrition.coach.trigger;

import com.aiduparc.nutrition.aibudget.AiCostBudgetService;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.config.CoachInsightProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Turns a fired trigger plus the user's current snapshot into a personalized
 * two-line push notification (title + body). Designed so the scheduler can
 * always fall back to the detector's hard-coded payload — every failure
 * path returns Optional.empty.
 *
 * Cheap on tokens: each call sends ~1-2 KB of snapshot JSON and gets back
 * ≤180 chars. Limited to one OpenAI call per fired trigger, so total
 * volume stays low even at scale.
 */
@Service
public class CoachTriggerCopywriter {

    private static final Logger log = LoggerFactory.getLogger(CoachTriggerCopywriter.class);
    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

    private static final String SYSTEM_PROMPT = String.join(" ",
        "You write a single push notification for a nutrition coach app.",
        "You receive: a trigger kind, an anchor with one concrete number,",
        "and the user's recent snapshot.",
        "",
        "Output exactly: title (≤32 chars) and body (≤140 chars).",
        "",
        "Rules:",
        "(1) Use the anchor number directly in title or body.",
        "(2) Use the user's first name (profile.displayName) at most once,",
        "    only if it makes the line warmer — don't force it.",
        "(3) Echo specific food names from recentMeals when relevant",
        "    (verbatim, in the user's own writing).",
        "(4) Tone matches the kind:",
        "    streak_break       → curious, not guilty",
        "    bad_night_followup → empathic, inviting them to learn",
        "    big_win            → genuinely warm, no exclamation marks",
        "    plateau            → matter-of-fact, action-oriented",
        "(5) No filler verbs (consider, try to, aim, be more consistent).",
        "    Prefer concrete: add, move, replace, swap, cut.",
        "(6) Push notifications are interrupting — be worth the buzz."
    );

    private final CoachInsightProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final AiCostBudgetService budget;

    public CoachTriggerCopywriter(
            CoachInsightProperties properties,
            ObjectMapper objectMapper,
            AiCostBudgetService budget
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.budget = budget;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(timeoutMs()))
            .build();
    }

    public Optional<Copy> tryGenerate(
        String triggerKind,
        String anchor,
        CoachSnapshotResponse snapshot,
        String locale
    ) {
        if (!"openai".equalsIgnoreCase(properties.provider())) return Optional.empty();
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) return Optional.empty();

        try {
            String snapshotJson = objectMapper.writeValueAsString(snapshot);
            String raw = invoke(apiKey.trim(), triggerKind, anchor, snapshotJson, normalizeLocale(locale));
            if (raw == null || raw.isBlank()) return Optional.empty();
            JsonNode root = objectMapper.readTree(raw);
            String title = root.path("title").asText("").trim();
            String body = root.path("body").asText("").trim();
            if (title.isBlank() || body.isBlank()) return Optional.empty();
            return Optional.of(new Copy(trim(title, 60), trim(body, 200)));
        } catch (Exception e) {
            log.debug("trigger copywriter fallback for kind={}: {}", triggerKind, e.getMessage());
            return Optional.empty();
        }
    }

    private String invoke(String apiKey, String kind, String anchor, String snapshotJson, String locale)
            throws IOException, InterruptedException {
        String userMsg = String.join("\n",
            "Trigger kind: " + kind,
            "Anchor: " + (anchor == null ? "" : anchor),
            "Locale: " + locale,
            "Snapshot:",
            snapshotJson
        );
        String localizedSystem = SYSTEM_PROMPT
            + " Reply in language tag '" + locale + "'.";

        Map<String, Object> payload = Map.of(
            "model", properties.openai().model(),
            "temperature", 0.5,
            "response_format", Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                    "name", "trigger_push",
                    "schema", schema(),
                    "strict", true
                )
            ),
            "messages", List.of(
                Map.of("role", "system", "content", localizedSystem),
                Map.of("role", "user", "content", userMsg)
            )
        );
        String body = objectMapper.writeValueAsString(payload);

        HttpRequest req = HttpRequest.newBuilder(URI.create(normalizeBaseUrl() + "/chat/completions"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .timeout(Duration.ofMillis(timeoutMs()))
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        try {
            budget.assertBudgetOk();
        } catch (RuntimeException e) {
            // Trigger copywriter is best-effort. If budget is exhausted, skip
            // gracefully — the caller falls back to a static template.
            return null;
        }
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 400) return null;
        budget.recordCost(AiCostBudgetService.COACH_TRIGGER_CENTS);
        JsonNode root = objectMapper.readTree(res.body());
        return root.path("choices").path(0).path("message").path("content").asText("");
    }

    private static Map<String, Object> schema() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("type", "object");
        s.put("additionalProperties", false);
        s.put("required", List.of("title", "body"));
        s.put("properties", Map.of(
            "title", Map.of("type", "string"),
            "body", Map.of("type", "string")
        ));
        return s;
    }

    private static String trim(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) return "en";
        String t = locale.trim().toLowerCase();
        return t.length() > 8 ? t.substring(0, 8) : t;
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

    public record Copy(String title, String body) {}
}
