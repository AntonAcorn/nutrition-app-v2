package com.aiduparc.nutrition.security.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.security.AuthProperties;
import com.aiduparc.nutrition.security.SecurityConfig;
import com.aiduparc.nutrition.security.service.AuthFacade;
import com.aiduparc.nutrition.security.service.AuthenticatedSession;
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
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthFacade authFacade;

    @MockBean
    private GoogleOAuthService googleOAuthService;

    @MockBean
    private AuthProperties authProperties;

    @Test
    void registerShouldCreateAuthenticatedSession() throws Exception {
        AuthenticatedSession authenticatedSession = new AuthenticatedSession(
                UUID.randomUUID(),
                "new@example.com",
                "New User",
                null
        );

        when(authFacade.register(any())).thenReturn(authenticatedSession);
        when(authFacade.me(authenticatedSession)).thenReturn(new AuthResponse(
                authenticatedSession.accountId(),
                authenticatedSession.email(),
                authenticatedSession.displayName(),
                authenticatedSession.nutritionUserId(),
                true,
                false
        ));

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
                .andExpect(request().sessionAttribute("nutrition.auth.session", authenticatedSession))
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.email").value("new@example.com"));
    }
}
