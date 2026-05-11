package com.aiduparc.nutrition.security;

import com.aiduparc.nutrition.security.service.AuthenticatedSession;
import java.util.UUID;
import org.springframework.mock.web.MockHttpSession;

public final class TestAuthSession {

    private TestAuthSession() {}

    public static MockHttpSession of(UUID nutritionUserId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(
                SessionAuthFilter.AUTH_SESSION_KEY,
                new AuthenticatedSession(UUID.randomUUID(), "test@example.com", "Test", nutritionUserId)
        );
        return session;
    }
}
