package com.aiduparc.nutrition.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_ref")
    private String externalRef;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "is_default", nullable = false)
    private boolean defaultUser;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public String getExternalRef() { return externalRef; }
    public void setExternalRef(String externalRef) { this.externalRef = externalRef; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public boolean isDefaultUser() { return defaultUser; }
    public void setDefaultUser(boolean defaultUser) { this.defaultUser = defaultUser; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
