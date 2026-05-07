package com.aiduparc.nutrition.calorieBank.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
    name = "relax_days",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_relax_days_user_date", columnNames = {"user_id", "relax_date"})
    }
)
public class RelaxDayEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "relax_date", nullable = false)
    private LocalDate relaxDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public LocalDate getRelaxDate() { return relaxDate; }
    public void setRelaxDate(LocalDate relaxDate) { this.relaxDate = relaxDate; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
