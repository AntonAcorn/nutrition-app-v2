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
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final JavaMailSender mailSender;
    private final AuthAccountRepository authAccountRepository;
    private final String baseUrl;
    private final String fromEmail;

    public EmailVerificationService(
            JavaMailSender mailSender,
            AuthAccountRepository authAccountRepository,
            @Value("${nutrition.app.base-url}") String baseUrl,
            @Value("${spring.mail.username}") String fromEmail
    ) {
        this.mailSender = mailSender;
        this.authAccountRepository = authAccountRepository;
        this.baseUrl = baseUrl;
        this.fromEmail = fromEmail;
    }

    @Transactional
    public void sendVerificationEmail(AuthAccountEntity account) {
        try {
            String token = UUID.randomUUID().toString();
            account.setVerificationToken(token);
            account.setVerificationTokenExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusHours(24));
            authAccountRepository.save(account);

            String link = baseUrl + "/api/auth/verify?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(account.getEmail());
            message.setSubject("Confirm your email");
            message.setText("Hi " + account.getDisplayName() + ",\n\n"
                    + "Please confirm your email by clicking the link below:\n\n"
                    + link + "\n\n"
                    + "The link is valid for 24 hours.\n\n"
                    + "If you did not register, ignore this email.");

            mailSender.send(message);
            log.info("Verification email sent to {}", account.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send verification email to {}: {}", account.getEmail(), e.getMessage());
        }
    }

    @Transactional
    public boolean verify(String token) {
        return authAccountRepository.findByVerificationToken(token)
                .filter(account -> account.getVerificationTokenExpiresAt() != null
                        && account.getVerificationTokenExpiresAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC)))
                .map(account -> {
                    account.setEmailVerified(true);
                    account.setVerificationToken(null);
                    account.setVerificationTokenExpiresAt(null);
                    authAccountRepository.save(account);
                    log.info("Email verified for account {}", account.getEmail());
                    return true;
                })
                .orElse(false);
    }
}
