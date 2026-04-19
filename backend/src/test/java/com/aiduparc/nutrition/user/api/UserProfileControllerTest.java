package com.aiduparc.nutrition.user.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.security.SecurityConfig;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.service.UserProfileService;
import com.aiduparc.nutrition.user.service.UserProfileService.CreateUserProfileCommand;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(UserProfileController.class)
@Import(SecurityConfig.class)
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserProfileService userProfileService;

    @MockBean
    private CurrentNutritionUserResolver currentNutritionUserResolver;

    private static final String VALID_BODY = """
            {
              "ageYears": 30,
              "gender": "male",
              "heightCm": 180,
              "startingWeightKg": 80,
              "activityLevel": "sedentary",
              "goal": "maintain"
            }
            """;

    @Test
    void createProfileReturns201() throws Exception {
        UUID userId = UUID.randomUUID();
        when(currentNutritionUserResolver.resolve(any(), eq(null))).thenReturn(userId);
        when(userProfileService.existsByNutritionUserId(userId)).thenReturn(false);

        UserProfileEntity entity = buildEntity(userId, new BigDecimal("2136"));
        when(userProfileService.createProfile(any(CreateUserProfileCommand.class))).thenReturn(entity);

        mockMvc.perform(post("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ageYears").value(30))
                .andExpect(jsonPath("$.gender").value("male"))
                .andExpect(jsonPath("$.dailyCalorieTargetKcal").value(2136));
    }

    @Test
    void createProfileReturns409WhenProfileExists() throws Exception {
        UUID userId = UUID.randomUUID();
        when(currentNutritionUserResolver.resolve(any(), eq(null))).thenReturn(userId);
        when(userProfileService.existsByNutritionUserId(userId)).thenReturn(true);

        mockMvc.perform(post("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isConflict());
    }

    @Test
    void getProfileReturns200() throws Exception {
        UUID userId = UUID.randomUUID();
        when(currentNutritionUserResolver.resolve(any(), eq(null))).thenReturn(userId);

        UserProfileEntity entity = buildEntity(userId, new BigDecimal("2136"));
        when(userProfileService.findByNutritionUserId(userId)).thenReturn(Optional.of(entity));

        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goal").value("maintain"))
                .andExpect(jsonPath("$.dailyCalorieTargetKcal").value(2136));
    }

    @Test
    void getProfileReturns404WhenMissing() throws Exception {
        UUID userId = UUID.randomUUID();
        when(currentNutritionUserResolver.resolve(any(), eq(null))).thenReturn(userId);
        when(userProfileService.findByNutritionUserId(userId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isNotFound());
    }

    private UserProfileEntity buildEntity(UUID userId, BigDecimal target) {
        UserProfileEntity e = new UserProfileEntity();
        e.setNutritionUserId(userId);
        e.setAgeYears(30);
        e.setGender("male");
        e.setHeightCm(new BigDecimal("180"));
        e.setStartingWeightKg(new BigDecimal("80"));
        e.setActivityLevel("sedentary");
        e.setGoal("maintain");
        e.setDailyCalorieTargetKcal(target);
        return e;
    }
}
