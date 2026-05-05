package com.aiduparc.nutrition.security.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

@Service
public class AppleSignInService {

    private static final Logger log = LoggerFactory.getLogger(AppleSignInService.class);
    private static final String APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";

    private final JwtDecoder jwtDecoder;
    private final String bundleId;

    public AppleSignInService(
            @Value("${nutrition.apple.bundle-id:com.aiduparc.rumblyeats}") String bundleId
    ) {
        this.bundleId = bundleId;
        this.jwtDecoder = NimbusJwtDecoder.withJwkSetUri(APPLE_JWKS_URL).build();
    }

    public AppleUserInfo verifyIdentityToken(String identityToken) {
        Jwt jwt;
        try {
            jwt = jwtDecoder.decode(identityToken);
        } catch (JwtException e) {
            log.warn("Apple identity token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid Apple identity token");
        }

        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";
        if (!APPLE_ISSUER.equals(issuer)) {
            throw new IllegalArgumentException("Invalid Apple token issuer");
        }

        if (jwt.getAudience() == null || !jwt.getAudience().contains(bundleId)) {
            throw new IllegalArgumentException("Invalid Apple token audience");
        }

        String appleId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        return new AppleUserInfo(appleId, email);
    }
}
