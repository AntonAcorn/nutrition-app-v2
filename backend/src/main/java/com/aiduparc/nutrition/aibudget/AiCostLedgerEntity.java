package com.aiduparc.nutrition.aibudget;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_cost_ledger")
public class AiCostLedgerEntity {

    @Id
    @Column(name = "day")
    private LocalDate day;

    @Column(name = "cents_spent", nullable = false)
    private long centsSpent;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public LocalDate getDay() { return day; }
    public void setDay(LocalDate day) { this.day = day; }
    public long getCentsSpent() { return centsSpent; }
    public void setCentsSpent(long centsSpent) { this.centsSpent = centsSpent; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
