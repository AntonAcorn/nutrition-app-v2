package com.aiduparc.nutrition.coach.repository;

import com.aiduparc.nutrition.coach.model.UserInsightEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserInsightRepository extends JpaRepository<UserInsightEntity, UUID> {

    List<UserInsightEntity> findByUserIdAndValidUntilAfterAndDismissedAtIsNullOrderByGeneratedAtDesc(
        UUID userId, OffsetDateTime now);

    Optional<UserInsightEntity> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndGeneratedAtAfter(UUID userId, OffsetDateTime cutoff);
}
