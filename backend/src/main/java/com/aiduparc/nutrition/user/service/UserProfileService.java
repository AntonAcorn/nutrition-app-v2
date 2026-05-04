package com.aiduparc.nutrition.user.service;

import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
        MacroTargets macros = calculateMacroTargets(target, command.goal(), command.gender());

        UserProfileEntity entity = new UserProfileEntity();
        entity.setNutritionUserId(command.nutritionUserId());
        entity.setAgeYears(command.ageYears());
        entity.setGender(command.gender());
        entity.setHeightCm(command.heightCm());
        entity.setStartingWeightKg(command.startingWeightKg());
        entity.setTargetWeightKg(command.targetWeightKg());
        entity.setActivityLevel(command.activityLevel());
        entity.setGoal(command.goal());
        entity.setWeightLossStrategy(command.weightLossStrategy());
        entity.setDailyCalorieTargetKcal(target);
        entity.setProteinTargetG(macros.proteinG());
        entity.setFatTargetG(macros.fatG());
        entity.setCarbsTargetG(macros.carbsG());
        entity.setFiberTargetG(macros.fiberG());
        if (command.waterGoalGlasses() != null) {
            entity.setWaterGoalGlasses(command.waterGoalGlasses());
        }

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
        MacroTargets macros = command.proteinTargetG() != null
            ? new MacroTargets(command.proteinTargetG(), command.fatTargetG(), command.carbsTargetG(), command.fiberTargetG())
            : calculateMacroTargets(target, command.goal(), command.gender());

        entity.setAgeYears(command.ageYears());
        entity.setGender(command.gender());
        entity.setHeightCm(command.heightCm());
        entity.setStartingWeightKg(command.startingWeightKg());
        entity.setTargetWeightKg(command.targetWeightKg());
        entity.setActivityLevel(command.activityLevel());
        entity.setGoal(command.goal());
        entity.setWeightLossStrategy(command.weightLossStrategy());
        entity.setDailyCalorieTargetKcal(target);
        entity.setProteinTargetG(macros.proteinG());
        entity.setFatTargetG(macros.fatG());
        entity.setCarbsTargetG(macros.carbsG());
        entity.setFiberTargetG(macros.fiberG());
        if (command.waterGoalGlasses() != null) {
            entity.setWaterGoalGlasses(command.waterGoalGlasses());
        }

        return repository.save(entity);
    }

    public int getWaterGoal(UUID userId) {
        return findByNutritionUserId(userId)
            .map(UserProfileEntity::getWaterGoalGlasses)
            .orElse(4);
    }

    public Optional<BigDecimal> getTargetWeightKg(UUID userId) {
        return findByNutritionUserId(userId)
            .map(UserProfileEntity::getTargetWeightKg);
    }

    public BigDecimal getAdaptiveCalorieTarget(UserProfileEntity profile, BigDecimal currentWeightKg) {
        return CalorieTargetCalculator.calculate(
            profile.getAgeYears(),
            profile.getGender(),
            profile.getHeightCm(),
            currentWeightKg,
            profile.getActivityLevel(),
            profile.getGoal(),
            profile.getWeightLossStrategy()
        );
    }

    public MacroTargets getMacroTargets(UUID userId) {
        return findByNutritionUserId(userId)
            .map(p -> p.getProteinTargetG() != null
                ? new MacroTargets(p.getProteinTargetG(), p.getFatTargetG(), p.getCarbsTargetG(), p.getFiberTargetG())
                : calculateMacroTargets(p.getDailyCalorieTargetKcal(), p.getGoal(), p.getGender()))
            .orElse(MacroTargets.DEFAULT);
    }

    public static MacroTargets calculateMacroTargets(BigDecimal calorieTarget, String goal, String gender) {
        double kcal = calorieTarget.doubleValue();
        double proteinPct = switch (goal) {
            case "lose" -> 0.35;
            case "gain" -> 0.30;
            default     -> 0.25;
        };
        double fatPct  = "gain".equals(goal) ? 0.25 : 0.30;
        double carbsPct = 1.0 - proteinPct - fatPct;
        double fiberG  = "male".equals(gender) ? 30.0 : 25.0;
        return new MacroTargets(
            round(kcal * proteinPct / 4.0),
            round(kcal * fatPct   / 9.0),
            round(kcal * carbsPct / 4.0),
            round(fiberG)
        );
    }

    private static BigDecimal round(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    }

    public record MacroTargets(BigDecimal proteinG, BigDecimal fatG, BigDecimal carbsG, BigDecimal fiberG) {
        public static final MacroTargets DEFAULT = new MacroTargets(
            BigDecimal.valueOf(150), BigDecimal.valueOf(60),
            BigDecimal.valueOf(200), BigDecimal.valueOf(25)
        );
    }

    public record CreateUserProfileCommand(
        UUID nutritionUserId,
        int ageYears,
        String gender,
        BigDecimal heightCm,
        BigDecimal startingWeightKg,
        BigDecimal targetWeightKg,
        String activityLevel,
        String goal,
        String weightLossStrategy,
        Integer waterGoalGlasses
    ) {}

    public record UpdateUserProfileCommand(
        UUID nutritionUserId,
        int ageYears,
        String gender,
        BigDecimal heightCm,
        BigDecimal startingWeightKg,
        BigDecimal targetWeightKg,
        String activityLevel,
        String goal,
        String weightLossStrategy,
        BigDecimal proteinTargetG,
        BigDecimal fatTargetG,
        BigDecimal carbsTargetG,
        BigDecimal fiberTargetG,
        Integer waterGoalGlasses
    ) {}
}
