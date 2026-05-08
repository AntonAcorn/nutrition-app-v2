package com.aiduparc.nutrition.coach.repository;

import com.aiduparc.nutrition.coach.model.UserInsightEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserInsightRepository extends JpaRepository<UserInsightEntity, UUID> {

    List<UserInsightEntity> findByUserIdAndSnapshotWindowDaysAndValidUntilAfterAndDismissedAtIsNullOrderByGeneratedAtDesc(
        UUID userId, int snapshotWindowDays, OffsetDateTime now);

    Optional<UserInsightEntity> findByIdAndUserId(UUID id, UUID userId);

    List<UserInsightEntity> findTop20ByUserIdAndGeneratedAtAfterOrderByGeneratedAtDesc(
        UUID userId, OffsetDateTime cutoff);

    long countByUserIdAndGeneratedAtAfter(UUID userId, OffsetDateTime cutoff);
}
