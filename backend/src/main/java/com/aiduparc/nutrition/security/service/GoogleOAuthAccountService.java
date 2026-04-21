package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.notifications.TelegramNotificationService;
import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import com.aiduparc.nutrition.user.service.NutritionUserService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleOAuthAccountService {

    private final AuthAccountRepository authAccountRepository;
    private final NutritionUserService nutritionUserService;
    private final TelegramNotificationService telegramNotificationService;

    public GoogleOAuthAccountService(
            AuthAccountRepository authAccountRepository,
            NutritionUserService nutritionUserService,
            TelegramNotificationService telegramNotificationService) {
        this.authAccountRepository = authAccountRepository;
        this.nutritionUserService = nutritionUserService;
        this.telegramNotificationService = telegramNotificationService;
    }

    @Transactional
    public AuthenticatedSession findOrCreateAccount(String googleOauthId, String email, String displayName) {
        var byOauthId = authAccountRepository.findByGoogleOauthId(googleOauthId);
        if (byOauthId.isPresent()) {
            var account = byOauthId.get();
            account.setLastLoginAt(OffsetDateTime.now(ZoneOffset.UTC));
            authAccountRepository.save(account);
            return toSession(account);
        }

        var byEmail = authAccountRepository.findByEmailIgnoreCase(email);
        if (byEmail.isPresent()) {
            var account = byEmail.get();
            account.setGoogleOauthId(googleOauthId);
            account.setEmailVerified(true);
            account.setLastLoginAt(OffsetDateTime.now(ZoneOffset.UTC));
            authAccountRepository.save(account);
            return toSession(account);
        }

        var nutritionUser = nutritionUserService.createUser(displayName, email);
        var account = new AuthAccountEntity();
        account.setEmail(email.toLowerCase());
        account.setGoogleOauthId(googleOauthId);
        account.setDisplayName(displayName);
        account.setNutritionUserId(nutritionUser.getId());
        account.setEmailVerified(true);
        authAccountRepository.save(account);
        telegramNotificationService.notifyNewUser(account.getEmail(), account.getDisplayName());
        return toSession(account);
    }

    private AuthenticatedSession toSession(AuthAccountEntity account) {
        return new AuthenticatedSession(
                account.getId(),
                account.getEmail(),
                account.getDisplayName(),
                account.getNutritionUserId());
    }
}
