package com.aiduparc.nutrition.entitlement.api;

import com.aiduparc.nutrition.entitlement.model.EntitlementTier;
import java.time.OffsetDateTime;

public record EntitlementResponse(
        EntitlementTier tier,
        OffsetDateTime trialEndsAt,
        OffsetDateTime proActiveUntil,
        Integer founderNumber,
        long foundersRemaining,
        AiQuota photoQuota,
        AiQuota voiceQuota
) {
    public record AiQuota(int used, int cap, boolean unlimited) {}
}
