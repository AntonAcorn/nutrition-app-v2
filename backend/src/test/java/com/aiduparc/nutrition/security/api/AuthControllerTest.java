package com.aiduparc.nutrition.security.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.security.AuthProperties;
import com.aiduparc.nutrition.security.SecurityConfig;
import com.aiduparc.nutrition.security.service.AccountDeletionService;
import com.aiduparc.nutrition.security.service.AuthFacade;
import com.aiduparc.nutrition.security.service.AuthenticatedSession;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import com.aiduparc.nutrition.security.service.GoogleOAuthService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, com.aiduparc.nutrition.security.AuthRateLimiter.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthFacade authFacade;

    @MockBean
    private GoogleOAuthService googleOAuthService;

    @MockBean
    private AuthProperties authProperties;

    @MockBean
    private AccountDeletionService accountDeletionService;

    @MockBean
    private CurrentNutritionUserResolver currentNutritionUserResolver;

    @Test
    void registerShouldNotCreateSession() throws Exception {
        AuthenticatedSession authenticatedSession = new AuthenticatedSession(
                UUID.randomUUID(),
                "new@example.com",
                "New User",
                null
        );

        when(authFacade.register(any())).thenReturn(authenticatedSession);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "password": "secret123",
                                  "displayName": "New User"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authenticated").value(false))
                .andExpect(jsonPath("$.emailVerified").value(false))
                .andExpect(jsonPath("$.email").value("new@example.com"));
    }
}
