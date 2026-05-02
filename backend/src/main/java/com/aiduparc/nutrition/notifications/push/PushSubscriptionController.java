package com.aiduparc.nutrition.notifications.push;

import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/push")
public class PushSubscriptionController {

    private final PushSubscriptionRepository repository;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public PushSubscriptionController(
            PushSubscriptionRepository repository,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.repository = repository;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @GetMapping("/subscription")
    public PushSubscriptionResponse getSubscription(HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session, null);
        return repository.findByUserId(userId).stream().findFirst()
                .map(s -> new PushSubscriptionResponse(true, s.isEnabled(), s.getReminderHour()))
                .orElse(new PushSubscriptionResponse(false, false, 20));
    }

    @PostMapping("/subscribe")
    @ResponseStatus(HttpStatus.CREATED)
    public PushSubscriptionResponse subscribe(@RequestBody PushSubscribeRequest request, HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session, null);
        PushSubscriptionEntity sub = repository.findByUserIdAndEndpoint(userId, request.endpoint())
                .orElseGet(PushSubscriptionEntity::new);
        sub.setUserId(userId);
        sub.setEndpoint(request.endpoint());
        sub.setP256dh(request.p256dh());
        sub.setAuth(request.auth());
        sub.setTimezone(request.timezone() != null ? request.timezone() : "UTC");
        sub.setReminderHour(request.reminderHour() != null ? request.reminderHour() : 20);
        sub.setEnabled(true);
        repository.save(sub);
        return new PushSubscriptionResponse(true, true, sub.getReminderHour());
    }

    @PutMapping("/settings")
    public PushSubscriptionResponse updateSettings(@RequestBody PushSettingsRequest request, HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session, null);
        repository.findByUserId(userId).forEach(sub -> {
            sub.setEnabled(request.enabled());
            sub.setReminderHour(request.reminderHour());
            repository.save(sub);
        });
        return new PushSubscriptionResponse(true, request.enabled(), request.reminderHour());
    }

    @DeleteMapping("/unsubscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session, null);
        repository.deleteAll(repository.findByUserId(userId));
    }
}
