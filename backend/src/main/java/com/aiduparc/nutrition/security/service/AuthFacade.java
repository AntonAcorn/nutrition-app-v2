package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.security.api.AuthResponse;
import com.aiduparc.nutrition.security.api.LoginRequest;
import com.aiduparc.nutrition.security.api.RegisterRequest;
import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthFacade {

    private final AuthAccountService authAccountService;

    public AuthFacade(AuthAccountService authAccountService) {
        this.authAccountService = authAccountService;
    }

    @Transactional
    public AuthenticatedSession register(RegisterRequest request) {
        AuthAccountEntity account = authAccountService.createAccount(
            request.email(),
            request.password(),
            request.displayName(),
            null
        );
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
            return new AuthResponse(null, null, null, null, false);
        }

        return new AuthResponse(
            session.accountId(),
            session.email(),
            session.displayName(),
            session.nutritionUserId(),
            true
        );
    }

    public void logout() {
        // no-op for now, session invalidation is handled in the controller layer
    }

    private AuthResponse toResponse(AuthAccountEntity account, boolean authenticated) {
        UUID nutritionUserId = account.getNutritionUserId();
        return new AuthResponse(
            account.getId(),
            account.getEmail(),
            account.getDisplayName(),
            nutritionUserId,
            authenticated
        );
    }
}
