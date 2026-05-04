package com.aiduparc.nutrition.history.repository;

import com.aiduparc.nutrition.history.model.MealSlotEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealSlotRepository extends JpaRepository<MealSlotEntity, UUID> {

    List<MealSlotEntity> findByUserIdAndEntryDateOrderBySortOrderAsc(UUID userId, LocalDate entryDate);

    Optional<MealSlotEntity> findByUserIdAndEntryDateAndSlotType(UUID userId, LocalDate entryDate, String slotType);
}
