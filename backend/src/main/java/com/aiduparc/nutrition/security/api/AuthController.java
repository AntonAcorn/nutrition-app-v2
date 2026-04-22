package com.aiduparc.nutrition.security.api;

import com.aiduparc.nutrition.security.AuthProperties;
import com.aiduparc.nutrition.security.service.AuthFacade;
import com.aiduparc.nutrition.security.service.AuthenticatedSession;
import com.aiduparc.nutrition.security.service.GoogleOAuthService;
import com.aiduparc.nutrition.security.service.GoogleUserInfo;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String AUTH_SESSION_KEY = "nutrition.auth.session";
    private static final String GOOGLE_STATE_KEY = "google_oauth_state";

    private final AuthFacade authFacade;
    private final GoogleOAuthService googleOAuthService;
    private final AuthProperties authProperties;

    public AuthController(AuthFacade authFacade, GoogleOAuthService googleOAuthService, AuthProperties authProperties) {
        this.authFacade = authFacade;
        this.googleOAuthService = googleOAuthService;
        this.authProperties = authProperties;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpSession session) {
        AuthenticatedSession authenticatedSession = authFacade.register(request);
        session.setAttribute(AUTH_SESSION_KEY, authenticatedSession);
        return ResponseEntity.status(HttpStatus.CREATED).body(authFacade.me(authenticatedSession));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpSession session) {
        AuthenticatedSession authenticatedSession = authFacade.login(request);
        session.setAttribute(AUTH_SESSION_KEY, authenticatedSession);
        return authFacade.me(authenticatedSession);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        authFacade.logout();
        session.invalidate();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public AuthResponse me(HttpSession session) {
        return authFacade.me((AuthenticatedSession) session.getAttribute(AUTH_SESSION_KEY));
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        authFacade.requestPasswordReset(request.email());
        return Map.of("message", "If this email is registered, you will receive a reset link.");
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> resetPassword(@RequestBody ResetPasswordRequest request) {
        boolean ok = authFacade.resetPassword(request.token(), request.newPassword());
        if (!ok) {
            throw new IllegalArgumentException("Invalid or expired reset link.");
        }
        return Map.of("message", "Password updated successfully.");
    }

    @GetMapping("/google")
    public void googleLogin(HttpSession session, HttpServletResponse response) throws IOException {
        String state = UUID.randomUUID().toString();
        session.setAttribute(GOOGLE_STATE_KEY, state);
        response.sendRedirect(googleOAuthService.buildAuthorizationUrl(state));
    }

    @GetMapping("/google/callback")
    public void googleCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpSession session,
            HttpServletResponse response) throws IOException {
        String expectedState = (String) session.getAttribute(GOOGLE_STATE_KEY);
        String frontendUrl = authProperties.googleRedirectUri().replaceAll("/api/auth/google/callback$", "");

        if (expectedState == null || !expectedState.equals(state)) {
            response.sendRedirect(frontendUrl + "/?google_error=state");
            return;
        }

        try {
            GoogleUserInfo userInfo = googleOAuthService.exchangeCodeForUserInfo(code);
            AuthenticatedSession authSession = authFacade.loginWithGoogle(userInfo);
            session.setAttribute(AUTH_SESSION_KEY, authSession);
            response.sendRedirect(frontendUrl + "/");
        } catch (Exception e) {
            response.sendRedirect(frontendUrl + "/?google_error=failed");
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<String> verifyEmail(@RequestParam String token) {
        boolean ok = authFacade.verifyEmail(token);
        if (ok) {
            return ResponseEntity.ok("Email verified. You can close this page.");
        }
        return ResponseEntity.badRequest().body("Invalid or expired verification link.");
    }
}
