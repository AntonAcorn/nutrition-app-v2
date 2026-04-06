package com.aiduparc.nutrition.photoanalysis.draft.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "photo_analysis_drafts")
public class PhotoAnalysisDraftEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PhotoAnalysisDraftStatus status;

    @Column(name = "analysis_json", nullable = false)
    private String analysisJson;

    @Column(name = "estimated_calories_kcal", precision = 10, scale = 2)
    private BigDecimal estimatedCaloriesKcal;

    @Column(name = "estimated_protein_g", precision = 10, scale = 2)
    private BigDecimal estimatedProteinG;

    @Column(name = "estimated_fiber_g", precision = 10, scale = 2)
    private BigDecimal estimatedFiberG;

    @Column(name = "confirmed_daily_entry_id")
    private UUID confirmedDailyEntryId;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getEntryDate() {
        return entryDate;
    }

    public void setEntryDate(LocalDate entryDate) {
        this.entryDate = entryDate;
    }

    public PhotoAnalysisDraftStatus getStatus() {
        return status;
    }

    public void setStatus(PhotoAnalysisDraftStatus status) {
        this.status = status;
    }

    public String getAnalysisJson() {
        return analysisJson;
    }

    public void setAnalysisJson(String analysisJson) {
        this.analysisJson = analysisJson;
    }

    public BigDecimal getEstimatedCaloriesKcal() {
        return estimatedCaloriesKcal;
    }

    public void setEstimatedCaloriesKcal(BigDecimal estimatedCaloriesKcal) {
        this.estimatedCaloriesKcal = estimatedCaloriesKcal;
    }

    public BigDecimal getEstimatedProteinG() {
        return estimatedProteinG;
    }

    public void setEstimatedProteinG(BigDecimal estimatedProteinG) {
        this.estimatedProteinG = estimatedProteinG;
    }

    public BigDecimal getEstimatedFiberG() {
        return estimatedFiberG;
    }

    public void setEstimatedFiberG(BigDecimal estimatedFiberG) {
        this.estimatedFiberG = estimatedFiberG;
    }

    public UUID getConfirmedDailyEntryId() {
        return confirmedDailyEntryId;
    }

    public void setConfirmedDailyEntryId(UUID confirmedDailyEntryId) {
        this.confirmedDailyEntryId = confirmedDailyEntryId;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    void onCreate() {
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = PhotoAnalysisDraftStatus.DRAFT;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}

