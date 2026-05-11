package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.entitlement.service.EntitlementService;
import com.aiduparc.nutrition.photoanalysis.draft.repository.PhotoAnalysisDraftRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Two-layer guard for AI analysis calls:
 *
 * <ol>
 *   <li><b>Tier quota</b> ({@link EntitlementService}): FREE users get 1 photo
 *       + 1 voice/day. TRIAL/PRO/FOUNDER pass through this layer. Throws 402
 *       PAYMENT_REQUIRED on exhaustion.</li>
 *   <li><b>Global anti-abuse cap</b> (this class): everyone, including paid
 *       users, hits a hard daily ceiling (default 30/day) to bound a runaway
 *       script or compromised account. Throws 429 TOO_MANY_REQUESTS.</li>
 * </ol>
 */
@Service
public class AiAnalysisRateLimitService {

    public enum Kind { PHOTO, VOICE }

    private final PhotoAnalysisDraftRepository draftRepository;
    private final EntitlementService entitlementService;
    private final int dailyLimit;

    public AiAnalysisRateLimitService(
            PhotoAnalysisDraftRepository draftRepository,
            EntitlementService entitlementService,
            @Value("${nutrition.ai-analysis.daily-limit:30}") int dailyLimit
    ) {
        this.draftRepository = draftRepository;
        this.entitlementService = entitlementService;
        this.dailyLimit = dailyLimit;
    }

    /**
     * Enforces tier quota first (may throw 402), then global anti-abuse cap
     * (may throw 429). On success, the entitlement counter has already been
     * incremented for FREE users.
     */
    public void checkAndConsume(UUID userId, Kind kind) {
        if (kind == Kind.PHOTO) {
            entitlementService.consumePhotoQuota(userId);
        } else {
            entitlementService.consumeVoiceQuota(userId);
        }
        enforceAntiAbuseCap(userId);
    }

    private void enforceAntiAbuseCap(UUID userId) {
        OffsetDateTime startOfDay = OffsetDateTime.now(ZoneOffset.UTC)
                .toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        long count = draftRepository.countByUserIdAndCreatedAtAfter(userId, startOfDay);
        if (count >= dailyLimit) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Daily analysis cap reached (" + dailyLimit + "/day). Try again tomorrow."
            );
        }
    }
}
