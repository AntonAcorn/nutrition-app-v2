package com.aiduparc.nutrition.security.service;

import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.stereotype.Component;

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

        return fallbackUserId;
    }
}
