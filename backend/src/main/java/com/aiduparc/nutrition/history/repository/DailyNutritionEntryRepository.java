package com.aiduparc.nutrition.history.repository;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyNutritionEntryRepository extends JpaRepository<DailyNutritionEntryEntity, UUID> {

    Optional<DailyNutritionEntryEntity> findByUserIdAndEntryDate(UUID userId, LocalDate entryDate);

    List<DailyNutritionEntryEntity> findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(
        UUID userId,
        LocalDate start,
        LocalDate end
    );
}
