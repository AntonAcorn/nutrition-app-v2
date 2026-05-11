package com.aiduparc.nutrition.history.api;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history/meals")
public class MealLogController {

    private final NutritionHistoryService nutritionHistoryService;
    private final CurrentNutritionUserResolver resolver;

    public MealLogController(NutritionHistoryService nutritionHistoryService, CurrentNutritionUserResolver resolver) {
        this.nutritionHistoryService = nutritionHistoryService;
        this.resolver = resolver;
    }

    @GetMapping
    public List<MealSlotResponse> getMeals(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpSession session
    ) {
        UUID userId = resolver.resolve(session);
        LocalDate safeDate = date != null ? date : LocalDate.now();
        return nutritionHistoryService.getMealLog(userId, safeDate);
    }

    @PatchMapping("/{id}")
    public MealLogEntryResponse updateMeal(
            @PathVariable UUID id,
            @RequestBody UpdateMealLogEntryRequest request,
            HttpSession session
    ) {
        UUID userId = resolver.resolve(session);
        return nutritionHistoryService.updateMealLogEntry(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMeal(@PathVariable UUID id, HttpSession session) {
        UUID userId = resolver.resolve(session);
        nutritionHistoryService.deleteMealLogEntry(userId, id);
    }
}
