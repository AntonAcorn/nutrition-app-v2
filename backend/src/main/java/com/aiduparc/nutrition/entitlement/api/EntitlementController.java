package com.aiduparc.nutrition.entitlement.api;

import com.aiduparc.nutrition.entitlement.model.EntitlementTier;
import com.aiduparc.nutrition.entitlement.model.UserEntitlementEntity;
import com.aiduparc.nutrition.entitlement.service.EntitlementService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/entitlement")
public class EntitlementController {

    private final EntitlementService entitlementService;
    private final CurrentNutritionUserResolver resolver;

    public EntitlementController(EntitlementService entitlementService, CurrentNutritionUserResolver resolver) {
        this.entitlementService = entitlementService;
        this.resolver = resolver;
    }

    @GetMapping
    public EntitlementResponse get(HttpSession session) {
        UUID userId = resolver.resolve(session);
        UserEntitlementEntity entity = entitlementService.getOrBootstrap(userId);
        EntitlementTier tier = EntitlementService.tierOf(entity);

        boolean unlimited = tier.hasAiAccess();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int photoUsed = today.equals(entity.getAiUsageDate()) ? entity.getAiPhotoUsedToday() : 0;
        int voiceUsed = today.equals(entity.getAiUsageDate()) ? entity.getAiVoiceUsedToday() : 0;

        return new EntitlementResponse(
                tier,
                entity.getTrialEndsAt(),
                entity.getProActiveUntil(),
                entity.getFounderNumber(),
                entitlementService.foundersRemaining(),
                new EntitlementResponse.AiQuota(
                        unlimited ? 0 : photoUsed,
                        EntitlementService.FREE_PHOTO_PER_DAY,
                        unlimited
                ),
                new EntitlementResponse.AiQuota(
                        unlimited ? 0 : voiceUsed,
                        EntitlementService.FREE_VOICE_PER_DAY,
                        unlimited
                )
        );
    }
}
