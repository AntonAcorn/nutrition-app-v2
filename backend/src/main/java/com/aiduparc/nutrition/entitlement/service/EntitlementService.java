package com.aiduparc.nutrition.entitlement.service;

import com.aiduparc.nutrition.entitlement.model.EntitlementTier;
import com.aiduparc.nutrition.entitlement.model.TrialEmailHashEntity;
import com.aiduparc.nutrition.entitlement.model.UserEntitlementEntity;
import com.aiduparc.nutrition.entitlement.repository.TrialEmailHashRepository;
import com.aiduparc.nutrition.entitlement.repository.UserEntitlementRepository;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final TrialEmailHashRepository trialHashRepository;
    private final AuthAccountRepository authAccountRepository;
    private final boolean paywallEnabled;
    private final String trialSalt;
    private final OffsetDateTime paywallLaunchedAt;

    public EntitlementService(
            UserEntitlementRepository repository,
            TrialEmailHashRepository trialHashRepository,
            AuthAccountRepository authAccountRepository,
            @Value("${nutrition.paywall.enabled:false}") boolean paywallEnabled,
            @Value("${nutrition.trial.email-salt:dev-salt-change-me}") String trialSalt,
            @Value("${nutrition.paywall.launched-at:}") String paywallLaunchedAtRaw
    ) {
        this.repository = repository;
        this.trialHashRepository = trialHashRepository;
        this.authAccountRepository = authAccountRepository;
        this.paywallEnabled = paywallEnabled;
        this.trialSalt = trialSalt;
        this.paywallLaunchedAt = paywallLaunchedAtRaw == null || paywallLaunchedAtRaw.isBlank()
                ? null
                : OffsetDateTime.parse(paywallLaunchedAtRaw);
        log.info("entitlement initialised paywallEnabled={} paywallLaunchedAt={} trialSaltLength={}",
                paywallEnabled, paywallLaunchedAt, trialSalt.length());
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
            .map(this::tierOf)
            .orElse(EntitlementTier.FREE);
    }

    public UserEntitlementEntity getOrBootstrap(UUID userId) {
        return repository.findById(userId).orElseGet(() -> bootstrapTrial(userId));
    }

    /**
     * Creates a 7-day trial for a brand-new user — unless this email has
     * already consumed one in the past (account-delete-then-re-register
     * gaming). Idempotent: if a record already exists, returns it unchanged.
     */
    @Transactional
    public UserEntitlementEntity bootstrapTrial(UUID userId) {
        return repository.findById(userId).orElseGet(() -> {
            var now = OffsetDateTime.now(ZoneOffset.UTC);
            var entity = new UserEntitlementEntity();
            entity.setUserId(userId);

            if (isFirstTrialForUserEmail(userId)) {
                entity.setTrialStartedAt(now);
                entity.setTrialEndsAt(now.plusDays(TRIAL_DAYS));
                var saved = repository.save(entity);
                log.info("entitlement trial bootstrapped userId={} endsAt={}", userId, saved.getTrialEndsAt());
                return saved;
            } else {
                // Email seen before — drop straight to FREE tier (no trial fields set).
                var saved = repository.save(entity);
                log.info("entitlement trial SKIPPED (email previously used) userId={}", userId);
                return saved;
            }
        });
    }

    /**
     * Returns true on the first trial for this email and records the hash
     * so subsequent re-registrations with the same email skip the trial.
     * Hard-deleting the auth_accounts row leaves this hash in place — that's
     * the whole point. Hash is SHA-256 of (salt + ":" + lowercased email),
     * one-way so the table is GDPR-safe even after account deletion.
     */
    private boolean isFirstTrialForUserEmail(UUID userId) {
        var account = authAccountRepository.findByNutritionUserId(userId).orElse(null);
        if (account == null || account.getEmail() == null) {
            // Apple private-relay or OAuth without email — can't fingerprint,
            // give the trial. Edge case, low abuse value.
            return true;
        }
        String hash = hashEmail(account.getEmail());
        if (trialHashRepository.existsById(hash)) {
            return false;
        }
        try {
            var row = new TrialEmailHashEntity();
            row.setEmailHash(hash);
            row.setFirstTrialAt(OffsetDateTime.now(ZoneOffset.UTC));
            trialHashRepository.save(row);
        } catch (DataIntegrityViolationException race) {
            // Concurrent first-trial bootstrap on the same email — second
            // caller saw existsById=false then PK collided. Treat as
            // not-first so we don't double-grant the trial.
            return false;
        }
        return true;
    }

    private String hashEmail(String email) {
        try {
            var md = MessageDigest.getInstance("SHA-256");
            md.update(trialSalt.getBytes(StandardCharsets.UTF_8));
            md.update((byte) ':');
            md.update(email.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(md.digest());
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by every JRE — should be unreachable.
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
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
     * Coach insights, weekly recap, inline tips, and what-if are TRIAL/PRO/FOUNDER
     * features. Without this guard the endpoints were callable on every account,
     * letting a FREE user (or expired-trial user) keep hitting GPT-4 with zero
     * revenue offset — a direct OpenAI bill leak. Frontend treats 402 as the
     * paywall trigger.
     */
    public void assertCoachAccess(UUID userId) {
        if (!paywallEnabled) return; // open-beta: everyone has access
        var tier = tierOf(getOrBootstrap(userId));
        if (!tier.hasCoachInsights()) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                "Coach is a Pro feature. Start your 7-day free trial to unlock it.");
        }
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
     * Immediately revoke Pro access — used on RevenueCat REFUND. We set
     * pro_active_until to now-1s rather than null so analytics can still tell
     * "had pro then refunded" apart from "never bought".
     */
    @Transactional
    public void revokePro(UUID userId) {
        var entity = getOrBootstrap(userId);
        entity.setProActiveUntil(OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        repository.save(entity);
        log.info("entitlement pro revoked userId={}", userId);
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
        try {
            repository.save(entity);
        } catch (DataIntegrityViolationException e) {
            // Two purchases hit findMaxFounderNumber() simultaneously and tried
            // to write the same `next` value. The unique index on founder_number
            // rejects the second one — surface it as 409 instead of a 500.
            log.warn("entitlement founder slot collision userId={} number={}", userId, next);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Founder slot was just taken — please retry.");
        }
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

    public EntitlementTier tierOf(UserEntitlementEntity e) {
        if (e == null) return EntitlementTier.FREE;
        if (e.getFounderPurchasedAt() != null) return EntitlementTier.FOUNDER;
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        if (e.getProActiveUntil() != null && e.getProActiveUntil().isAfter(now)) return EntitlementTier.PRO;

        OffsetDateTime trialEnd = e.getTrialEndsAt();
        // Grandfather window: every entitlement whose trial expired before the
        // paywall launched (i.e. created during the free beta) gets a fresh
        // 7-day trial computed from the launch date. Without this they'd drop
        // straight to FREE the moment the flag flips, after a month of full
        // access — burning goodwill.
        if (trialEnd != null && paywallLaunchedAt != null && trialEnd.isBefore(paywallLaunchedAt)) {
            trialEnd = paywallLaunchedAt.plusDays(TRIAL_DAYS);
        }
        if (trialEnd != null && trialEnd.isAfter(now)) return EntitlementTier.TRIAL;
        return EntitlementTier.FREE;
    }

    private enum QuotaKind {
        PHOTO("photo"), VOICE("voice");
        final String label;
        QuotaKind(String label) { this.label = label; }
    }
}
