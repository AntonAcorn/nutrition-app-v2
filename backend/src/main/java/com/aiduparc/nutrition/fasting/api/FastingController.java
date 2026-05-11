package com.aiduparc.nutrition.fasting.api;

import com.aiduparc.nutrition.fasting.service.FastingService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fasting")
public class FastingController {

    private final FastingService service;
    private final CurrentNutritionUserResolver resolver;

    public FastingController(FastingService service, CurrentNutritionUserResolver resolver) {
        this.service = service;
        this.resolver = resolver;
    }

    @GetMapping("/active")
    public FastingSessionResponse getActive(HttpSession session) {
        UUID userId = resolver.resolve(session);
        return service.getActive(userId).orElse(null);
    }

    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    public FastingSessionResponse start(@Valid @RequestBody StartFastRequest request, HttpSession session) {
        UUID userId = resolver.resolve(session);
        return service.startFast(userId, request.targetHours());
    }

    @PostMapping("/stop")
    public FastingSessionResponse stop(HttpSession session) {
        UUID userId = resolver.resolve(session);
        return service.stopFast(userId);
    }

    @GetMapping("/history")
    public List<FastingSessionResponse> history(HttpSession session) {
        UUID userId = resolver.resolve(session);
        return service.getHistory(userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, HttpSession session) {
        UUID userId = resolver.resolve(session);
        service.deleteSession(userId, id);
    }
}
