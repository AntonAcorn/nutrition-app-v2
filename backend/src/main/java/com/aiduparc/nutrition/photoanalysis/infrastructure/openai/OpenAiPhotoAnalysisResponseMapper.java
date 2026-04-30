package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import com.aiduparc.nutrition.photoanalysis.application.dto.AnalyzedFoodItem;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisTotals;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public final class OpenAiPhotoAnalysisResponseMapper {

    private OpenAiPhotoAnalysisResponseMapper() {
    }

    public static PhotoAnalysisResponse fromModelJson(String rawModelJson, ObjectMapper objectMapper) throws IOException {
        var root = objectMapper.readTree(stripCodeFences(rawModelJson));

        var items = new ArrayList<AnalyzedFoodItem>();
        for (JsonNode node : asArray(root.get("items"))) {
            items.add(new AnalyzedFoodItem(
                    text(node, "name", "Unknown item"),
                    text(node, "estimatedPortion", "unknown"),
                    decimal(node, "calories"),
                    decimal(node, "protein"),
                    decimal(node, "carbs"),
                    decimal(node, "fat"),
                    decimal(node, "fiber"),
                    clamp(decimal(node, "confidence"), BigDecimal.ZERO, BigDecimal.ONE)
            ));
        }

        var totalsNode = root.get("totals");
        var totals = totalsNode != null && !totalsNode.isNull()
                ? new PhotoAnalysisTotals(
                        decimal(totalsNode, "calories"),
                        decimal(totalsNode, "protein"),
                        decimal(totalsNode, "carbs"),
                        decimal(totalsNode, "fat"),
                        decimal(totalsNode, "fiber")
                )
                : recomputeTotals(items);

        var notes = new ArrayList<String>();
        for (JsonNode noteNode : asArray(root.get("notes"))) {
            if (noteNode.isTextual() && !noteNode.asText().isBlank()) {
                notes.add(noteNode.asText().trim());
            }
        }

        if (notes.isEmpty()) {
            notes.add("Estimated from image; verify portions before saving meal.");
        }

        return new PhotoAnalysisResponse(
                List.copyOf(items),
                totals,
                clamp(decimal(root, "confidence"), BigDecimal.ZERO, BigDecimal.ONE),
                List.copyOf(notes),
                bool(root, "needsUserConfirmation", true)
        );
    }

    private static PhotoAnalysisTotals recomputeTotals(List<AnalyzedFoodItem> items) {
        BigDecimal calories = BigDecimal.ZERO;
        BigDecimal protein = BigDecimal.ZERO;
        BigDecimal carbs = BigDecimal.ZERO;
        BigDecimal fat = BigDecimal.ZERO;
        BigDecimal fiber = BigDecimal.ZERO;

        for (AnalyzedFoodItem item : items) {
            calories = calories.add(safe(item.calories()));
            protein = protein.add(safe(item.protein()));
            carbs = carbs.add(safe(item.carbs()));
            fat = fat.add(safe(item.fat()));
            fiber = fiber.add(safe(item.fiber()));
        }

        return new PhotoAnalysisTotals(calories, protein, carbs, fat, fiber);
    }

    private static JsonNode asArray(JsonNode node) {
        return node != null && node.isArray() ? node : JsonNodeFactoryHolder.EMPTY_ARRAY;
    }

    private static String text(JsonNode node, String field, String fallback) {
        var value = node.get(field);
        if (value == null || value.isNull() || !value.isValueNode()) {
            return fallback;
        }

        var s = value.asText();
        return s == null || s.isBlank() ? fallback : s.trim();
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        var value = node.get(field);
        if (value == null || value.isNull()) {
            return BigDecimal.ZERO;
        }

        if (value.isNumber()) {
            return value.decimalValue();
        }

        if (value.isTextual()) {
            var normalized = value.asText().trim();
            if (normalized.isEmpty()) {
                return BigDecimal.ZERO;
            }
            try {
                return new BigDecimal(normalized);
            } catch (NumberFormatException ignored) {
                return BigDecimal.ZERO;
            }
        }

        return BigDecimal.ZERO;
    }

    private static boolean bool(JsonNode node, String field, boolean fallback) {
        var value = node.get(field);
        if (value == null || value.isNull()) {
            return fallback;
        }
        return value.isBoolean() ? value.booleanValue() : fallback;
    }

    private static BigDecimal clamp(BigDecimal value, BigDecimal min, BigDecimal max) {
        if (value.compareTo(min) < 0) {
            return min;
        }
        if (value.compareTo(max) > 0) {
            return max;
        }
        return value;
    }

    private static BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static String stripCodeFences(String raw) {
        if (raw == null) {
            return "{}";
        }

        var trimmed = raw.trim();
        if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
            return trimmed;
        }

        int firstLineEnd = trimmed.indexOf('\n');
        if (firstLineEnd < 0) {
            return "{}";
        }

        String body = trimmed.substring(firstLineEnd + 1, trimmed.length() - 3);
        return body.trim();
    }

    private static final class JsonNodeFactoryHolder {
        private static final JsonNode EMPTY_ARRAY = new ObjectMapper().createArrayNode();

        private JsonNodeFactoryHolder() {
        }
    }
}
