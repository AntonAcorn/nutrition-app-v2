package com.aiduparc.nutrition.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "daily_metrics")
public class DailyMetric {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "calories_consumed_kcal", nullable = false, precision = 10, scale = 2)
    private BigDecimal caloriesConsumedKcal = BigDecimal.ZERO;

    @Column(name = "calories_target_kcal", precision = 10, scale = 2)
    private BigDecimal caloriesTargetKcal;

    @Column(name = "protein_g", precision = 10, scale = 2)
    private BigDecimal proteinG;

    @Column(name = "fiber_g", precision = 10, scale = 2)
    private BigDecimal fiberG;

    @Column(name = "data_source", nullable = false)
    private String dataSource = "manual";

    @Column(name = "source_payload", columnDefinition = "jsonb")
    private String sourcePayload;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getMetricDate() { return metricDate; }
    public void setMetricDate(LocalDate metricDate) { this.metricDate = metricDate; }
    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }
    public BigDecimal getCaloriesConsumedKcal() { return caloriesConsumedKcal; }
    public void setCaloriesConsumedKcal(BigDecimal caloriesConsumedKcal) { this.caloriesConsumedKcal = caloriesConsumedKcal; }
    public BigDecimal getCaloriesTargetKcal() { return caloriesTargetKcal; }
    public void setCaloriesTargetKcal(BigDecimal caloriesTargetKcal) { this.caloriesTargetKcal = caloriesTargetKcal; }
    public BigDecimal getProteinG() { return proteinG; }
    public void setProteinG(BigDecimal proteinG) { this.proteinG = proteinG; }
    public BigDecimal getFiberG() { return fiberG; }
    public void setFiberG(BigDecimal fiberG) { this.fiberG = fiberG; }
    public String getDataSource() { return dataSource; }
    public void setDataSource(String dataSource) { this.dataSource = dataSource; }
    public String getSourcePayload() { return sourcePayload; }
    public void setSourcePayload(String sourcePayload) { this.sourcePayload = sourcePayload; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
