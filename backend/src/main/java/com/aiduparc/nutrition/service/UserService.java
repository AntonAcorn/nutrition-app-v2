package com.aiduparc.nutrition.service;

import com.aiduparc.nutrition.domain.User;
import com.aiduparc.nutrition.repo.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getDefaultUser() {
        return userRepository.findFirstByDefaultUserTrue()
                .orElseThrow(() -> new IllegalStateException("Default user is not configured"));
    }
}
