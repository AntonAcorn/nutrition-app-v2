package com.aiduparc.nutrition.wellbeing.repository;

import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WellbeingEntryRepository extends JpaRepository<WellbeingEntryEntity, UUID> {

    boolean existsByUserIdAndCreatedAtAfter(UUID userId, OffsetDateTime after);

    long countByUserId(UUID userId);

    List<WellbeingEntryEntity> findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(UUID userId, OffsetDateTime after);
}
