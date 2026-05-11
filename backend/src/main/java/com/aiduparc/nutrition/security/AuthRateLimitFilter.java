package com.aiduparc.nutrition.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-IP rate limit on the sensitive POST endpoints under /api/auth/**.
 * Brute-force protection: keeps password guessing and verification-email spam in check
 * without needing an external dependency. For richer policies (sliding window, per-email
 * limits, distributed enforcement) move this to Caddy or Redis.
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private record Rule(int max, Duration window) {}

    private static final Map<String, Rule> RULES = Map.of(
            "/api/auth/login",            new Rule(10, Duration.ofMinutes(1)),
            "/api/auth/register",         new Rule(5,  Duration.ofHours(1)),
            "/api/auth/forgot-password",  new Rule(3,  Duration.ofHours(1)),
            "/api/auth/reset-password",   new Rule(5,  Duration.ofHours(1)),
            "/api/auth/resend-verification", new Rule(5, Duration.ofHours(1))
    );

    private final AuthRateLimiter limiter;

    public AuthRateLimitFilter(AuthRateLimiter limiter) {
        this.limiter = limiter;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return !RULES.containsKey(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = RULES.get(request.getRequestURI());
        String key = request.getRequestURI() + ":" + clientIp(request);
        if (!limiter.tryAcquire(key, rule.max(), rule.window())) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        // server.forward-headers-strategy=framework already populates getRemoteAddr()
        // from X-Forwarded-For when present. Defensive null guard.
        String ip = request.getRemoteAddr();
        return ip == null ? "unknown" : ip;
    }
}
