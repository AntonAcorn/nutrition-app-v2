package com.aiduparc.nutrition.service;

import com.aiduparc.nutrition.config.ImportProperties;
import com.aiduparc.nutrition.domain.User;
import com.aiduparc.nutrition.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final ImportProperties importProperties;

    public UserService(UserRepository userRepository, ImportProperties importProperties) {
        this.userRepository = userRepository;
        this.importProperties = importProperties;
    }

    @Transactional
    public User getDefaultUser() {
        return userRepository.findFirstByDefaultUserTrue()
                .orElseGet(() -> {
                    User user = new User();
                    user.setExternalRef(importProperties.getDefaultUserRef());
                    user.setDisplayName(importProperties.getDefaultUserName());
                    user.setDefaultUser(true);
                    return userRepository.save(user);
                });
    }
}
