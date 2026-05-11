package com.aiduparc.nutrition.health.api;

import com.aiduparc.nutrition.health.service.HealthMetricsService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/healthkit")
public class HealthMetricsController {

    private final HealthMetricsService service;
    private final CurrentNutritionUserResolver userResolver;

    public HealthMetricsController(
        HealthMetricsService service,
        CurrentNutritionUserResolver userResolver
    ) {
        this.service = service;
        this.userResolver = userResolver;
    }

    @PostMapping("/sync")
    public Map<String, Integer> sync(
        @Valid @RequestBody HealthMetricsSyncRequest request,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session);
        int written = service.sync(userId, request);
        return Map.of("written", written);
    }
}
