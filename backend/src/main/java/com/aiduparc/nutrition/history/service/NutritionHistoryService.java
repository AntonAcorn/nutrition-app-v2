package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.DailyNutritionEntrySnapshot;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NutritionHistoryService {

    private final DailyNutritionEntryRepository repository;

    public NutritionHistoryService(DailyNutritionEntryRepository repository) {
        this.repository = repository;
    }

    public Optional<DailyNutritionEntrySnapshot> findByUserAndDate(UUID userId, LocalDate entryDate) {
        return repository.findByUserIdAndEntryDate(userId, entryDate)
            .map(DailyNutritionEntrySnapshot::fromEntity);
    }

    public List<DailyNutritionEntrySnapshot> findByUserAndRange(UUID userId, LocalDate fromInclusive, LocalDate toInclusive) {
        return repository.findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, fromInclusive, toInclusive)
            .stream()
            .map(DailyNutritionEntrySnapshot::fromEntity)
            .toList();
    }

    public Optional<CurrentDaySummarySnapshot> findCurrentDaySummary(UUID userId, LocalDate currentDate) {
        return repository
            .findFirstByUserIdAndEntryDateLessThanEqualOrderByEntryDateDesc(userId, currentDate)
            .map(DailyNutritionEntrySnapshot::fromEntity)
            .map(CurrentDaySummarySnapshot::fromEntry);
    }

    @Transactional
    public DailyNutritionEntrySnapshot upsert(UpsertDailyNutritionEntryCommand command) {
        DailyNutritionEntryEntity entity = repository
            .findByUserIdAndEntryDate(command.userId(), command.entryDate())
            .orElseGet(DailyNutritionEntryEntity::new);

        entity.setUserId(command.userId());
        entity.setEntryDate(command.entryDate());
        entity.setWeightKg(command.weightKg());
        entity.setCaloriesConsumedKcal(command.caloriesConsumedKcal());
        entity.setCalorieTargetKcal(command.calorieTargetKcal());
        entity.setProteinGrams(command.proteinGrams());
        entity.setFiberGrams(command.fiberGrams());
        entity.setNotes(command.notes());

        DailyNutritionEntryEntity saved = repository.save(entity);
        return DailyNutritionEntrySnapshot.fromEntity(saved);
    }

    public record UpsertDailyNutritionEntryCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal calorieTargetKcal,
        BigDecimal weightKg,
        BigDecimal proteinGrams,
        BigDecimal fiberGrams,
        String notes
    ) {
    }
}
