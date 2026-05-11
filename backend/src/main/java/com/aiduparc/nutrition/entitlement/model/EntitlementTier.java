package com.aiduparc.nutrition.entitlement.model;

public enum EntitlementTier {
    FREE,
    TRIAL,
    PRO,
    FOUNDER;

    public boolean hasAiAccess() {
        return this == TRIAL || this == PRO || this == FOUNDER;
    }

    public boolean hasCoachInsights() {
        return this == TRIAL || this == PRO || this == FOUNDER;
    }

    public boolean hasUnlimitedRelaxDays() {
        return this == PRO || this == FOUNDER;
    }
}
