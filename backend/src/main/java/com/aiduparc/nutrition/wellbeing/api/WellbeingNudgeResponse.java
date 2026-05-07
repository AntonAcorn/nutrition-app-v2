package com.aiduparc.nutrition.wellbeing.api;

public record WellbeingNudgeResponse(boolean hasNudge, String message) {
    public static WellbeingNudgeResponse none() {
        return new WellbeingNudgeResponse(false, null);
    }
}
