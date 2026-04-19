package com.aiduparc.nutrition.security.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.security.api.RegisterRequest;
import com.aiduparc.nutrition.security.service.EmailVerificationService;
import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.user.model.UserEntity;
import com.aiduparc.nutrition.user.service.NutritionUserService;
import com.aiduparc.nutrition.user.service.UserProfileService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthFacadeTest {

    @Mock
    private AuthAccountService authAccountService;

    @Mock
    private NutritionUserService nutritionUserService;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    @Mock
    private EmailVerificationService emailVerificationService;

    @InjectMocks
    private AuthFacade authFacade;

    @Test
    void registerShouldCreateBoundNutritionUserSession() {
        UUID nutritionUserId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(nutritionUserId);
        user.setDisplayName("New User");
        user.setExternalRef("new@example.com");

        AuthAccountEntity account = new AuthAccountEntity();
        account.setId(accountId);
        account.setEmail("new@example.com");
        account.setDisplayName("New User");
        account.setNutritionUserId(nutritionUserId);

        when(nutritionUserService.createUser(eq("New User"), eq("new@example.com"))).thenReturn(user);
        when(authAccountService.createAccount(eq("new@example.com"), eq("secret123"), eq("New User"), eq(nutritionUserId)))
                .thenReturn(account);

        AuthenticatedSession session = authFacade.register(new RegisterRequest("new@example.com", "secret123", "New User"));

        assertNotNull(session);
        assertEquals(accountId, session.accountId());
        assertEquals("new@example.com", session.email());
        assertEquals("New User", session.displayName());
        assertEquals(nutritionUserId, session.nutritionUserId());
    }
}
