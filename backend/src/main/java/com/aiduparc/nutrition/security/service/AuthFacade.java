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
    public AuthResponse register(RegisterRequest request) {
        AuthAccountEntity account = authAccountService.createAccount(
            request.email(),
            request.password(),
            request.displayName(),
            null
        );
        return toResponse(account, false);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        AuthAccountEntity account = authAccountService.findByEmail(request.email())
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!authAccountService.passwordMatches(account, request.password())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        authAccountService.markLoginSuccess(account);
        return toResponse(account, true);
    }

    public AuthResponse me() {
        return new AuthResponse(null, null, null, null, false);
    }

    public void logout() {
        // Session-based auth is not wired yet. Endpoint exists so frontend integration can start safely.
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
