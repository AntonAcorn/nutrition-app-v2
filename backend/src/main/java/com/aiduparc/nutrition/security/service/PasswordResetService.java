package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import com.aiduparc.nutrition.security.repository.AuthAccountRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
            @Value("${nutrition.mail.from}") String fromEmail
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
            // 60s cooldown: derive last-sent from the existing 1h expiry column.
            OffsetDateTime expiry = account.getPasswordResetTokenExpiresAt();
            if (expiry != null) {
                OffsetDateTime lastSent = expiry.minusHours(1);
                if (lastSent.plusSeconds(60).isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
                    log.debug("Password reset email throttled accountId={}", account.getId());
                    return;
                }
            }
            String token = UUID.randomUUID().toString();
            account.setPasswordResetToken(token);
            account.setPasswordResetTokenExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
            authAccountRepository.save(account);

            String link = baseUrl + "/?reset_token=" + token;
            String name = account.getDisplayName() == null ? "there" : account.getDisplayName();
            EmailTemplates.Rendered rendered = EmailTemplates.passwordReset(name, link, baseUrl);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(account.getEmail());
            helper.setSubject("Reset your password");
            helper.setText(rendered.text(), rendered.html());

            mailSender.send(message);
            log.info("Password reset email sent accountId={}", account.getId());
        } catch (Exception e) {
            // See EmailVerificationService — log.error so Sentry pages us when
            // SMTP is down. Client response stays generic.
            log.error("Failed to send password reset email accountId={}", account.getId(), e);
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
                    log.info("Password reset for account accountId={}", account.getId());
                    return true;
                })
                .orElse(false);
    }
}
