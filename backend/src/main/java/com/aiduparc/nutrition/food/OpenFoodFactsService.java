package com.aiduparc.nutrition.food;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OpenFoodFactsService {

    private static final Logger log = LoggerFactory.getLogger(OpenFoodFactsService.class);

    private final RestClient restClient = RestClient.builder()
        .baseUrl("https://world.openfoodfacts.org")
        .defaultHeader("User-Agent", "NutritionApp/1.0")
        .build();

    public Optional<FoodProductResponse> lookupByBarcode(String barcode) {
        try {
            JsonNode root = restClient.get()
                .uri("/api/v2/product/{barcode}.json?fields=product_name,product_name_en,nutriments", barcode)
                .retrieve()
                .body(JsonNode.class);

            if (root == null || root.path("status").asInt() != 1) {
                return Optional.empty();
            }

            JsonNode product = root.path("product");
            String name = product.path("product_name").asText("").trim();
            if (name.isBlank()) {
                name = product.path("product_name_en").asText("").trim();
            }
            if (name.isBlank()) {
                name = "Unknown product";
            }

            JsonNode n = product.path("nutriments");
            Double kcal = nullableDouble(n, "energy-kcal_100g");
            if (kcal == null) {
                Double kj = nullableDouble(n, "energy_100g");
                if (kj != null) kcal = kj / 4.184;
            }

            return Optional.of(new FoodProductResponse(
                name,
                barcode,
                kcal,
                nullableDouble(n, "proteins_100g"),
                nullableDouble(n, "fat_100g"),
                nullableDouble(n, "carbohydrates_100g"),
                nullableDouble(n, "fiber_100g")
            ));
        } catch (Exception e) {
            log.warn("Barcode lookup failed barcode={}: {}", barcode, e.getMessage());
            return Optional.empty();
        }
    }

    private static Double nullableDouble(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return (value.isMissingNode() || value.isNull()) ? null : value.asDouble();
    }
}
