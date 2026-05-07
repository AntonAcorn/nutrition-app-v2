package com.aiduparc.nutrition.wellbeing.api;

import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import com.aiduparc.nutrition.wellbeing.service.WellbeingService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wellbeing")
public class WellbeingController {

    private static final Logger log = LoggerFactory.getLogger(WellbeingController.class);

    private final WellbeingService wellbeingService;
    private final CurrentNutritionUserResolver userResolver;

    public WellbeingController(WellbeingService wellbeingService, CurrentNutritionUserResolver userResolver) {
        this.wellbeingService = wellbeingService;
        this.userResolver = userResolver;
    }

    @GetMapping("/pending")
    public WellbeingPendingResponse getPending(HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        return wellbeingService.getPending(userId);
    }

    @PostMapping("/rate")
    @ResponseStatus(HttpStatus.CREATED)
    public void rate(@Valid @RequestBody WellbeingRateRequest request, HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        log.info("wellbeing rate userId={} rating={}", userId, request.rating());
        wellbeingService.saveRating(userId, request.rating());
    }

    @GetMapping("/insights")
    public WellbeingInsightsResponse getInsights(HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        return wellbeingService.getInsights(userId);
    }

    @PostMapping("/retrospective")
    @ResponseStatus(HttpStatus.CREATED)
    public void retrospective(@Valid @RequestBody WellbeingRetrospectiveRequest request, HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        log.info("wellbeing retrospective userId={} entries={}", userId, request.entries().size());
        wellbeingService.saveRetrospective(userId, request.entries());
    }

    @GetMapping("/food-hint")
    public WellbeingFoodHintResponse getFoodHint(@RequestParam String name, HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        return wellbeingService.getFoodHint(userId, name);
    }

    @GetMapping("/trend")
    public List<WellbeingTrendDay> getTrend(
            @RequestParam(defaultValue = "14") int days,
            HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        return wellbeingService.getTrend(userId, Math.min(days, 90));
    }

    @GetMapping("/nudge")
    public WellbeingNudgeResponse getNudge(HttpSession session) {
        UUID userId = userResolver.resolve(session, null);
        return wellbeingService.getNudge(userId);
    }
}
