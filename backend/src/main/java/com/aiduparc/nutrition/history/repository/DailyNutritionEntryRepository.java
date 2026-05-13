package com.aiduparc.nutrition.history.repository;

import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DailyNutritionEntryRepository extends JpaRepository<DailyNutritionEntryEntity, UUID> {

    Optional<DailyNutritionEntryEntity> findByUserIdAndEntryDate(UUID userId, LocalDate entryDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM DailyNutritionEntryEntity e WHERE e.userId = :userId AND e.entryDate = :entryDate")
    Optional<DailyNutritionEntryEntity> findByUserIdAndEntryDateForUpdate(
        @Param("userId") UUID userId,
        @Param("entryDate") LocalDate entryDate
    );

    List<DailyNutritionEntryEntity> findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(
        UUID userId,
        LocalDate start,
        LocalDate end
    );
}
