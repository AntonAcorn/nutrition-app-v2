package com.aiduparc.nutrition.wellbeing.api;

import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import com.aiduparc.nutrition.wellbeing.service.WellbeingService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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

    @PostMapping("/rate")
    @ResponseStatus(HttpStatus.CREATED)
    public void rate(@Valid @RequestBody WellbeingRateRequest request, HttpSession session) {
        UUID userId = userResolver.resolve(session);
        log.info("wellbeing rate userId={} rating={} date={}", userId, request.rating(), request.entryDate());
        wellbeingService.saveRating(userId, request.rating(), request.entryDate());
    }
}
