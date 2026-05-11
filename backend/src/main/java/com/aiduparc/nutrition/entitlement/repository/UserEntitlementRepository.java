package com.aiduparc.nutrition.entitlement.repository;

import com.aiduparc.nutrition.entitlement.model.UserEntitlementEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserEntitlementRepository extends JpaRepository<UserEntitlementEntity, UUID> {

    Optional<UserEntitlementEntity> findByRevenuecatAppUserId(String revenuecatAppUserId);

    @Query(value = "select coalesce(max(founder_number), 0) from user_entitlements", nativeQuery = true)
    int findMaxFounderNumber();

    @Query(value = "select count(*) from user_entitlements where founder_number is not null", nativeQuery = true)
    long countFounders();
}
