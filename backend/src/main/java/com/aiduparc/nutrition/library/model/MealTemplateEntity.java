package com.aiduparc.nutrition.library.model;

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
@Table(name = "meal_templates")
public class MealTemplateEntity {

    @Id
    private UUID id;

    @Column(name = "nutrition_user_id", nullable = false)
    private UUID nutritionUserId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "items_json", nullable = false)
    private String itemsJson;

    @Column(name = "total_calories", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCalories;

    @Column(name = "total_protein", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalProtein;

    @Column(name = "total_fat", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFat;

    @Column(name = "total_fiber", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFiber;

    @Column(name = "total_carbs", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCarbs;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public UUID getNutritionUserId() { return nutritionUserId; }
    public void setNutritionUserId(UUID nutritionUserId) { this.nutritionUserId = nutritionUserId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getItemsJson() { return itemsJson; }
    public void setItemsJson(String itemsJson) { this.itemsJson = itemsJson; }
    public BigDecimal getTotalCalories() { return totalCalories; }
    public void setTotalCalories(BigDecimal totalCalories) { this.totalCalories = totalCalories; }
    public BigDecimal getTotalProtein() { return totalProtein; }
    public void setTotalProtein(BigDecimal totalProtein) { this.totalProtein = totalProtein; }
    public BigDecimal getTotalFat() { return totalFat; }
    public void setTotalFat(BigDecimal totalFat) { this.totalFat = totalFat; }
    public BigDecimal getTotalFiber() { return totalFiber; }
    public void setTotalFiber(BigDecimal totalFiber) { this.totalFiber = totalFiber; }
    public BigDecimal getTotalCarbs() { return totalCarbs; }
    public void setTotalCarbs(BigDecimal totalCarbs) { this.totalCarbs = totalCarbs; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
