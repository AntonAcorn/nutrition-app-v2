package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.security.api.AuthResponse;
import com.aiduparc.nutrition.security.api.LoginRequest;
import com.aiduparc.nutrition.security.api.RegisterRequest;
import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.user.model.UserEntity;
import com.aiduparc.nutrition.user.service.NutritionUserService;
import com.aiduparc.nutrition.user.service.UserProfileService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthFacade {

    private final AuthAccountService authAccountService;
    private final NutritionUserService nutritionUserService;
    private final UserProfileService userProfileService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;
    private final AppleSignInService appleSignInService;

    public AuthFacade(
            AuthAccountService authAccountService,
            NutritionUserService nutritionUserService,
            UserProfileService userProfileService,
            EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService,
            AppleSignInService appleSignInService
    ) {
        this.authAccountService = authAccountService;
        this.nutritionUserService = nutritionUserService;
        this.userProfileService = userProfileService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
        this.appleSignInService = appleSignInService;
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

        if (!account.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED");
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
            return new AuthResponse(null, null, null, null, false, false, false);
        }

        boolean hasProfile = session.nutritionUserId() != null
            && userProfileService.existsByNutritionUserId(session.nutritionUserId());

        boolean emailVerified = session.accountId() != null
            && authAccountService.findById(session.accountId())
                .map(AuthAccountEntity::isEmailVerified)
                .orElse(false);

        return new AuthResponse(
            session.accountId(),
            session.email(),
            session.displayName(),
            session.nutritionUserId(),
            true,
            hasProfile,
            emailVerified
        );
    }

    public boolean verifyEmail(String token) {
        return emailVerificationService.verify(token);
    }

    public void resendVerification(String email) {
        authAccountService.findByEmail(email)
                .filter(a -> !a.isEmailVerified())
                .ifPresent(emailVerificationService::sendVerificationEmail);
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
                if (byEmail.isPresent() && byEmail.get().isEmailVerified()) {
                    authAccountService.linkGoogleId(byEmail.get(), googleUser.id());
                    return byEmail.get();
                }
                UserEntity user = nutritionUserService.createUser(googleUser.name(), googleUser.email());
                AuthAccountEntity newAccount = authAccountService.createGoogleAccount(
                    googleUser.id(), googleUser.email(), googleUser.name(), user.getId()
                );
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

    @Transactional
    public AuthenticatedSession loginWithApple(String identityToken, String displayName) {
        AppleUserInfo appleUser = appleSignInService.verifyIdentityToken(identityToken);

        AuthAccountEntity account = authAccountService.findByAppleId(appleUser.appleId())
            .orElseGet(() -> {
                if (appleUser.email() != null) {
                    Optional<AuthAccountEntity> byEmail = authAccountService.findByEmail(appleUser.email());
                    if (byEmail.isPresent() && byEmail.get().isEmailVerified()) {
                        authAccountService.linkAppleId(byEmail.get(), appleUser.appleId());
                        return byEmail.get();
                    }
                }
                String name = (displayName != null && !displayName.isBlank()) ? displayName : "Apple User";
                UserEntity user = nutritionUserService.createUser(name, appleUser.email());
                AuthAccountEntity newAccount = authAccountService.createAppleAccount(
                    appleUser.appleId(), appleUser.email(), name, user.getId()
                );
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
            hasProfile,
            account.isEmailVerified()
        );
    }
}
