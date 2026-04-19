package com.aiduparc.nutrition.user.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
public class UserProfileEntity {

    @Id
    private UUID id;

    @Column(name = "nutrition_user_id", nullable = false, unique = true)
    private UUID nutritionUserId;

    @Column(name = "age_years", nullable = false)
    private Integer ageYears;

    @Column(name = "gender", nullable = false)
    private String gender;

    @Column(name = "height_cm", precision = 5, scale = 1, nullable = false)
    private BigDecimal heightCm;

    @Column(name = "starting_weight_kg", precision = 6, scale = 2, nullable = false)
    private BigDecimal startingWeightKg;

    @Column(name = "activity_level", nullable = false)
    private String activityLevel;

    @Column(name = "goal", nullable = false)
    private String goal;

    @Column(name = "weight_loss_strategy")
    private String weightLossStrategy;

    @Column(name = "daily_calorie_target_kcal", precision = 10, scale = 2, nullable = false)
    private BigDecimal dailyCalorieTargetKcal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getNutritionUserId() { return nutritionUserId; }
    public void setNutritionUserId(UUID nutritionUserId) { this.nutritionUserId = nutritionUserId; }

    public Integer getAgeYears() { return ageYears; }
    public void setAgeYears(Integer ageYears) { this.ageYears = ageYears; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public BigDecimal getHeightCm() { return heightCm; }
    public void setHeightCm(BigDecimal heightCm) { this.heightCm = heightCm; }

    public BigDecimal getStartingWeightKg() { return startingWeightKg; }
    public void setStartingWeightKg(BigDecimal startingWeightKg) { this.startingWeightKg = startingWeightKg; }

    public String getActivityLevel() { return activityLevel; }
    public void setActivityLevel(String activityLevel) { this.activityLevel = activityLevel; }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }

    public String getWeightLossStrategy() { return weightLossStrategy; }
    public void setWeightLossStrategy(String weightLossStrategy) { this.weightLossStrategy = weightLossStrategy; }

    public BigDecimal getDailyCalorieTargetKcal() { return dailyCalorieTargetKcal; }
    public void setDailyCalorieTargetKcal(BigDecimal dailyCalorieTargetKcal) { this.dailyCalorieTargetKcal = dailyCalorieTargetKcal; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

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
