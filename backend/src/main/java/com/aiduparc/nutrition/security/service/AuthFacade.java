package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.security.api.AuthResponse;
import com.aiduparc.nutrition.security.api.LoginRequest;
import com.aiduparc.nutrition.security.api.RegisterRequest;
import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.user.model.UserEntity;
import com.aiduparc.nutrition.user.service.NutritionUserService;
import com.aiduparc.nutrition.user.service.UserProfileService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthFacade {

    private final AuthAccountService authAccountService;
    private final NutritionUserService nutritionUserService;
    private final UserProfileService userProfileService;
    private final TelegramNotificationService telegramNotificationService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    public AuthFacade(
            AuthAccountService authAccountService,
            NutritionUserService nutritionUserService,
            UserProfileService userProfileService,
            TelegramNotificationService telegramNotificationService,
            EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService
    ) {
        this.authAccountService = authAccountService;
        this.nutritionUserService = nutritionUserService;
        this.userProfileService = userProfileService;
        this.telegramNotificationService = telegramNotificationService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
    }

    @Transactional
    public AuthenticatedSession register(RegisterRequest request) {
        UserEntity nutritionUser = nutritionUserService.createUser(request.displayName(), request.email());
        AuthAccountEntity account = authAccountService.createAccount(
            request.email(),
            request.password(),
            request.displayName(),
            nutritionUser.getId()
        );
        telegramNotificationService.notifyNewUser(account.getEmail(), account.getDisplayName());
        emailVerificationService.sendVerificationEmail(account);
        return new AuthenticatedSession(
            account.getId(),
            account.getEmail(),
            account.getDisplayName(),
            account.getNutritionUserId()
        );
    }

    @Transactional
    public AuthenticatedSession login(LoginRequest request) {
        AuthAccountEntity account = authAccountService.findByEmail(request.email())
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!authAccountService.passwordMatches(account, request.password())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        authAccountService.markLoginSuccess(account);
        return new AuthenticatedSession(
            account.getId(),
            account.getEmail(),
            account.getDisplayName(),
            account.getNutritionUserId()
        );
    }

    public AuthResponse me(AuthenticatedSession session) {
        if (session == null) {
            return new AuthResponse(null, null, null, null, false, false);
        }

        boolean hasProfile = session.nutritionUserId() != null
            && userProfileService.existsByNutritionUserId(session.nutritionUserId());

        return new AuthResponse(
            session.accountId(),
            session.email(),
            session.displayName(),
            session.nutritionUserId(),
            true,
            hasProfile
        );
    }

    public boolean verifyEmail(String token) {
        return emailVerificationService.verify(token);
    }

    public void requestPasswordReset(String email) {
        authAccountService.findByEmail(email)
                .ifPresent(passwordResetService::sendPasswordResetEmail);
    }

    public boolean resetPassword(String token, String newPassword) {
        return passwordResetService.resetPassword(token, newPassword);
    }

    @Transactional
    public AuthenticatedSession loginWithGoogle(GoogleUserInfo googleUser) {
        AuthAccountEntity account = authAccountService.findByGoogleId(googleUser.id())
            .orElseGet(() -> {
                Optional<AuthAccountEntity> byEmail = authAccountService.findByEmail(googleUser.email());
                if (byEmail.isPresent()) {
                    authAccountService.linkGoogleId(byEmail.get(), googleUser.id());
                    return byEmail.get();
                }
                UserEntity user = nutritionUserService.createUser(googleUser.name(), googleUser.email());
                AuthAccountEntity newAccount = authAccountService.createGoogleAccount(
                    googleUser.id(), googleUser.email(), googleUser.name(), user.getId()
                );
                telegramNotificationService.notifyNewUser(newAccount.getEmail(), newAccount.getDisplayName());
                return newAccount;
            });

        authAccountService.markLoginSuccess(account);
        return new AuthenticatedSession(
            account.getId(),
            account.getEmail(),
            account.getDisplayName(),
            account.getNutritionUserId()
        );
    }

    public void logout() {
        // no-op for now, session invalidation is handled in the controller layer
    }

    private AuthResponse toResponse(AuthAccountEntity account, boolean authenticated) {
        UUID nutritionUserId = account.getNutritionUserId();
        boolean hasProfile = nutritionUserId != null && userProfileService.existsByNutritionUserId(nutritionUserId);
        return new AuthResponse(
            account.getId(),
            account.getEmail(),
            account.getDisplayName(),
            nutritionUserId,
            authenticated,
            hasProfile
        );
    }
}
