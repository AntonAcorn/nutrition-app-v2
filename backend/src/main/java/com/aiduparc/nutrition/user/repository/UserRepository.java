package com.aiduparc.nutrition.user.repository;

import com.aiduparc.nutrition.user.model.UserEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
}
