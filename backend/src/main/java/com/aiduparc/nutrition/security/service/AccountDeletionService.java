package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.library.repository.MealTemplateRepository;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import com.aiduparc.nutrition.user.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AccountDeletionService {

    private final AuthAccountRepository authAccountRepository;
    private final MealTemplateRepository mealTemplateRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public AccountDeletionService(
            AuthAccountRepository authAccountRepository,
            MealTemplateRepository mealTemplateRepository,
            UserRepository userRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.authAccountRepository = authAccountRepository;
        this.mealTemplateRepository = mealTemplateRepository;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void deleteAccount(UUID userId, HttpSession session) {
        // tables without CASCADE on users(id)
        mealTemplateRepository.deleteByNutritionUserId(userId);
        jdbcTemplate.update("DELETE FROM photo_analysis_drafts WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM days WHERE user_id = ?", userId);

        // auth account (SET NULL would leave orphan row — delete explicitly)
        authAccountRepository.deleteByNutritionUserId(userId);

        // users — cascades: daily_nutrition_entries, meal_log_entries,
        //                    user_profiles, push_subscriptions
        userRepository.deleteById(userId);

        session.invalidate();
    }
}
