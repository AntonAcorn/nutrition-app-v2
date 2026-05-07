package com.aiduparc.nutrition.notifications.push;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, UUID> {
    Optional<PushSubscriptionEntity> findByUserIdAndEndpoint(UUID userId, String endpoint);
    Optional<PushSubscriptionEntity> findByUserIdAndDeviceToken(UUID userId, String deviceToken);
    List<PushSubscriptionEntity> findByEnabled(boolean enabled);
    List<PushSubscriptionEntity> findByUserId(UUID userId);
    List<PushSubscriptionEntity> findByUserIdAndEnabled(UUID userId, boolean enabled);
}
