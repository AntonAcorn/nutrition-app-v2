package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final JavaMailSender mailSender;
    private final AuthAccountRepository authAccountRepository;
    private final AuthAccountService authAccountService;
    private final String baseUrl;
    private final String fromEmail;

    public PasswordResetService(
            JavaMailSender mailSender,
            AuthAccountRepository authAccountRepository,
            AuthAccountService authAccountService,
            @Value("${nutrition.app.base-url}") String baseUrl,
            @Value("${spring.mail.username}") String fromEmail
    ) {
        this.mailSender = mailSender;
        this.authAccountRepository = authAccountRepository;
        this.authAccountService = authAccountService;
        this.baseUrl = baseUrl;
        this.fromEmail = fromEmail;
    }

    @Transactional
    public void sendPasswordResetEmail(AuthAccountEntity account) {
        try {
            String token = UUID.randomUUID().toString();
            account.setPasswordResetToken(token);
            account.setPasswordResetTokenExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
            authAccountRepository.save(account);

            String link = baseUrl + "/?reset_token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(account.getEmail());
            message.setSubject("Reset your password");
            message.setText("Hi " + account.getDisplayName() + ",\n\n"
                    + "Click the link below to reset your password:\n\n"
                    + link + "\n\n"
                    + "The link is valid for 1 hour.\n\n"
                    + "If you did not request a password reset, ignore this email.");

            mailSender.send(message);
            log.info("Password reset email sent to {}", account.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send password reset email to {}: {}", account.getEmail(), e.getMessage());
        }
    }

    @Transactional
    public boolean resetPassword(String token, String rawPassword) {
        return authAccountRepository.findByPasswordResetToken(token)
                .filter(account -> account.getPasswordResetTokenExpiresAt() != null
                        && account.getPasswordResetTokenExpiresAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC)))
                .map(account -> {
                    authAccountService.updatePassword(account, rawPassword);
                    account.setPasswordResetToken(null);
                    account.setPasswordResetTokenExpiresAt(null);
                    authAccountRepository.save(account);
                    log.info("Password reset for account {}", account.getEmail());
                    return true;
                })
                .orElse(false);
    }
}
