package com.aiduparc.nutrition.food;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/food-lookup")
public class FoodLookupController {

    private final OpenFoodFactsService openFoodFactsService;

    public FoodLookupController(OpenFoodFactsService openFoodFactsService) {
        this.openFoodFactsService = openFoodFactsService;
    }

    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<FoodProductResponse> lookupBarcode(@PathVariable String barcode) {
        return openFoodFactsService.lookupByBarcode(barcode)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<FoodProductResponse> search(@RequestParam String q) {
        if (q == null || q.isBlank() || q.length() < 2) return List.of();
        return openFoodFactsService.searchByName(q.trim(), 20);
    }
}
