package com.aiduparc.nutrition.history.repository;

import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealLogEntryRepository extends JpaRepository<MealLogEntryEntity, UUID> {

    List<MealLogEntryEntity> findByUserIdAndEntryDateOrderByCreatedAtAsc(UUID userId, LocalDate entryDate);

    Optional<MealLogEntryEntity> findByIdAndUserId(UUID id, UUID userId);

    Optional<MealLogEntryEntity> findTopByUserIdAndEntryDateAndNameOrderByCreatedAtDesc(
        UUID userId, LocalDate entryDate, String name
    );

    void deleteByUserIdAndEntryDate(UUID userId, LocalDate entryDate);

    List<MealLogEntryEntity> findByUserIdAndCreatedAtAfter(UUID userId, OffsetDateTime after);

    Optional<MealLogEntryEntity> findTopByUserIdAndCreatedAtBeforeOrderByCreatedAtDesc(UUID userId, OffsetDateTime before);
}
