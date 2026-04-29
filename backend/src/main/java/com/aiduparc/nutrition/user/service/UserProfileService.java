package com.aiduparc.nutrition.user.service;

import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserProfileService {

    private final UserProfileRepository repository;

    public UserProfileService(UserProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public UserProfileEntity createProfile(CreateUserProfileCommand command) {
        BigDecimal target = CalorieTargetCalculator.calculate(
            command.ageYears(),
            command.gender(),
            command.heightCm(),
            command.startingWeightKg(),
            command.activityLevel(),
            command.goal(),
            command.weightLossStrategy()
        );

        UserProfileEntity entity = new UserProfileEntity();
        entity.setNutritionUserId(command.nutritionUserId());
        entity.setAgeYears(command.ageYears());
        entity.setGender(command.gender());
        entity.setHeightCm(command.heightCm());
        entity.setStartingWeightKg(command.startingWeightKg());
        entity.setActivityLevel(command.activityLevel());
        entity.setGoal(command.goal());
        entity.setWeightLossStrategy(command.weightLossStrategy());
        entity.setDailyCalorieTargetKcal(target);

        return repository.save(entity);
    }

    public Optional<UserProfileEntity> findByNutritionUserId(UUID nutritionUserId) {
        return repository.findByNutritionUserId(nutritionUserId);
    }

    public boolean existsByNutritionUserId(UUID nutritionUserId) {
        return repository.existsByNutritionUserId(nutritionUserId);
    }

    @Transactional
    public UserProfileEntity updateProfile(UpdateUserProfileCommand command) {
        UserProfileEntity entity = repository.findByNutritionUserId(command.nutritionUserId())
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        BigDecimal target = CalorieTargetCalculator.calculate(
            command.ageYears(),
            command.gender(),
            command.heightCm(),
            command.startingWeightKg(),
            command.activityLevel(),
            command.goal(),
            command.weightLossStrategy()
        );

        entity.setAgeYears(command.ageYears());
        entity.setGender(command.gender());
        entity.setHeightCm(command.heightCm());
        entity.setStartingWeightKg(command.startingWeightKg());
        entity.setActivityLevel(command.activityLevel());
        entity.setGoal(command.goal());
        entity.setWeightLossStrategy(command.weightLossStrategy());
        entity.setDailyCalorieTargetKcal(target);

        return repository.save(entity);
    }

    public record CreateUserProfileCommand(
        UUID nutritionUserId,
        int ageYears,
        String gender,
        BigDecimal heightCm,
        BigDecimal startingWeightKg,
        String activityLevel,
        String goal,
        String weightLossStrategy
    ) {}

    public record UpdateUserProfileCommand(
        UUID nutritionUserId,
        int ageYears,
        String gender,
        BigDecimal heightCm,
        BigDecimal startingWeightKg,
        String activityLevel,
        String goal,
        String weightLossStrategy
    ) {}
}
