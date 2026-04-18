package com.aiduparc.nutrition.security.api;

import com.aiduparc.nutrition.security.service.AuthFacade;
import com.aiduparc.nutrition.security.service.AuthenticatedSession;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String AUTH_SESSION_KEY = "nutrition.auth.session";

    private final AuthFacade authFacade;

    public AuthController(AuthFacade authFacade) {
        this.authFacade = authFacade;
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
}
