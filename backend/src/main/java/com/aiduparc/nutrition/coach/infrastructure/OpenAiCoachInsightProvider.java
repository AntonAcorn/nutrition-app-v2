package com.aiduparc.nutrition.coach.infrastructure;

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
        "",
        "CRITICAL: the user already sees today's calories, target, P/F/C/Fiber",
        "values, weight and bank balance in their dashboard. Telling them their",
        "average protein is below target is NOT an insight — it's a label they",
        "can already read. Skip every insight that just restates a number the",
        "snapshot would have surfaced anyway.",
        "",
        "Acceptable insight types (every card must fit one):",
        "  A. Time comparison — this week vs prior baseline,",
        "     e.g. 'Protein up 22g/day vs last week's average — what changed?'",
        "  B. Conditional pattern — X happens when Y,",
        "     e.g. 'On days you log breakfast before 9 AM you stay in zone 4/4 times.'",
        "  C. Day-of-week or slot pattern across the window,",
        "     e.g. 'Wednesdays you average 2400 kcal vs other weekdays at 1850.'",
        "  D. Behavior chain across days,",
        "     e.g. 'Three Saturday overruns followed Friday rests — link them.'",
        "  E. Wellbeing correlation tied to a slot or macro,",
        "     e.g. 'Dinners over 800 kcal correlate with rating 2 next morning, 3 cases.'",
        "",
        "Hard rules you must follow:",
        "(0) Days with <300 kcal logged are almost always 'forgot to log',",
        "    not a deliberate fast or restriction. Treat them as missing data:",
        "    don't build insights around them and don't recommend the user",
        "    'eat more' on a day they didn't track. If a day-of-week pattern",
        "    relies on a sub-300-kcal day, drop the day from the pattern or",
        "    skip the insight.",
        "(1) Never comment on a single day in isolation.",
        "(2) Forbidden filler verbs and phrases:",
        "    'consider', 'try to', 'aim to', 'aim for', 'be more consistent',",
        "    'avoid spikes', 'plan meals', 'be mindful', 'pay attention to',",
        "    'increase your X', 'decrease your X', 'support your goals',",
        "    'for better weight loss results'.",
        "    Use concrete imperatives with numbers: 'add 30g salmon at lunch',",
        "    'move dinner to 19:30', 'replace 200g pasta with 200g rice'.",
        "(3) The body MUST contain at least one concrete number with a unit",
        "    AND must reveal something not visible at a glance in the dashboard",
        "    (a comparison, a correlation, a multi-day pattern).",
        "(4) anchor must be 'field.path = value' citing the exact snapshot field used,",
        "    including the comparison if any (e.g. 'byDayOfWeek.wed = 2400 vs other weekdays = 1850').",
        "(5) No medical claims, no diagnoses, no supplement names.",
        "(6) Skip if logged_days < 4 OR if no real pattern exists.",
        "    Returning an empty array is better than a generic card.",
        "Tone: direct, warm, like a smart friend who actually looked at the data.",
        "",
        "User focus (profile.coachFocus, list of tags):",
        "  energy → prioritize wellbeing×food correlations and sleep×meal patterns",
        "  mood → wellbeing trends, time-of-day effects, slot ratings",
        "  weight → calorie balance, weight trend, deficit/surplus analysis",
        "  performance → workouts × calories, protein adequacy, recovery",
        "  empty/all → balanced mix across all categories",
        "Pick insights that fit the user's focus. If the user opted into 'energy'",
        "and 'mood' but not 'weight', do NOT lead with 'lose more by cutting kcal'.",
        "",
        "Personalization rules (very important — these create the 'wow' moment):",
        "  - profile.displayName is the user's first name when present.",
        "    Address them by name in ONE card per response if it lands naturally.",
        "    Don't force it into every card.",
        "  - When you cite specific food, use the names exactly as they appear",
        "    in recentMeals or bestDay.meals / worstDay.meals — these are how",
        "    the user actually wrote them. Don't translate or genericize.",
        "  - When you talk about a specific day (bestDay / worstDay), name",
        "    its day-of-week, not just the date.",
        "  - Echo the user's vocabulary: if they log 'Овсянка с курагой',",
        "    write 'Овсянка с курагой', not 'oatmeal'.",
        "",
        "HealthKit signals (in `health` block, all optional):",
        "  - avgSteps, avgActiveKcal, avgSleepMinutes — daily averages",
        "  - workoutDays / totalWorkoutMinutes — exercise volume",
        "  - stepsByDayOfWeek, sleepMinByDayOfWeek — DOW splits",
        "  Cross-domain insights using these are highly valuable when supported:",
        "    'Sleep <360 min Tue/Thu — both nights you ate +400 kcal vs other days.'",
        "    'No-workout days run 290 kcal higher than training days.'",
        "    'Steps below 4000 → next-day kcal up by ~250 (3 cases).'",
        "  Only use health signals when present. If health is null, ignore it",
        "  silently — never invent activity/sleep numbers.",
        "",
        "Calorie bank and relax days (in `bank` and `relaxDays` blocks):",
        "  - bank.currentKcal — current bank balance (deposits minus withdrawals)",
        "  - bank.usedThisWindowKcal — kcal withdrawn in the snapshot window",
        "  - relaxDays.usedThisMonth / allowedPerMonth — free-pass days used / cap",
        "  This app's core mechanic is anti-shame: under-target days deposit,",
        "  over-target days can withdraw, plus N free-pass relax days a month.",
        "  Weave these in naturally when relevant:",
        "    'Bank's at +320 kcal — Saturday plans can absorb a 200-kcal hit.'",
        "    'Two withdrawals this week, both Wednesdays — same as last week.'",
        "    'Used 1 of 3 relax days. 2 left this month.'",
        "  Hard constraints:",
        "  - Never frame an overage as failure when bank/relax-day covers it.",
        "  - Streaks count logging days, not perfection — never say a streak",
        "    'ended' or 'broke' over a calorie overrun. It only ends if the",
        "    user skipped logging.",
        "  - No moralizing about food choices. Observe, don't judge."
    );

    private static final String USER_INSTRUCTION = String.join("\n",
        "Generate insight cards from this snapshot.",
        "- title: ≤6 words, no period, no exclamation.",
        "- body: 1-2 sentences, ≤180 chars, must reveal a comparison/pattern AND",
        "  end with a concrete action (verb + number + unit).",
        "- kind: behavioral | macro | timing | wellbeing | weight | other.",
        "",
        "Bad examples (do NOT produce these — they only repeat what the dashboard shows):",
        "  'Increase your protein intake — 96g vs 178g target.'",
        "      // pure target gap; user sees this number on the home screen",
        "  'Keep calories near your target.'",
        "      // generic, no number, filler verb 'aim'",
        "  'You logged a high calorie day at 2739 kcal.'",
        "      // single day, no pattern, no action",
        "  'Plan earlier meal times — 10 late meals this week.'",
        "      // bare count, filler verb 'plan/consider'",
        "",
        "Good examples (each surfaces something the dashboard doesn't):",
        "  title: 'Wednesdays run 30% over target'",
        "  body:  'Wed average 2400 kcal vs other weekdays at 1850 (4 weeks). Front-load lunch with 50g protein.'",
        "  anchor:'byDayOfWeek.wed.avgKcal = 2400 vs other weekdays ≈ 1850'",
        "",
        "  title: 'Protein up 22g vs last week'",
        "  body:  'Daily protein climbed from 96g to 118g — biggest week-over-week jump yet. Hold this and add 100g cottage cheese to keep momentum.'",
        "  anchor:'totals.avgMacros.proteinG = 118 vs prior week ≈ 96'",
        "",
        "  title: 'Late dinners drag next-day rating'",
        "  body:  'On 3 nights with dinner after 22:00 next-day wellbeing averaged 2.5 vs 4.1 on early dinners. Move Tue dinner to 19:30.'",
        "  anchor:'mealTiming.lateMealsCount=3 / wellbeing.bySlot.dinner=2.5'",
        "",
        "Snapshot:"
    );

    private final CoachInsightProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final AiCostBudgetService budget;

    public OpenAiCoachInsightProvider(
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
        budget.assertBudgetOk();
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
            budget.recordCost(AiCostBudgetService.COACH_INSIGHT_CENTS);

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
        "Skip generic congratulations — celebrate concrete wins.",
        "Bank/relax-day awareness: when the snapshot includes `bank.currentKcal`,",
        "`bank.usedThisWindowKcal`, or `relaxDays.usedThisMonth`, weave them",
        "into highlight (deposits, untouched bank) or challenge (recurring",
        "withdrawals on the same day-of-week). Never frame a withdrawal as",
        "failure — it is the mechanic, not the fall. No shame about over-",
        "target days when the bank or a relax day absorbed them."
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
        budget.assertBudgetOk();
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
            budget.recordCost(AiCostBudgetService.COACH_INSIGHT_CENTS);

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
