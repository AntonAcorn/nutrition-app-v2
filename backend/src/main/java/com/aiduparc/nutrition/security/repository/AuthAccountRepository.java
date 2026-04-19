package com.aiduparc.nutrition.security.repository;

import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthAccountRepository extends JpaRepository<AuthAccountEntity, UUID> {

    Optional<AuthAccountEntity> findByEmailIgnoreCase(String email);

    Optional<AuthAccountEntity> findByVerificationToken(String token);
}
