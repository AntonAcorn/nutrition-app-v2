package com.aiduparc.nutrition.security;

import com.aiduparc.nutrition.security.service.AuthenticatedSession;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

public class SessionAuthFilter extends OncePerRequestFilter {

    static final String AUTH_SESSION_KEY = "nutrition.auth.session";

    /** Paths under /api/** that are reachable without a session. */
    private static final List<String> PUBLIC_PATTERNS = List.of(
            "/api/health",
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/logout",
            "/api/auth/me",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/resend-verification",
            "/api/auth/verify",
            "/api/auth/google",
            "/api/auth/google/callback",
            "/api/auth/google/token",
            "/api/auth/apple"
    );

    private final AntPathMatcher matcher = new AntPathMatcher();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            return true;
        }
        for (String pattern : PUBLIC_PATTERNS) {
            if (matcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        Object attr = session == null ? null : session.getAttribute(AUTH_SESSION_KEY);
        if (!(attr instanceof AuthenticatedSession authenticatedSession)
                || authenticatedSession.nutritionUserId() == null) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Authentication required\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
