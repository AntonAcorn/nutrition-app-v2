package com.aiduparc.nutrition.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

@Component
public class GoogleOAuth2FailureHandler implements AuthenticationFailureHandler {

    private final String appBaseUrl;

    public GoogleOAuth2FailureHandler(@Value("${nutrition.app.base-url}") String appBaseUrl) {
        this.appBaseUrl = appBaseUrl;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        response.sendRedirect(appBaseUrl + "/oauth2/callback?status=error");
    }
}
