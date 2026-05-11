package com.aiduparc.nutrition.entitlement.webhook;

import com.aiduparc.nutrition.entitlement.service.EntitlementService;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Translates RevenueCat webhook events into entitlement state changes.
 *
 * <p>Event types we act on:
 * <ul>
 *   <li>INITIAL_PURCHASE / RENEWAL / UNCANCELLATION / PRODUCT_CHANGE -
 *       update {@code pro_active_until} from {@code expiration_at_ms}</li>
 *   <li>NON_RENEWING_PURCHASE - if product is in the Founder list,
 *       atomically assign the next founder number</li>
 *   <li>CANCELLATION / EXPIRATION / BILLING_ISSUE - no-op. The user keeps
 *       access until {@code pro_active_until} elapses naturally.</li>
 * </ul>
 *
 * <p>We treat {@code app_user_id} as our user UUID. The RC SDK on the client
 * must be initialized with that UUID before any purchase call.
 */
@Service
public class RevenueCatWebhookService {

    private static final Logger log = LoggerFactory.getLogger(RevenueCatWebhookService.class);

    private final EntitlementService entitlementService;
    private final Set<String> founderProductIds;

    public RevenueCatWebhookService(
            EntitlementService entitlementService,
            @Value("${nutrition.revenuecat.founder-product-ids:rumbly_founder_lifetime}") String founderProductIds
    ) {
        this.entitlementService = entitlementService;
        this.founderProductIds = new HashSet<>(Arrays.asList(founderProductIds.split("\\s*,\\s*")));
    }

    public void handle(RevenueCatEvent event) {
        if (event == null || event.type() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing event type");
        }
        UUID userId = parseUserId(event.appUserId());

        switch (event.type()) {
            case "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE" -> {
                if (isFounderProduct(event.productId())) {
                    // Edge case: founder is non-renewing, but if it ever lands
                    // here (config mismatch, sandbox quirk) treat as activation.
                    int n = entitlementService.activateFounder(userId, event.appUserId());
                    log.info("rc webhook founder via {} userId={} num={}", event.type(), userId, n);
                } else {
                    OffsetDateTime until = parseExpiration(event.expirationAtMs());
                    entitlementService.setProActiveUntil(userId, until, event.appUserId());
                    log.info("rc webhook pro {} userId={} until={} product={}",
                            event.type(), userId, until, event.productId());
                }
            }
            case "NON_RENEWING_PURCHASE" -> {
                if (isFounderProduct(event.productId())) {
                    int n = entitlementService.activateFounder(userId, event.appUserId());
                    log.info("rc webhook founder activated userId={} num={}", userId, n);
                } else {
                    log.warn("rc webhook non-renewing purchase for unknown product userId={} product={}",
                            userId, event.productId());
                }
            }
            case "CANCELLATION", "EXPIRATION", "BILLING_ISSUE", "SUBSCRIBER_ALIAS",
                 "TRANSFER", "TEST" -> {
                log.info("rc webhook ignored userId={} type={}", userId, event.type());
            }
            default -> log.warn("rc webhook unknown type userId={} type={}", userId, event.type());
        }
    }

    private boolean isFounderProduct(String productId) {
        return productId != null && founderProductIds.contains(productId);
    }

    private static UUID parseUserId(String appUserId) {
        if (appUserId == null || appUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing app_user_id");
        }
        try {
            return UUID.fromString(appUserId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "app_user_id must be a UUID (got: " + appUserId + ")");
        }
    }

    private static OffsetDateTime parseExpiration(Long ms) {
        if (ms == null) {
            // Defensive: if RC ever omits expiration on RENEWAL, fall back to
            // a 30-day grant rather than wiping access entirely.
            return OffsetDateTime.now(ZoneOffset.UTC).plusDays(30);
        }
        return OffsetDateTime.ofInstant(Instant.ofEpochMilli(ms), ZoneOffset.UTC);
    }
}
