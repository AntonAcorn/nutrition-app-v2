package com.aiduparc.nutrition.security.oauth2;

import com.aiduparc.nutrition.security.service.GoogleOAuthAccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private static final String AUTH_SESSION_KEY = "nutrition.auth.session";
    private static final Logger log = LoggerFactory.getLogger(GoogleOAuth2SuccessHandler.class);

    private final GoogleOAuthAccountService googleOAuthAccountService;
    private final String appBaseUrl;

    public GoogleOAuth2SuccessHandler(
            GoogleOAuthAccountService googleOAuthAccountService,
            @Value("${nutrition.app.base-url}") String appBaseUrl) {
        this.googleOAuthAccountService = googleOAuthAccountService;
        this.appBaseUrl = appBaseUrl;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {
        var oauthToken = (OAuth2AuthenticationToken) authentication;
        var oauthUser = oauthToken.getPrincipal();

        String googleOauthId = oauthUser.getName();
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");

        try {
            var session = googleOAuthAccountService.findOrCreateAccount(googleOauthId, email, name);
            request.getSession(true).setAttribute(AUTH_SESSION_KEY, session);
            response.sendRedirect(appBaseUrl + "/oauth2/callback?status=success");
        } catch (Exception e) {
            log.error("Google OAuth2 account setup failed for email={}", email, e);
            response.sendRedirect(appBaseUrl + "/oauth2/callback?status=error");
        }
    }
}
