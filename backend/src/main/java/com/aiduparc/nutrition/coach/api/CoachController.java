package com.aiduparc.nutrition.coach.api;

import com.aiduparc.nutrition.coach.service.CoachInsightService;
import com.aiduparc.nutrition.coach.service.CoachRateLimitService;
import com.aiduparc.nutrition.coach.service.CoachSnapshotService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coach")
public class CoachController {

    private static final int DEFAULT_DAYS = 7;
    private static final int MAX_DAYS = 30;

    private final CoachSnapshotService coachSnapshotService;
    private final CoachInsightService coachInsightService;
    private final CoachRateLimitService rateLimitService;
    private final CurrentNutritionUserResolver userResolver;

    public CoachController(
        CoachSnapshotService coachSnapshotService,
        CoachInsightService coachInsightService,
        CoachRateLimitService rateLimitService,
        CurrentNutritionUserResolver userResolver
    ) {
        this.coachSnapshotService = coachSnapshotService;
        this.coachInsightService = coachInsightService;
        this.rateLimitService = rateLimitService;
        this.userResolver = userResolver;
    }

    @GetMapping("/snapshot")
    public CoachSnapshotResponse getSnapshot(
        @RequestParam(required = false) Integer days,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false) String tz,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session, null);
        ZoneId zone = CoachSnapshotService.resolveZone(tz);
        return coachSnapshotService.buildSnapshot(userId, today(date), windowDays(days), zone);
    }

    @GetMapping("/insights")
    public CoachInsightResponse getInsights(
        @RequestParam(required = false) Integer days,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false) String tz,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session, null);
        ZoneId zone = CoachSnapshotService.resolveZone(tz);
        return coachInsightService.getOrGenerate(userId, today(date), windowDays(days), zone);
    }

    @PostMapping("/insights/refresh")
    public CoachInsightResponse refreshInsights(
        @RequestParam(required = false) Integer days,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false) String tz,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session, null);
        rateLimitService.checkRefreshLimit(userId);
        ZoneId zone = CoachSnapshotService.resolveZone(tz);
        return coachInsightService.refresh(userId, today(date), windowDays(days), zone);
    }

    private LocalDate today(LocalDate provided) {
        return provided != null ? provided : LocalDate.now();
    }

    private int windowDays(Integer days) {
        return days != null ? Math.min(MAX_DAYS, Math.max(1, days)) : DEFAULT_DAYS;
    }
}
