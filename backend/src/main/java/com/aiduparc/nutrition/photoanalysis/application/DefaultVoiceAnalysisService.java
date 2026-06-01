package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.aibudget.AiCostBudgetService;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.photoanalysis.infrastructure.openai.OpenAiPhotoAnalysisResponseMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@ConditionalOnProperty(prefix = "nutrition.photo-analysis", name = "provider", havingValue = "openai")
public class DefaultVoiceAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(DefaultVoiceAnalysisService.class);
    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

    private final PhotoAnalysisProperties properties;
    private final ObjectMapper objectMapper;
    private final PhotoAnalysisDraftService draftService;
    private final HttpClient httpClient;
    private final AiCostBudgetService budget;

    public DefaultVoiceAnalysisService(
            PhotoAnalysisProperties properties,
            ObjectMapper objectMapper,
            PhotoAnalysisDraftService draftService,
            AiCostBudgetService budget
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.draftService = draftService;
        this.budget = budget;
        int timeoutMs = properties.openai().timeoutMs() > 0 ? properties.openai().timeoutMs() : 25000;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();
    }

    public PhotoAnalysisDraftResponse analyzeAndCreateDraft(UUID userId, LocalDate entryDate, String description, String locale) {
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "OPENAI_API_KEY is required for voice analysis");
        }

        String safeLocale = locale == null || locale.isBlank() ? "en" : locale.trim();
        String rawResponse = callOpenAi(description.trim(), safeLocale, apiKey.trim());

        try {
            var analysis = OpenAiPhotoAnalysisResponseMapper.fromModelJsonVoice(rawResponse, objectMapper);
            var draft = draftService.create(new CreatePhotoAnalysisDraftRequest(userId, entryDate, analysis));
            log.info("voice analysis userId={} draftId={} items={} calories={}",
                    userId, draft.id(), analysis.items().size(), analysis.totals().calories());
            return draft;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI returned unparsable JSON for voice analysis", e);
        }
    }

    private String callOpenAi(String description, String locale, String apiKey) {
        budget.assertBudgetOk();
        try {
            String endpoint = normalizeBaseUrl() + "/chat/completions";
            String payload = objectMapper.writeValueAsString(buildRequestBody(description, locale));

            int timeoutMs = properties.openai().timeoutMs() > 0 ? properties.openai().timeoutMs() : 25000;
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMillis(timeoutMs))
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw mapHttpError(response.statusCode(), response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI response did not include content");
            }
            budget.recordCost(AiCostBudgetService.VOICE_CENTS);
            return content.asText();
        } catch (HttpTimeoutException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "OpenAI voice analysis timed out", e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI voice analysis request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI voice analysis interrupted", e);
        }
    }

    private Object buildRequestBody(String description, String locale) {
        String systemPrompt = "You are a nutrition analyzer. The user described their meal by voice. Estimate the nutrition content. Respond with valid JSON only.";

        String userText = String.join("\n",
                "Locale: " + locale,
                "User said: " + description,
                "",
                "Instructions:",
                "- Identify all mentioned foods and drinks.",
                "- If locale is ru, write food names, notes, and portion descriptions in Russian.",
                "- If portion size is not mentioned, use a realistic everyday adult serving — NOT a tiny tasting portion.",
                "",
                "- CRITICAL: Underestimation is the most common failure mode of voice-based logging. When uncertain between two plausible estimates, pick the HIGHER one. A normal-sounding meal that comes out under 400 kcal is almost certainly wrong.",
                "",
                "Method (follow for every dish, do not skip steps):",
                "  1. List every mentioned component as its own item, with explicit weight in grams.",
                "  2. For each item, recall the typical calorie density (kcal per 100 g) from the reference table below and multiply by weight.",
                "  3. Add separate items for invisible-but-implied components: cooking oil if fried/sauteed, melted cheese if the dish is described as creamy or with cheese, dressing if salad, sugar if sweetened.",
                "  4. Sum all items into totals. Cross-check against the meal-type anchor — if totals fall outside the band, re-examine portion sizes upward.",
                "",
                "Calorie density reference (kcal per 100 g cooked weight unless noted):",
                "  • Lean meat (chicken breast, turkey, white fish): 100-150",
                "  • Fatty meat / oily fish (beef, pork, salmon, mackerel): 200-300",
                "  • Processed meat (sausage, kielbasa, salami, bacon, chorizo, ham): 250-400",
                "  • Cheese: 300-400",
                "  • Eggs: 145 (one large egg ≈ 70 kcal, 50 g)",
                "  • Bread: 250-300",
                "  • Cooked pasta / rice / grains: 130-180",
                "  • Potato boiled: 90, fried: 250-350",
                "  • Cooked beans / lentils: 100-130",
                "  • Vegetables: 20-50",
                "  • Fruits: 40-80; bananas / grapes: 90",
                "  • Nuts: 550-650",
                "  • Avocado: 160",
                "  • Oil / butter: 700-900",
                "  • Sour cream / heavy cream: 200-340",
                "  • Mayo: 600-700",
                "",
                "Meal-type sanity anchors: home-cooked dinner 600-1000 kcal; restaurant entree 800-1500; pasta with sauce 500-900; sandwich 400-700; breakfast plate 400-800; bowl of soup 250-500.",
                "",
                "- Bread, rice, pasta, potatoes usually weigh more cooked than people think. 'A plate of pasta' is typically 250-350 g, not 150 g. Scrambled eggs / omelet are almost always 2-3 eggs, not one.",
                "- Whenever cooking involved frying / sauteing / roasting, add a separate 'cooking oil / rendered fat' item ~15-25 g (130-220 kcal) even if oil isn't mentioned.",
                "",
                "- Return JSON only, matching the schema with items, totals, confidence, notes, needsUserConfirmation.",
                "- Each item must contain name, estimatedPortion (grams), calories, protein, carbs, fat, fiber, confidence.",
                "- Mark whether user confirmation is still required."
        );

        return Map.of(
                "model", properties.openai().model(),
                "temperature", 0,
                "response_format", Map.of(
                        "type", "json_schema",
                        "json_schema", Map.of(
                                "name", "voice_analysis_result",
                                "schema", responseSchema(),
                                "strict", true
                        )
                ),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userText)
                )
        );
    }

    private Map<String, Object> responseSchema() {
        Map<String, Object> itemSchema = new LinkedHashMap<>();
        itemSchema.put("type", "object");
        itemSchema.put("additionalProperties", false);
        itemSchema.put("required", List.of("name", "estimatedPortion", "calories", "protein", "carbs", "fat", "fiber", "confidence"));
        itemSchema.put("properties", Map.of(
                "name", Map.of("type", "string"),
                "estimatedPortion", Map.of("type", "string"),
                "calories", Map.of("type", "number"),
                "protein", Map.of("type", "number"),
                "carbs", Map.of("type", "number"),
                "fat", Map.of("type", "number"),
                "fiber", Map.of("type", "number"),
                "confidence", Map.of("type", "number")
        ));

        Map<String, Object> totalsSchema = new LinkedHashMap<>();
        totalsSchema.put("type", "object");
        totalsSchema.put("additionalProperties", false);
        totalsSchema.put("required", List.of("calories", "protein", "carbs", "fat", "fiber"));
        totalsSchema.put("properties", Map.of(
                "calories", Map.of("type", "number"),
                "protein", Map.of("type", "number"),
                "carbs", Map.of("type", "number"),
                "fat", Map.of("type", "number"),
                "fiber", Map.of("type", "number")
        ));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("required", List.of("items", "totals", "confidence", "notes", "needsUserConfirmation"));
        schema.put("properties", Map.of(
                "items", Map.of("type", "array", "items", itemSchema),
                "totals", totalsSchema,
                "confidence", Map.of("type", "number"),
                "notes", Map.of("type", "array", "items", Map.of("type", "string")),
                "needsUserConfirmation", Map.of("type", "boolean")
        ));
        return schema;
    }

    private ResponseStatusException mapHttpError(int status, String body) {
        HttpStatus mapped = status == 408 || status == 504 ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY;
        String detail = extractError(body);
        return new ResponseStatusException(mapped, "OpenAI error " + status + ": " + detail);
    }

    private String extractError(String body) {
        if (body == null || body.isBlank()) return "empty error body";
        try {
            var msg = objectMapper.readTree(body).path("error").path("message").asText();
            return msg == null || msg.isBlank() ? "unknown error" : msg;
        } catch (Exception ignored) {
            return body.length() > 300 ? body.substring(0, 300) + "..." : body;
        }
    }

    private String normalizeBaseUrl() {
        String configured = properties.openai().baseUrl();
        String value = (configured == null || configured.isBlank()) ? DEFAULT_BASE_URL : configured.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
