package com.aiduparc.nutrition.coach.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "coach_triggers")
public class CoachTriggerEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "kind", nullable = false, length = 48)
    private String kind;

    @Column(name = "fired_at", nullable = false)
    private OffsetDateTime firedAt;

    @Column(name = "payload_json", columnDefinition = "text")
    private String payloadJson;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (firedAt == null) firedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public OffsetDateTime getFiredAt() { return firedAt; }
    public void setFiredAt(OffsetDateTime firedAt) { this.firedAt = firedAt; }
    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }
}
