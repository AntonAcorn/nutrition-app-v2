package com.aiduparc.nutrition.user.service;

import com.aiduparc.nutrition.entitlement.service.EntitlementService;
import com.aiduparc.nutrition.user.model.UserEntity;
import com.aiduparc.nutrition.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NutritionUserService {

    private final UserRepository userRepository;
    private final EntitlementService entitlementService;

    public NutritionUserService(UserRepository userRepository, EntitlementService entitlementService) {
        this.userRepository = userRepository;
        this.entitlementService = entitlementService;
    }

    @Transactional
    public UserEntity createUser(String displayName, String externalRef) {
        UserEntity user = new UserEntity();
        user.setDisplayName(displayName == null || displayName.isBlank() ? "New user" : displayName.trim());
        user.setExternalRef(externalRef);
        UserEntity saved = userRepository.save(user);
        entitlementService.bootstrapTrial(saved.getId());
        return saved;
    }
}
