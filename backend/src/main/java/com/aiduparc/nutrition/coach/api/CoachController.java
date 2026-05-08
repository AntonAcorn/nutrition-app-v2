package com.aiduparc.nutrition.coach.api;

import com.aiduparc.nutrition.coach.service.CoachSnapshotService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coach")
public class CoachController {

    private static final int DEFAULT_DAYS = 7;
    private static final int MAX_DAYS = 30;

    private final CoachSnapshotService coachSnapshotService;
    private final CurrentNutritionUserResolver userResolver;

    public CoachController(
        CoachSnapshotService coachSnapshotService,
        CurrentNutritionUserResolver userResolver
    ) {
        this.coachSnapshotService = coachSnapshotService;
        this.userResolver = userResolver;
    }

    @GetMapping("/snapshot")
    public CoachSnapshotResponse getSnapshot(
        @RequestParam(required = false) Integer days,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session, null);
        LocalDate today = date != null ? date : LocalDate.now();
        int window = days != null ? Math.min(MAX_DAYS, Math.max(1, days)) : DEFAULT_DAYS;
        return coachSnapshotService.buildSnapshot(userId, today, window);
    }
}
