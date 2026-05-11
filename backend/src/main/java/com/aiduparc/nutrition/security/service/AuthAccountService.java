package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthAccountService {

    private final AuthAccountRepository authAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthAccountService(AuthAccountRepository authAccountRepository, PasswordEncoder passwordEncoder) {
        this.authAccountRepository = authAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Optional<AuthAccountEntity> findById(UUID id) {
        return authAccountRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<AuthAccountEntity> findByEmail(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }

        return authAccountRepository.findByEmailIgnoreCase(email.trim());
    }

    @Transactional
    public AuthAccountEntity createAccount(String email, String rawPassword, String displayName, UUID nutritionUserId) {
        var normalizedEmail = normalizeEmail(email);
        if (authAccountRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Account already exists for this email");
        }

        var account = new AuthAccountEntity();
        account.setEmail(normalizedEmail);
        account.setPasswordHash(passwordEncoder.encode(rawPassword));
        account.setDisplayName(displayName == null || displayName.isBlank() ? null : displayName.trim());
        account.setNutritionUserId(nutritionUserId);
        return authAccountRepository.save(account);
    }

    @Transactional
    public AuthAccountEntity bindExistingAccountToNutritionUser(String email, UUID nutritionUserId) {
        AuthAccountEntity account = findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account not found for this email"));
        account.setNutritionUserId(nutritionUserId);
        return authAccountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public Optional<AuthAccountEntity> findByGoogleId(String googleId) {
        if (googleId == null || googleId.isBlank()) {
            return Optional.empty();
        }
        return authAccountRepository.findByGoogleId(googleId);
    }

    @Transactional
    public AuthAccountEntity createGoogleAccount(String googleId, String email, String displayName, UUID nutritionUserId) {
        var account = new AuthAccountEntity();
        account.setEmail(email.trim().toLowerCase());
        account.setGoogleId(googleId);
        account.setDisplayName(displayName == null || displayName.isBlank() ? null : displayName.trim());
        account.setNutritionUserId(nutritionUserId);
        account.setEmailVerified(true);
        return authAccountRepository.save(account);
    }

    @Transactional
    public void linkGoogleId(AuthAccountEntity account, String googleId) {
        account.setGoogleId(googleId);
        authAccountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public Optional<AuthAccountEntity> findByAppleId(String appleId) {
        if (appleId == null || appleId.isBlank()) return Optional.empty();
        return authAccountRepository.findByAppleId(appleId);
    }

    @Transactional
    public AuthAccountEntity createAppleAccount(String appleId, String email, String displayName, UUID nutritionUserId) {
        var account = new AuthAccountEntity();
        account.setEmail(email != null ? email.trim().toLowerCase() : appleId + "@apple.local");
        account.setAppleId(appleId);
        account.setDisplayName(displayName == null || displayName.isBlank() ? null : displayName.trim());
        account.setNutritionUserId(nutritionUserId);
        account.setEmailVerified(true);
        return authAccountRepository.save(account);
    }

    @Transactional
    public void linkAppleId(AuthAccountEntity account, String appleId) {
        account.setAppleId(appleId);
        authAccountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public boolean passwordMatches(AuthAccountEntity account, String rawPassword) {
        return rawPassword != null && passwordEncoder.matches(rawPassword, account.getPasswordHash());
    }

    @Transactional
    public void updatePassword(AuthAccountEntity account, String rawPassword) {
        account.setPasswordHash(passwordEncoder.encode(rawPassword));
        authAccountRepository.save(account);
    }

    @Transactional
    public void markLoginSuccess(AuthAccountEntity account) {
        account.setLastLoginAt(OffsetDateTime.now(ZoneOffset.UTC));
        authAccountRepository.save(account);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        return email.trim().toLowerCase();
    }
}
