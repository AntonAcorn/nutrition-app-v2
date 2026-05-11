package com.aiduparc.nutrition.notifications.push;

import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
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
        UUID userId = currentNutritionUserResolver.resolve(session);
        return repository.findByUserId(userId).stream().findFirst()
                .map(s -> new PushSubscriptionResponse(true, s.isEnabled(), s.getReminderHour(), s.getTimezone()))
                .orElse(new PushSubscriptionResponse(false, false, 20, null));
    }

    @PostMapping("/subscribe")
    @ResponseStatus(HttpStatus.CREATED)
    public PushSubscriptionResponse subscribe(@Valid @RequestBody PushSubscribeRequest request, HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session);
        String platform = request.platform() != null ? request.platform() : "web";

        PushSubscriptionEntity sub;
        if ("apns".equals(platform)) {
            sub = repository.findByUserIdAndDeviceToken(userId, request.deviceToken())
                    .orElseGet(PushSubscriptionEntity::new);
            sub.setDeviceToken(request.deviceToken());
        } else {
            sub = repository.findByUserIdAndEndpoint(userId, request.endpoint())
                    .orElseGet(PushSubscriptionEntity::new);
            sub.setEndpoint(request.endpoint());
            sub.setP256dh(request.p256dh());
            sub.setAuth(request.auth());
        }

        sub.setUserId(userId);
        sub.setPlatform(platform);
        sub.setTimezone(request.timezone() != null ? request.timezone() : "UTC");
        sub.setReminderHour(request.reminderHour() != null ? request.reminderHour() : 20);
        sub.setEnabled(true);
        repository.save(sub);
        return new PushSubscriptionResponse(true, true, sub.getReminderHour(), sub.getTimezone());
    }

    @PutMapping("/settings")
    public PushSubscriptionResponse updateSettings(@Valid @RequestBody PushSettingsRequest request, HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session);
        var subs = repository.findByUserId(userId);
        subs.forEach(sub -> {
            sub.setEnabled(request.enabled());
            sub.setReminderHour(request.reminderHour());
            repository.save(sub);
        });
        String tz = subs.stream().findFirst().map(PushSubscriptionEntity::getTimezone).orElse(null);
        return new PushSubscriptionResponse(true, request.enabled(), request.reminderHour(), tz);
    }

    @PutMapping("/timezone")
    public PushSubscriptionResponse updateTimezone(@RequestBody TimezoneRequest request, HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session);
        if (request.timezone() == null || request.timezone().isBlank()) {
            return getSubscription(session);
        }
        var subs = repository.findByUserId(userId);
        subs.forEach(sub -> {
            sub.setTimezone(request.timezone());
            repository.save(sub);
        });
        return subs.stream().findFirst()
                .map(s -> new PushSubscriptionResponse(true, s.isEnabled(), s.getReminderHour(), s.getTimezone()))
                .orElse(new PushSubscriptionResponse(false, false, 20, request.timezone()));
    }

    public record TimezoneRequest(String timezone) {}

    @DeleteMapping("/unsubscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(HttpSession session) {
        UUID userId = currentNutritionUserResolver.resolve(session);
        repository.deleteAll(repository.findByUserId(userId));
    }
}
