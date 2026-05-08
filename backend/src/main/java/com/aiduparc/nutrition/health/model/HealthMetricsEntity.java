package com.aiduparc.nutrition.health.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
    name = "health_metrics",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_health_metrics_user_date", columnNames = {"user_id", "metric_date"})
    }
)
public class HealthMetricsEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Column(name = "steps")
    private Integer steps;

    @Column(name = "active_kcal")
    private Integer activeKcal;

    @Column(name = "sleep_minutes")
    private Integer sleepMinutes;

    @Column(name = "workout_minutes")
    private Integer workoutMinutes;

    @Column(name = "workout_count")
    private Integer workoutCount;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public LocalDate getMetricDate() { return metricDate; }
    public void setMetricDate(LocalDate metricDate) { this.metricDate = metricDate; }
    public Integer getSteps() { return steps; }
    public void setSteps(Integer steps) { this.steps = steps; }
    public Integer getActiveKcal() { return activeKcal; }
    public void setActiveKcal(Integer activeKcal) { this.activeKcal = activeKcal; }
    public Integer getSleepMinutes() { return sleepMinutes; }
    public void setSleepMinutes(Integer sleepMinutes) { this.sleepMinutes = sleepMinutes; }
    public Integer getWorkoutMinutes() { return workoutMinutes; }
    public void setWorkoutMinutes(Integer workoutMinutes) { this.workoutMinutes = workoutMinutes; }
    public Integer getWorkoutCount() { return workoutCount; }
    public void setWorkoutCount(Integer workoutCount) { this.workoutCount = workoutCount; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
