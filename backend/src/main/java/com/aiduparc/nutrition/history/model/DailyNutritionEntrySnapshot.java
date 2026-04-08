package com.aiduparc.nutrition.history.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public record DailyNutritionEntrySnapshot(
    UUID id,
    UUID userId,
    LocalDate entryDate,
    BigDecimal weightKg,
    BigDecimal caloriesConsumedKcal,
    BigDecimal calorieTargetKcal,
    BigDecimal proteinGrams,
    BigDecimal fatGrams,
    BigDecimal fiberGrams,
    String notes,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static DailyNutritionEntrySnapshot fromEntity(DailyNutritionEntryEntity entity) {
        return new DailyNutritionEntrySnapshot(
            entity.getId(),
            entity.getUserId(),
            entity.getEntryDate(),
            entity.getWeightKg(),
            entity.getCaloriesConsumedKcal(),
            entity.getCalorieTargetKcal(),
            entity.getProteinGrams(),
            entity.getFatGrams(),
            entity.getFiberGrams(),
            entity.getNotes(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public Optional<BigDecimal> calorieBalanceKcal() {
        if (calorieTargetKcal == null || caloriesConsumedKcal == null) {
            return Optional.empty();
        }
        return Optional.of(calorieTargetKcal.subtract(caloriesConsumedKcal));
    }
}
