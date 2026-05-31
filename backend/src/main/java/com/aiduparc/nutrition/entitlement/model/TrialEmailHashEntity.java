package com.aiduparc.nutrition.entitlement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trial_email_hash")
public class TrialEmailHashEntity {

    @Id
    @Column(name = "email_hash", length = 64, nullable = false, updatable = false)
    private String emailHash;

    @Column(name = "first_trial_at", nullable = false, updatable = false)
    private OffsetDateTime firstTrialAt;

    public String getEmailHash() { return emailHash; }
    public void setEmailHash(String emailHash) { this.emailHash = emailHash; }

    public OffsetDateTime getFirstTrialAt() { return firstTrialAt; }
    public void setFirstTrialAt(OffsetDateTime firstTrialAt) { this.firstTrialAt = firstTrialAt; }
}
