package com.aiduparc.nutrition.wellbeing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "wellbeing_pattern_notifications")
public class WellbeingPatternNotificationEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "food_key", nullable = false)
    private String foodKey;

    @Column(nullable = false)
    private String tone;

    @Column(name = "notified_at", nullable = false, updatable = false)
    private OffsetDateTime notifiedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (notifiedAt == null) notifiedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getFoodKey() { return foodKey; }
    public void setFoodKey(String foodKey) { this.foodKey = foodKey; }
    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }
    public OffsetDateTime getNotifiedAt() { return notifiedAt; }
}
