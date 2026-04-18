package com.aiduparc.nutrition.user.service;

import com.aiduparc.nutrition.user.model.UserEntity;
import com.aiduparc.nutrition.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NutritionUserService {

    private final UserRepository userRepository;

    public NutritionUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserEntity createUser(String displayName, String externalRef) {
        UserEntity user = new UserEntity();
        user.setDisplayName(displayName == null || displayName.isBlank() ? "New user" : displayName.trim());
        user.setExternalRef(externalRef);
        return userRepository.save(user);
    }
}
