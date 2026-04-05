package com.aiduparc.nutrition.repo;

import com.aiduparc.nutrition.domain.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findFirstByDefaultUserTrue();
}
