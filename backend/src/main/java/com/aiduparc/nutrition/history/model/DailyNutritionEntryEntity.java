package com.aiduparc.nutrition.history.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
    name = "daily_nutrition_entries",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_daily_entries_user_date", columnNames = {"user_id", "entry_date"})
    }
)
public class DailyNutritionEntryEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "entry_date", nullable = false)
    private java.time.LocalDate entryDate;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "calories_consumed_kcal", precision = 10, scale = 2, nullable = false)
    private BigDecimal caloriesConsumedKcal;

    @Column(name = "calorie_target_kcal", precision = 10, scale = 2)
    private BigDecimal calorieTargetKcal;

    @Column(name = "protein_g", precision = 10, scale = 2)
    private BigDecimal proteinGrams;

    @Column(name = "fat_g", precision = 10, scale = 2)
    private BigDecimal fatGrams;

    @Column(name = "fiber_g", precision = 10, scale = 2)
    private BigDecimal fiberGrams;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public java.time.LocalDate getEntryDate() {
        return entryDate;
    }

    public void setEntryDate(java.time.LocalDate entryDate) {
        this.entryDate = entryDate;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public BigDecimal getCaloriesConsumedKcal() {
        return caloriesConsumedKcal;
    }

    public void setCaloriesConsumedKcal(BigDecimal caloriesConsumedKcal) {
        this.caloriesConsumedKcal = caloriesConsumedKcal;
    }

    public BigDecimal getCalorieTargetKcal() {
        return calorieTargetKcal;
    }

    public void setCalorieTargetKcal(BigDecimal calorieTargetKcal) {
        this.calorieTargetKcal = calorieTargetKcal;
    }

    public BigDecimal getProteinGrams() {
        return proteinGrams;
    }

    public void setProteinGrams(BigDecimal proteinGrams) {
        this.proteinGrams = proteinGrams;
    }

    public BigDecimal getFatGrams() {
        return fatGrams;
    }

    public void setFatGrams(BigDecimal fatGrams) {
        this.fatGrams = fatGrams;
    }

    public BigDecimal getFiberGrams() {
        return fiberGrams;
    }

    public void setFiberGrams(BigDecimal fiberGrams) {
        this.fiberGrams = fiberGrams;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    void onCreate() {
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
