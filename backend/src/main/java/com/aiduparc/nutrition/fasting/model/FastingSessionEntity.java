package com.aiduparc.nutrition.fasting.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "fasting_sessions")
public class FastingSessionEntity {

    @Id
    private UUID id;

    @Column(name = "nutrition_user_id", nullable = false)
    private UUID nutritionUserId;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "target_hours", nullable = false)
    private int targetHours;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public UUID getNutritionUserId() { return nutritionUserId; }
    public void setNutritionUserId(UUID nutritionUserId) { this.nutritionUserId = nutritionUserId; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }
    public int getTargetHours() { return targetHours; }
    public void setTargetHours(int targetHours) { this.targetHours = targetHours; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
