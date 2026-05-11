package com.aiduparc.nutrition.entitlement.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Subset of fields we consume from the RevenueCat webhook payload. See
 * https://www.revenuecat.com/docs/webhooks. The full payload has many more
 * fields; ignore-unknown keeps us forward-compatible with RC schema changes.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RevenueCatEvent(
        @JsonProperty("type") String type,
        @JsonProperty("app_user_id") String appUserId,
        @JsonProperty("original_app_user_id") String originalAppUserId,
        @JsonProperty("product_id") String productId,
        @JsonProperty("period_type") String periodType,
        @JsonProperty("expiration_at_ms") Long expirationAtMs,
        @JsonProperty("purchased_at_ms") Long purchasedAtMs,
        @JsonProperty("event_timestamp_ms") Long eventTimestampMs
) {
    /** RC wraps the event in `{"event": {...}}`. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Envelope(@JsonProperty("event") RevenueCatEvent event) {}
}
