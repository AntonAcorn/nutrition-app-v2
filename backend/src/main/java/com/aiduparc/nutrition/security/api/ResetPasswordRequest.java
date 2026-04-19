package com.aiduparc.nutrition.security.api;

public record ResetPasswordRequest(String token, String newPassword) {}
