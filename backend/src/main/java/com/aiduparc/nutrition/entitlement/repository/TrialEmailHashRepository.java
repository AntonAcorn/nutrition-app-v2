package com.aiduparc.nutrition.entitlement.repository;

import com.aiduparc.nutrition.entitlement.model.TrialEmailHashEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrialEmailHashRepository extends JpaRepository<TrialEmailHashEntity, String> {
    // existsById(emailHash) is enough — JpaRepository provides it.
}
