package com.aiduparc.nutrition.history.service;

import com.aiduparc.nutrition.history.api.TodaySummaryResponse;
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

    public TodaySummaryResponse getTodaySummary(UUID userId, LocalDate entryDate) {
        DailyNutritionEntrySnapshot snapshot = getOrCreateEmptySnapshot(userId, entryDate);

        BigDecimal consumedCalories = defaultBigDecimal(snapshot.caloriesConsumedKcal());
        BigDecimal dailyTargetCalories = defaultBigDecimal(snapshot.calorieTargetKcal());
        BigDecimal remainingCalories = dailyTargetCalories.subtract(consumedCalories).max(BigDecimal.ZERO);

        return new TodaySummaryResponse(
            userId,
            entryDate,
            consumedCalories,
            dailyTargetCalories,
            remainingCalories,
            defaultBigDecimal(snapshot.proteinGrams()),
            defaultBigDecimal(snapshot.fiberGrams())
        );
    }

    @Transactional
    public DailyNutritionEntrySnapshot addToDailyTotals(AddToDailyTotalsCommand command) {
        DailyNutritionEntrySnapshot current = getOrCreateEmptySnapshot(command.userId(), command.entryDate());

        return upsert(new UpsertDailyNutritionEntryCommand(
            command.userId(),
            command.entryDate(),
            defaultBigDecimal(current.caloriesConsumedKcal()).add(defaultBigDecimal(command.caloriesConsumedKcal())),
            current.calorieTargetKcal(),
            current.weightKg(),
            defaultBigDecimal(current.proteinGrams()).add(defaultBigDecimal(command.proteinGrams())),
            defaultBigDecimal(current.fiberGrams()).add(defaultBigDecimal(command.fiberGrams())),
            mergeNotes(current.notes(), command.notes())
        ));
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

    public record AddToDailyTotalsCommand(
        @NotNull UUID userId,
        @NotNull LocalDate entryDate,
        @NotNull BigDecimal caloriesConsumedKcal,
        BigDecimal proteinGrams,
        BigDecimal fiberGrams,
        String notes
    ) {
    }

    private DailyNutritionEntrySnapshot getOrCreateEmptySnapshot(UUID userId, LocalDate entryDate) {
        return findByUserAndDate(userId, entryDate)
            .orElseGet(() -> new DailyNutritionEntrySnapshot(
                null,
                userId,
                entryDate,
                null,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null,
                null,
                null
            ));
    }

    private static BigDecimal defaultBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String mergeNotes(String currentNotes, String incomingNotes) {
        if (incomingNotes == null || incomingNotes.isBlank()) {
            return currentNotes;
        }
        if (currentNotes == null || currentNotes.isBlank()) {
            return incomingNotes;
        }
        return currentNotes + "\n" + incomingNotes;
    }
}
