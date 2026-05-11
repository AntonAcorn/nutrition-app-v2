package com.aiduparc.nutrition.entitlement.service;

import com.aiduparc.nutrition.entitlement.model.EntitlementTier;
import com.aiduparc.nutrition.entitlement.model.UserEntitlementEntity;
import com.aiduparc.nutrition.entitlement.repository.UserEntitlementRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owns user monetization state: trial / Pro / Founder Lifetime resolution and
 * daily AI quota for the free tier. Called by AI controllers before any
 * outbound OpenAI call so token spend is always gated by entitlement.
 *
 * <p>When {@code nutrition.paywall.enabled=false} (open-beta mode), every user
 * is treated as PRO: quota checks no-op, FounderBanner hides, paywall never
 * opens. The RevenueCat plumbing remains in place so flipping the flag re-
 * activates monetization without code changes.
 *
 * <p>See memory/project_monetization.md for the product decision.
 */
@Service
@Transactional(readOnly = true)
public class EntitlementService {

    private static final Logger log = LoggerFactory.getLogger(EntitlementService.class);

    public static final int TRIAL_DAYS = 7;
    public static final int FOUNDER_CAP = 200;
    public static final int FREE_PHOTO_PER_DAY = 1;
    public static final int FREE_VOICE_PER_DAY = 1;
    /**
     * Open-beta caps — enforced when {@code paywallEnabled=false}. Higher than
     * FREE caps because there is no upgrade path: this is the only quota the
     * user gets. Sized to cover a typical day of meal logging (≈ 4–6 entries)
     * with headroom for retries / edits.
     */
    public static final int OPEN_BETA_PHOTO_PER_DAY = 10;
    public static final int OPEN_BETA_VOICE_PER_DAY = 10;

    private final UserEntitlementRepository repository;
    private final boolean paywallEnabled;

    public EntitlementService(
            UserEntitlementRepository repository,
            @Value("${nutrition.paywall.enabled:false}") boolean paywallEnabled
    ) {
        this.repository = repository;
        this.paywallEnabled = paywallEnabled;
        log.info("entitlement initialised paywallEnabled={}", paywallEnabled);
    }

    public boolean isPaywallEnabled() {
        return paywallEnabled;
    }

    public EntitlementTier resolve(UUID userId) {
        if (!paywallEnabled) {
            // Open-beta: tier reported as PRO so other UI gates pass, but
            // consumeQuota still enforces the open-beta cap independently.
            return EntitlementTier.PRO;
        }
        return repository.findById(userId)
            .map(EntitlementService::tierOf)
            .orElse(EntitlementTier.FREE);
    }

    public UserEntitlementEntity getOrBootstrap(UUID userId) {
        return repository.findById(userId).orElseGet(() -> bootstrapTrial(userId));
    }

    /**
     * Creates a 7-day trial for a brand-new user. Idempotent: if a record
     * already exists, returns it unchanged.
     */
    @Transactional
    public UserEntitlementEntity bootstrapTrial(UUID userId) {
        return repository.findById(userId).orElseGet(() -> {
            var now = OffsetDateTime.now(ZoneOffset.UTC);
            var entity = new UserEntitlementEntity();
            entity.setUserId(userId);
            entity.setTrialStartedAt(now);
            entity.setTrialEndsAt(now.plusDays(TRIAL_DAYS));
            var saved = repository.save(entity);
            log.info("entitlement trial bootstrapped userId={} endsAt={}", userId, saved.getTrialEndsAt());
            return saved;
        });
    }

    /**
     * Throws 402 PAYMENT_REQUIRED if the user's free-tier photo quota is
     * exhausted. On success, increments the counter and returns the resolved
     * tier for logging.
     */
    @Transactional
    public EntitlementTier consumePhotoQuota(UUID userId) {
        return consumeQuota(userId, QuotaKind.PHOTO);
    }

    @Transactional
    public EntitlementTier consumeVoiceQuota(UUID userId) {
        return consumeQuota(userId, QuotaKind.VOICE);
    }

