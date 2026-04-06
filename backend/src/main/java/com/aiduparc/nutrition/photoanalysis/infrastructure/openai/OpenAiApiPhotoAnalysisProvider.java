package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@ConditionalOnProperty(prefix = "nutrition.photo-analysis", name = "provider", havingValue = "openai")
public class OpenAiApiPhotoAnalysisProvider implements OpenAiPhotoAnalysisProvider {

    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

    private final PhotoAnalysisProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OpenAiApiPhotoAnalysisProvider(PhotoAnalysisProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs()))
                .build();
    }

    @Override
    public PhotoAnalysisResponse analyze(OpenAiPhotoAnalysisPrompt prompt) {
        String apiKey = properties.openai().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "OPENAI_API_KEY is required when PHOTO_ANALYSIS_PROVIDER=openai"
            );
        }

        String rawModelOutput = invokeOpenAi(prompt, apiKey.trim());
        try {
            return OpenAiPhotoAnalysisResponseMapper.fromModelJson(rawModelOutput, objectMapper);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "OpenAI returned unparsable JSON for photo analysis",
                    e
            );
        }
    }

    private String invokeOpenAi(OpenAiPhotoAnalysisPrompt prompt, String apiKey) {
        try {
            var endpoint = normalizeBaseUrl() + "/chat/completions";
            String payload = objectMapper.writeValueAsString(buildRequestBody(prompt));

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
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI response did not include content");
            }
            return contentNode.asText();
        } catch (HttpTimeoutException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "OpenAI photo analysis timed out", e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI photo analysis request failed", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI photo analysis interrupted", e);
        }
    }

    private ResponseStatusException mapHttpError(int status, String body) {
        HttpStatus mapped = status == 408 || status == 504 ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY;
        String details = extractOpenAiError(body);
        return new ResponseStatusException(mapped, "OpenAI error " + status + ": " + details);
    }

    private String extractOpenAiError(String body) {
        if (body == null || body.isBlank()) {
            return "empty error body";
        }

        try {
            var root = objectMapper.readTree(body);
            var message = root.path("error").path("message").asText();
            return (message == null || message.isBlank()) ? "unknown error" : message;
        } catch (Exception ignored) {
            return body.length() > 300 ? body.substring(0, 300) + "..." : body;
        }
    }

    private Object buildRequestBody(OpenAiPhotoAnalysisPrompt prompt) {
        List<Map<String, Object>> content = new ArrayList<>();
        content.add(Map.of("type", "text", "text", buildUserText(prompt)));
        content.add(Map.of("type", "image_url", "image_url", Map.of("url", prompt.imageUrl())));

        return Map.of(
                "model", prompt.model(),
                "temperature", 0,
                "response_format", Map.of(
                        "type", "json_schema",
                        "json_schema", Map.of(
                                "name", "photo_analysis_result",
                                "schema", responseSchema(),
                                "strict", true
                        )
                ),
                "messages", List.of(
                        Map.of("role", "system", "content", "You are a nutrition photo analyzer. Respond with valid JSON only."),
                        Map.of("role", "user", "content", content)
                )
        );
    }

    private String buildUserText(OpenAiPhotoAnalysisPrompt prompt) {
        String locale = prompt.locale() == null || prompt.locale().isBlank() ? "en" : prompt.locale();
        String note = prompt.userNote() == null || prompt.userNote().isBlank() ? "(none)" : prompt.userNote().trim();

        return String.join("\n",
                "Analyze this food photo and estimate nutrition.",
                "Locale: " + locale,
                "User note: " + note,
                "Instructions:",
                "- " + String.join("\n- ", prompt.instructions())
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

    private String normalizeBaseUrl() {
        String configured = properties.openai().baseUrl();
        String value = (configured == null || configured.isBlank()) ? DEFAULT_BASE_URL : configured.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private int timeoutMs() {
        int configured = properties.openai().timeoutMs();
        return configured > 0 ? configured : 25000;
    }
}
