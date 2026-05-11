package com.aiduparc.nutrition.wellbeing.repository;

import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WellbeingEntryRepository extends JpaRepository<WellbeingEntryEntity, UUID> {

    List<WellbeingEntryEntity> findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(
        UUID userId, LocalDate fromInclusive, LocalDate toInclusive);

    Optional<WellbeingEntryEntity> findFirstByUserIdAndEntryDateOrderByCreatedAtAsc(
        UUID userId, LocalDate entryDate);
}
