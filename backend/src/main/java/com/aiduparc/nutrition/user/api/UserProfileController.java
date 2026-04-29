package com.aiduparc.nutrition.user.api;

import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import com.aiduparc.nutrition.user.service.UserProfileService;
import com.aiduparc.nutrition.user.service.UserProfileService.CreateUserProfileCommand;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/profile")
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public UserProfileController(
            UserProfileService userProfileService,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.userProfileService = userProfileService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @PostMapping
    public ResponseEntity<UserProfileResponse> createProfile(
            @Valid @RequestBody CreateProfileRequest request,
            HttpSession session
    ) {
        UUID nutritionUserId = currentNutritionUserResolver.resolve(session, null);

        if (userProfileService.existsByNutritionUserId(nutritionUserId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Profile already exists");
        }

        var entity = userProfileService.createProfile(new CreateUserProfileCommand(
            nutritionUserId,
            request.ageYears(),
            request.gender(),
            request.heightCm(),
            request.startingWeightKg(),
            request.activityLevel(),
            request.goal(),
            request.weightLossStrategy()
        ));

        return ResponseEntity.status(HttpStatus.CREATED).body(UserProfileResponse.from(entity));
    }

    @PutMapping
    public UserProfileResponse updateProfile(
            @Valid @RequestBody CreateProfileRequest request,
            HttpSession session
    ) {
        UUID nutritionUserId = currentNutritionUserResolver.resolve(session, null);

        var entity = userProfileService.updateProfile(new UserProfileService.UpdateUserProfileCommand(
            nutritionUserId,
            request.ageYears(),
            request.gender(),
            request.heightCm(),
            request.startingWeightKg(),
            request.activityLevel(),
            request.goal(),
            request.weightLossStrategy()
        ));

        return UserProfileResponse.from(entity);
    }

    @GetMapping
    public UserProfileResponse getProfile(HttpSession session) {
        UUID nutritionUserId = currentNutritionUserResolver.resolve(session, null);

        return userProfileService.findByNutritionUserId(nutritionUserId)
            .map(UserProfileResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }
}
