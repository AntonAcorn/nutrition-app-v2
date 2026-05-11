package com.aiduparc.nutrition.entitlement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "user_entitlements")
public class UserEntitlementEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "trial_started_at")
    private OffsetDateTime trialStartedAt;

    @Column(name = "trial_ends_at")
    private OffsetDateTime trialEndsAt;

    @Column(name = "pro_active_until")
    private OffsetDateTime proActiveUntil;

    @Column(name = "founder_purchased_at")
    private OffsetDateTime founderPurchasedAt;

    @Column(name = "founder_number")
    private Integer founderNumber;

    @Column(name = "ai_photo_used_today", nullable = false)
    private int aiPhotoUsedToday;

    @Column(name = "ai_voice_used_today", nullable = false)
    private int aiVoiceUsedToday;

    @Column(name = "ai_usage_date")
    private LocalDate aiUsageDate;

    @Column(name = "revenuecat_app_user_id")
    private String revenuecatAppUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public OffsetDateTime getTrialStartedAt() { return trialStartedAt; }
    public void setTrialStartedAt(OffsetDateTime v) { this.trialStartedAt = v; }
    public OffsetDateTime getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(OffsetDateTime v) { this.trialEndsAt = v; }
    public OffsetDateTime getProActiveUntil() { return proActiveUntil; }
    public void setProActiveUntil(OffsetDateTime v) { this.proActiveUntil = v; }
    public OffsetDateTime getFounderPurchasedAt() { return founderPurchasedAt; }
    public void setFounderPurchasedAt(OffsetDateTime v) { this.founderPurchasedAt = v; }
    public Integer getFounderNumber() { return founderNumber; }
    public void setFounderNumber(Integer v) { this.founderNumber = v; }
    public int getAiPhotoUsedToday() { return aiPhotoUsedToday; }
    public void setAiPhotoUsedToday(int v) { this.aiPhotoUsedToday = v; }
    public int getAiVoiceUsedToday() { return aiVoiceUsedToday; }
    public void setAiVoiceUsedToday(int v) { this.aiVoiceUsedToday = v; }
    public LocalDate getAiUsageDate() { return aiUsageDate; }
    public void setAiUsageDate(LocalDate v) { this.aiUsageDate = v; }
    public String getRevenuecatAppUserId() { return revenuecatAppUserId; }
    public void setRevenuecatAppUserId(String v) { this.revenuecatAppUserId = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
