package com.aiduparc.nutrition.entitlement.api;

import com.aiduparc.nutrition.entitlement.model.EntitlementTier;
import com.aiduparc.nutrition.entitlement.model.UserEntitlementEntity;
import com.aiduparc.nutrition.entitlement.service.EntitlementService;
import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Comp / press / influencer access. Lets the owner grant Pro to specific
 * emails (e.g. friends, beta testers, journalists) without paying through
 * RevenueCat. Operations are intentionally narrow: lookup, grant Pro for N
 * days, revoke Pro. Founder grants are deliberately NOT supported here so
 * the public-facing "X / 200 left" counter never gets gamed by comp issues.
 *
 * <p>Authentication: a single shared Bearer token from the env var
 * {@code NUTRITION_ADMIN_TOKEN}. Constant-time compare to dodge timing
 * attacks. If the env is unset, every endpoint 503s — fail loud so a
 * forgotten deploy can't accidentally leave admin wide open.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminEntitlementController {

    private static final Logger log = LoggerFactory.getLogger(AdminEntitlementController.class);
    private static final String BEARER = "Bearer ";

    private final EntitlementService entitlementService;
    private final AuthAccountRepository authAccountRepository;
    private final String expectedToken;

    public AdminEntitlementController(
            EntitlementService entitlementService,
            AuthAccountRepository authAccountRepository,
            @Value("${nutrition.admin.token:}") String expectedToken
    ) {
        this.entitlementService = entitlementService;
        this.authAccountRepository = authAccountRepository;
        this.expectedToken = expectedToken == null ? "" : expectedToken.trim();
    }

    @PostConstruct
    void warnIfUnconfigured() {
        if (expectedToken.isEmpty()) {
            log.warn("NUTRITION_ADMIN_TOKEN is not set — every /api/admin/* request will 503. "
                    + "Configure it before granting comp access.");
        } else {
            log.info("Admin entitlement endpoints active (token length={}).", expectedToken.length());
        }
    }

    public record GrantRequest(
        @Email @NotBlank String email,
        @Min(1) int days
    ) {}

    public record AdminEntitlementView(
        UUID userId,
        String email,
        EntitlementTier tier,
        OffsetDateTime trialEndsAt,
        OffsetDateTime proActiveUntil,
        Integer founderNumber
    ) {}

    /** Look up the current tier for one email. */
    @GetMapping("/entitlement")
    public AdminEntitlementView lookup(
            @RequestParam @Email String email,
            HttpServletRequest request
    ) {
        requireAdmin(request);
        AuthAccountEntity account = findAccountOrThrow(email);
        UserEntitlementEntity ent = entitlementService.getOrBootstrap(account.getNutritionUserId());
        return new AdminEntitlementView(
                account.getNutritionUserId(),
                account.getEmail(),
                entitlementService.tierOf(ent),
                ent.getTrialEndsAt(),
                ent.getProActiveUntil(),
                ent.getFounderNumber()
        );
    }

    /**
     * Grant Pro access for N days from now. Idempotent: re-granting extends
     * (because setProActiveUntil overwrites with the new timestamp).
     */
    @PostMapping("/grant-pro")
    public AdminEntitlementView grantPro(
            @RequestBody GrantRequest body,
            HttpServletRequest request
    ) {
        requireAdmin(request);
        AuthAccountEntity account = findAccountOrThrow(body.email());
        OffsetDateTime until = OffsetDateTime.now(ZoneOffset.UTC).plusDays(body.days());
        entitlementService.setProActiveUntil(account.getNutritionUserId(), until, null);
        log.info("admin granted Pro email={} days={} until={}", body.email(), body.days(), until);
        return lookup(body.email(), request);
    }

    /** Revoke Pro immediately. Useful for cleanup if a comp grant was wrong. */
    @PostMapping("/revoke-pro")
    public AdminEntitlementView revokePro(
            @RequestParam @Email String email,
            HttpServletRequest request
    ) {
        requireAdmin(request);
        AuthAccountEntity account = findAccountOrThrow(email);
        entitlementService.revokePro(account.getNutritionUserId());
        log.info("admin revoked Pro email={}", email);
        return lookup(email, request);
    }

    private void requireAdmin(HttpServletRequest request) {
        if (expectedToken.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin endpoint not configured");
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        }
        String provided = header.substring(BEARER.length()).trim();
        if (!constantTimeEquals(provided, expectedToken)) {
            log.warn("admin endpoint rejected: bad token from {}", request.getRemoteAddr());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin token");
        }
    }

    private AuthAccountEntity findAccountOrThrow(String email) {
        return authAccountRepository.findByEmailIgnoreCase(email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No account for " + email));
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
