package com.aiduparc.nutrition.security.service;

import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentNutritionUserResolver {

    private static final String AUTH_SESSION_KEY = "nutrition.auth.session";

    public UUID resolve(HttpSession session, UUID fallbackUserId) {
        if (session != null) {
            Object value = session.getAttribute(AUTH_SESSION_KEY);
            if (value instanceof AuthenticatedSession authenticatedSession && authenticatedSession.nutritionUserId() != null) {
                return authenticatedSession.nutritionUserId();
            }
        }

        if (fallbackUserId != null) {
            return fallbackUserId;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
}
