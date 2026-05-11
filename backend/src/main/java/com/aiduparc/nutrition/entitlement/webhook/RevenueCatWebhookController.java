package com.aiduparc.nutrition.entitlement.webhook;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * RevenueCat webhook receiver. Authenticated by a shared {@code Authorization}
 * header value configured both here and in the RevenueCat dashboard.
 *
 * <p>Endpoint must return 2xx within a few seconds or RevenueCat will retry
 * with exponential backoff. Idempotency is provided by {@link RevenueCatWebhookService}:
 * every operation is a state set, not a delta, so duplicate deliveries are safe.
 */
@RestController
@RequestMapping("/api/webhooks/revenuecat")
public class RevenueCatWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RevenueCatWebhookController.class);

    private final RevenueCatWebhookService service;
    private final String expectedAuth;

    public RevenueCatWebhookController(
            RevenueCatWebhookService service,
            @Value("${nutrition.revenuecat.webhook-auth:}") String expectedAuth
    ) {
        this.service = service;
        this.expectedAuth = expectedAuth == null ? "" : expectedAuth.trim();
    }

    @PostMapping
    public ResponseEntity<Void> receive(
            @RequestBody RevenueCatEvent.Envelope envelope,
            HttpServletRequest request
    ) {
        if (expectedAuth.isEmpty()) {
            // Safer to refuse than to accept anything when the secret is unconfigured.
            log.error("rc webhook secret not configured (REVENUECAT_WEBHOOK_AUTH)");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Webhook not configured");
        }

        String provided = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (provided == null || !constantTimeEquals(provided.trim(), expectedAuth)) {
            log.warn("rc webhook rejected: bad auth from {}", request.getRemoteAddr());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook secret");
        }

        if (envelope == null || envelope.event() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing event");
        }

        try {
            service.handle(envelope.event());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (RuntimeException e) {
            // Don't return 5xx for a logic bug — RC will retry forever. Log loud,
            // ack so RC stops retrying, and we'll catch it in monitoring.
            log.error("rc webhook handler failed (acking to stop retries): type={} userId={}",
                    envelope.event().type(), envelope.event().appUserId(), e);
        }
        return ResponseEntity.ok().build();
    }

    /** Length-constant string equality to avoid timing attacks on the secret. */
    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