    private EntitlementTier consumeQuota(UUID userId, QuotaKind kind) {
        var entity = getOrBootstrap(userId);
        // In open-beta the entity exists but its trial/pro fields are unused;
        // we treat everyone as quota-capped regardless of tierOf(entity).
        if (paywallEnabled) {
            var tier = tierOf(entity);
            if (tier.hasAiAccess()) {
                return tier;
            }
        }

        // Daily cap, atomic reset at UTC midnight rollover.
        var today = LocalDate.now(ZoneOffset.UTC);
        if (entity.getAiUsageDate() == null || !today.equals(entity.getAiUsageDate())) {
            entity.setAiUsageDate(today);
            entity.setAiPhotoUsedToday(0);
            entity.setAiVoiceUsedToday(0);
        }
        int used = kind == QuotaKind.PHOTO ? entity.getAiPhotoUsedToday() : entity.getAiVoiceUsedToday();
        int cap = capFor(kind);
        if (used >= cap) {
            String message = paywallEnabled
                ? "Free tier " + kind.label + " quota reached (" + cap + "/day). Upgrade or wait until tomorrow."
                : "Daily AI " + kind.label + " limit reached (" + cap + "/day). Come back tomorrow.";
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, message);
        }
        if (kind == QuotaKind.PHOTO) {
            entity.setAiPhotoUsedToday(used + 1);
        } else {
            entity.setAiVoiceUsedToday(used + 1);
        }
        repository.save(entity);
        return paywallEnabled ? tierOf(entity) : EntitlementTier.PRO;
    }

    private int capFor(QuotaKind kind) {
        if (paywallEnabled) {
            return kind == QuotaKind.PHOTO ? FREE_PHOTO_PER_DAY : FREE_VOICE_PER_DAY;
        }
        return kind == QuotaKind.PHOTO ? OPEN_BETA_PHOTO_PER_DAY : OPEN_BETA_VOICE_PER_DAY;
    }

    public int photoCap() {
        return capFor(QuotaKind.PHOTO);
    }

    public int voiceCap() {
        return capFor(QuotaKind.VOICE);
    }

    /**
     * Updates Pro subscription expiry (called from RevenueCat webhook).
     */
    @Transactional
    public void setProActiveUntil(UUID userId, OffsetDateTime until, String revenuecatAppUserId) {
        var entity = getOrBootstrap(userId);
        entity.setProActiveUntil(until);
        if (revenuecatAppUserId != null && entity.getRevenuecatAppUserId() == null) {
            entity.setRevenuecatAppUserId(revenuecatAppUserId);
        }
        repository.save(entity);
        log.info("entitlement pro updated userId={} until={}", userId, until);
    }

    /**
     * Atomically assigns the next founder number if the cap isn't reached.
     * Returns the assigned number, or throws 409 CONFLICT if sold out.
     */
    @Transactional
    public int activateFounder(UUID userId, String revenuecatAppUserId) {
        // Re-check inside the transaction to avoid race when two clients try
        // to claim the last slot. The unique index on founder_number provides
        // the ultimate guarantee; this check just returns a friendlier 409.
        long sold = repository.countFounders();
        if (sold >= FOUNDER_CAP) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Founder Lifetime sold out (" + FOUNDER_CAP + " issued).");
        }
        var entity = getOrBootstrap(userId);
        if (entity.getFounderNumber() != null) {
            // Idempotent: user already a founder, return their existing number.
            return entity.getFounderNumber();
        }
        int next = repository.findMaxFounderNumber() + 1;
        entity.setFounderNumber(next);
        entity.setFounderPurchasedAt(OffsetDateTime.now(ZoneOffset.UTC));
        if (revenuecatAppUserId != null && entity.getRevenuecatAppUserId() == null) {
            entity.setRevenuecatAppUserId(revenuecatAppUserId);
        }
        repository.save(entity);
        log.info("entitlement founder activated userId={} number={}", userId, next);
        return next;
    }

    public long foundersIssued() {
        return repository.countFounders();
    }

    public long foundersRemaining() {
        if (!paywallEnabled) {
            // FounderBanner reads this value; returning 0 hides the banner.
            return 0;
        }
        return Math.max(0, FOUNDER_CAP - repository.countFounders());
    }

    public static EntitlementTier tierOf(UserEntitlementEntity e) {
        if (e == null) return EntitlementTier.FREE;
        if (e.getFounderPurchasedAt() != null) return EntitlementTier.FOUNDER;
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        if (e.getProActiveUntil() != null && e.getProActiveUntil().isAfter(now)) return EntitlementTier.PRO;
        if (e.getTrialEndsAt() != null && e.getTrialEndsAt().isAfter(now)) return EntitlementTier.TRIAL;
        return EntitlementTier.FREE;
    }

    private enum QuotaKind {
        PHOTO("photo"), VOICE("voice");
        final String label;
        QuotaKind(String label) { this.label = label; }
    }
}
