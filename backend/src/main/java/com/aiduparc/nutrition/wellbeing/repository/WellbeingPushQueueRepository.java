package com.aiduparc.nutrition.wellbeing.repository;

import com.aiduparc.nutrition.wellbeing.model.WellbeingPushQueueEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WellbeingPushQueueRepository extends JpaRepository<WellbeingPushQueueEntity, UUID> {

    List<WellbeingPushQueueEntity> findByScheduledAtBeforeAndSentAtIsNull(OffsetDateTime now);

    Optional<WellbeingPushQueueEntity> findTopByUserIdAndSentAtIsNotNullAndRespondedAtIsNullOrderBySentAtDesc(UUID userId);

    Optional<WellbeingPushQueueEntity> findTopByUserIdAndSentAtIsNullOrderByScheduledAtDesc(UUID userId);
}
