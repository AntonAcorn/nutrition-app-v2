package com.aiduparc.nutrition.coach.infrastructure;

import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.config.CoachInsightProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@ConditionalOnProperty(prefix = "nutrition.coach", name = "provider", havingValue = "openai")
public class OpenAiCoachInsightProvider implements CoachInsightProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCoachInsightProvider.class);
    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

    private static final String SYSTEM_PROMPT = String.join(" ",
        "You are a sharp, evidence-based nutrition coach.",
        "You receive a JSON snapshot of one user's last N days of nutrition data.",
        "Return at most 3 short insight cards as strict JSON, or an empty array if signal is weak.",
        "Hard rules you must follow:",
        "(1) Never comment on a single day in isolation. Every insight must reference",
        "    either a multi-day pattern (≥2 occurrences) or a gap between a multi-day",
        "    average and the user's target. One outlier day is not an insight.",
        "(2) Forbidden filler verbs and phrases:",
        "    'consider', 'try to', 'aim to', 'aim for', 'be more consistent',",
        "    'avoid spikes', 'plan meals', 'be mindful', 'pay attention to'.",
        "    Use concrete imperatives: 'add', 'move', 'replace', 'cut', 'shift', 'swap'.",
        "(3) The body MUST contain at least one concrete number with a unit",
        "    (g, kcal, hours, minutes, days, % of target).",
        "(4) anchor must be 'field.path = value' citing the exact snapshot field used,",
        "    including the comparison if any (e.g. 'totals.avgMacros.proteinG = 96 vs target 178').",
        "(5) No medical claims, no diagnoses, no supplement names.",
        "(6) Skip if logged_days < 3 or if no clear multi-day pattern exists.",
        "Tone: direct, warm, like a smart friend — not a corporate wellness app."
    );

    private static final String USER_INSTRUCTION = String.join("\n",
        "Generate insight cards from this snapshot.",
        "- title: ≤6 words, no period, no exclamation.",
        "- body: 1-2 sentences, ≤180 chars, must end with a concrete action containing",
        "  a verb + number + unit (e.g. 'add 30g protein at breakfast').",
        "- kind: behavioral | macro | timing | wellbeing | weight | other.",
        "",
        "Bad examples (do NOT produce these):",
        "  'Aim to plan meals to avoid such spikes.'      // filler, no number",
        "  'You logged a high calorie day at 2739 kcal.'  // single day, no action",
        "  'Try to have more consistent meal times.'      // filler",
        "",
        "Good examples:",
        "  title: 'Protein 46% below target'",
        "  body:  'You averaged 96g vs 178g target across 7 days. Add 30g protein at breakfast (e.g. 4 eggs or 200g cottage cheese).'",
        "  anchor:'totals.avgMacros.proteinG = 96 vs target 178'",
        "",
        "  title: 'Late dinners on weekdays'",
        "  body:  '4 of 5 weekdays you ate after 22:00. Move dinner to 19:30 — your weekend rating averaged 4.2 vs 2.6 on late nights.'",
        "  anchor:'mealTiming.lateMealsCount = 4 / wellbeing.bySlot.dinner'",
        "",
        "Snapshot:"
    );

    private final CoachInsightProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OpenAiCoachInsightProvider(CoachInsightProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(timeoutMs()))
            .build();
    }

    @Override
    public List<InsightDraft> generate(CoachSnapshotResponse snapshot, List<PastInsight> history, String locale) {
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OPENAI_API_KEY is required when nutrition.coach.provider=openai"
            );
        }

        String snapshotJson;
        String historyJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(snapshot);
            historyJson = objectMapper.writeValueAsString(history != null ? history : List.of());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize snapshot", e);
        }

        String rawContent = invokeOpenAi(apiKey.trim(), snapshotJson, historyJson, normalizeLocale(locale));
        return parseInsights(rawContent);
    }

    private static String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) return "en";
        String trimmed = locale.trim().toLowerCase();
        return trimmed.length() > 8 ? trimmed.substring(0, 8) : trimmed;
    }

    @Override
    public WeeklyRecapDraft generateWeeklyRecap(CoachSnapshotResponse snapshot, List<PastInsight> history, String locale) {
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OPENAI_API_KEY is required when nutrition.coach.provider=openai"
            );
        }

        String snapshotJson;
        String historyJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(snapshot);
            historyJson = objectMapper.writeValueAsString(history != null ? history : List.of());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize snapshot", e);
        }

        String rawContent = invokeOpenAiForRecap(apiKey.trim(), snapshotJson, historyJson, normalizeLocale(locale));
        return parseWeeklyRecap(rawContent);
    }

    @Override
    public String sourceTag() {
        return "openai:" + properties.openai().model();
    }

    private String invokeOpenAi(String apiKey, String snapshotJson, String historyJson, String locale) {
        try {
            String endpoint = normalizeBaseUrl() + "/chat/completions";
            String payload = objectMapper.writeValueAsString(buildRequestBody(snapshotJson, historyJson, locale));

            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMillis(timeoutMs()))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw mapHttpError(response.statusCode(), response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI returned empty content");
            }
            return contentNode.asText();
        } catch (HttpTimeoutException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "OpenAI coach insight request timed out", e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI coach insight request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI coach insight interrupted", e);
        }
    }

    private List<InsightDraft> parseInsights(String rawContent) {
        try {
            JsonNode root = objectMapper.readTree(rawContent);
            JsonNode insightsNode = root.path("insights");
            if (!insightsNode.isArray()) {
                log.warn("Coach LLM response missing 'insights' array: {}", rawContent);
                return List.of();
            }
            List<InsightDraft> out = new ArrayList<>();
            insightsNode.forEach(node -> {
                String kind = node.path("kind").asText("other");
                String title = node.path("title").asText("");
                String body = node.path("body").asText("");
                String anchor = node.path("anchor").asText(null);
                if (title.isBlank() || body.isBlank()) return;
                out.add(new InsightDraft(kind, trim(title, 160), trim(body, 600), trim(anchor, 600)));
            });
            return out.size() > 3 ? out.subList(0, 3) : out;
        } catch (IOException e) {
            log.warn("Coach LLM returned unparsable JSON: {}", rawContent, e);
            return List.of();
        }
    }

    private static String trim(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    private Object buildRequestBody(String snapshotJson, String historyJson, String locale) {
        String localizedSystem = SYSTEM_PROMPT
            + " You also receive an array `coachHistory` of your past insights"
            + " (most recent first, with `daysAgo`). Use it to: (a) avoid repeating"
            + " near-identical advice, and (b) when the latest snapshot shows the"
            + " user moved on a past suggestion, briefly acknowledge it"
            + " (e.g. \"Last week I asked you to add protein at breakfast — you"
            + " went from 96g to 134g\"). Don't force a follow-up if there's"
            + " no real change."
            + " Reply in language tag '" + locale + "' for the title, body and anchor fields.";
        return Map.of(
            "model", properties.openai().model(),
            "temperature", 0.4,
            "response_format", Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                    "name", "coach_insights",
                    "schema", responseSchema(),
                    "strict", true
                )
            ),
            "messages", List.of(
                Map.of("role", "system", "content", localizedSystem),
                Map.of("role", "user", "content",
                    USER_INSTRUCTION + "\nCoach history:\n" + historyJson + "\nSnapshot:\n" + snapshotJson)
            )
        );
    }

    private Map<String, Object> responseSchema() {
        Map<String, Object> insightSchema = new LinkedHashMap<>();
        insightSchema.put("type", "object");
        insightSchema.put("additionalProperties", false);
        insightSchema.put("required", List.of("kind", "title", "body", "anchor"));
        insightSchema.put("properties", Map.of(
            "kind", Map.of(
                "type", "string",
                "enum", List.of("behavioral", "macro", "timing", "wellbeing", "weight", "other")
            ),
            "title", Map.of("type", "string"),
            "body", Map.of("type", "string"),
            "anchor", Map.of("type", "string")
        ));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("required", List.of("insights"));
        schema.put("properties", Map.of(
            "insights", Map.of(
                "type", "array",
                "maxItems", 3,
                "items", insightSchema
            )
        ));
        return schema;
    }

    private ResponseStatusException mapHttpError(int status, String body) {
        HttpStatus mapped = (status == 408 || status == 504) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY;
        String details = extractError(body);
        return new ResponseStatusException(mapped, "OpenAI coach error " + status + ": " + details);
    }

    private String extractError(String body) {
        if (body == null || body.isBlank()) return "empty error body";
        try {
            JsonNode root = objectMapper.readTree(body);
            String message = root.path("error").path("message").asText();
            return (message == null || message.isBlank()) ? "unknown error" : message;
        } catch (Exception ignored) {
            return body.length() > 300 ? body.substring(0, 300) + "..." : body;
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

    // ── Weekly recap ─────────────────────────────────────────────────────────

    private static final String RECAP_SYSTEM_PROMPT = String.join(" ",
        "You are a sharp nutrition coach producing a Spotify-Wrapped style weekly recap.",
        "Five fixed sections, each must reference real numbers from the snapshot.",
        "Tone: warm, direct, like a smart friend who just looked at your week.",
        "Forbidden filler: 'consider', 'try to', 'aim', 'be more consistent'.",
        "Every body must contain at least one concrete number with a unit.",
        "Keep titles short (≤6 words), bodies tight (≤140 chars).",
        "Skip generic congratulations — celebrate concrete wins."
    );

    private static final String RECAP_USER_INSTRUCTION = String.join("\n",
        "Build a five-section weekly recap from this snapshot.",
        "Sections (all required, in this order):",
        "  1. highlight — single best thing that happened (specific number).",
        "  2. trend    — direction vs prior baseline (weight, calories, macros).",
        "  3. challenge — biggest issue (multi-day pattern, never single day).",
        "  4. nextWeekGoal — one concrete, measurable target (verb + number).",
        "  5. shareLine — single tweet-length line (≤90 chars) safe to share publicly,",
        "                 no PII, no medical claims, with one emoji at start.",
        "Snapshot:"
    );

    private String invokeOpenAiForRecap(String apiKey, String snapshotJson, String historyJson, String locale) {
        try {
            String endpoint = normalizeBaseUrl() + "/chat/completions";
            String payload = objectMapper.writeValueAsString(buildRecapRequestBody(snapshotJson, historyJson, locale));

            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMillis(timeoutMs()))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw mapHttpError(response.statusCode(), response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI returned empty content");
            }
            return contentNode.asText();
        } catch (HttpTimeoutException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "OpenAI weekly recap request timed out", e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI weekly recap request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI weekly recap interrupted", e);
        }
    }

    private Object buildRecapRequestBody(String snapshotJson, String historyJson, String locale) {
        String localizedSystem = RECAP_SYSTEM_PROMPT
            + " You also receive `coachHistory` — your past insights and recap"
            + " entries with `daysAgo`. If the snapshot shows movement on a"
            + " past suggestion, weave one acknowledgement into the highlight"
            + " or trend section."
            + " Reply in language tag '" + locale + "' for the title, body and shareLine fields.";
        return Map.of(
            "model", properties.openai().model(),
            "temperature", 0.5,
            "response_format", Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                    "name", "coach_weekly_recap",
                    "schema", recapResponseSchema(),
                    "strict", true
                )
            ),
            "messages", List.of(
                Map.of("role", "system", "content", localizedSystem),
                Map.of("role", "user", "content",
                    RECAP_USER_INSTRUCTION + "\nCoach history:\n" + historyJson + "\nSnapshot:\n" + snapshotJson)
            )
        );
    }

    private Map<String, Object> recapResponseSchema() {
        Map<String, Object> sectionSchema = new LinkedHashMap<>();
        sectionSchema.put("type", "object");
        sectionSchema.put("additionalProperties", false);
        sectionSchema.put("required", List.of("title", "body"));
        sectionSchema.put("properties", Map.of(
            "title", Map.of("type", "string"),
            "body", Map.of("type", "string")
        ));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("required", List.of("highlight", "trend", "challenge", "nextWeekGoal", "shareLine"));
        schema.put("properties", Map.of(
            "highlight", sectionSchema,
            "trend", sectionSchema,
            "challenge", sectionSchema,
            "nextWeekGoal", sectionSchema,
            "shareLine", Map.of("type", "string")
        ));
        return schema;
    }

    private WeeklyRecapDraft parseWeeklyRecap(String rawContent) {
        try {
            JsonNode root = objectMapper.readTree(rawContent);
            return new WeeklyRecapDraft(
                parseSection(root.path("highlight")),
                parseSection(root.path("trend")),
                parseSection(root.path("challenge")),
                parseSection(root.path("nextWeekGoal")),
                trim(root.path("shareLine").asText(""), 140)
            );
        } catch (IOException e) {
            log.warn("Coach LLM returned unparsable weekly recap JSON: {}", rawContent, e);
            return null;
        }
    }

    private static WeeklyRecapDraft.Section parseSection(JsonNode node) {
        return new WeeklyRecapDraft.Section(
            trim(node.path("title").asText(""), 160),
            trim(node.path("body").asText(""), 600)
        );
    }
}
