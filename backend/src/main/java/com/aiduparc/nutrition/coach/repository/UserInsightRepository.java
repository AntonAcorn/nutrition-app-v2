package com.aiduparc.nutrition.coach.repository;

import com.aiduparc.nutrition.coach.model.UserInsightEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserInsightRepository extends JpaRepository<UserInsightEntity, UUID> {

    List<UserInsightEntity> findByUserIdAndValidUntilAfterOrderByGeneratedAtDesc(
        UUID userId, OffsetDateTime now);
}
