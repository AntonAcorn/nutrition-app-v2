package com.aiduparc.nutrition.security.service;

import com.aiduparc.nutrition.security.AuthProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class GoogleOAuthService {

    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final AuthProperties authProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GoogleOAuthService(AuthProperties authProperties, ObjectMapper objectMapper) {
        this.authProperties = authProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public String buildAuthorizationUrl(String state) {
        return AUTH_URL + "?"
            + "client_id=" + encode(authProperties.googleClientId())
            + "&redirect_uri=" + encode(authProperties.googleRedirectUri())
            + "&response_type=code"
            + "&scope=" + encode("openid email profile")
            + "&state=" + encode(state)
            + "&prompt=select_account";
    }

    public GoogleUserInfo exchangeCodeForUserInfo(String code) throws IOException, InterruptedException {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("code", code);
        params.put("client_id", authProperties.googleClientId());
        params.put("client_secret", authProperties.googleClientSecret());
        params.put("redirect_uri", authProperties.googleRedirectUri());
        params.put("grant_type", "authorization_code");

        String body = params.entrySet().stream()
            .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
            .collect(Collectors.joining("&"));

        HttpRequest tokenRequest = HttpRequest.newBuilder()
            .uri(URI.create(TOKEN_URL))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> tokenResponse = httpClient.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
        JsonNode tokenJson = objectMapper.readTree(tokenResponse.body());

        if (tokenJson.has("error")) {
            throw new IllegalStateException("Google token exchange failed: " + tokenJson.get("error").asText());
        }

        String accessToken = tokenJson.get("access_token").asText();

        HttpRequest userInfoRequest = HttpRequest.newBuilder()
            .uri(URI.create(USERINFO_URL))
            .header("Authorization", "Bearer " + accessToken)
            .GET()
            .build();

        HttpResponse<String> userInfoResponse = httpClient.send(userInfoRequest, HttpResponse.BodyHandlers.ofString());
        JsonNode userJson = objectMapper.readTree(userInfoResponse.body());

        String id = userJson.get("sub").asText();
        String email = userJson.get("email").asText();
        String name = userJson.has("name") ? userJson.get("name").asText() : email;

        return new GoogleUserInfo(id, email, name);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
