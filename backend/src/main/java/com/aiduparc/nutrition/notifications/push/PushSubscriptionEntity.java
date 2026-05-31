package com.aiduparc.nutrition.notifications.push;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "push_subscriptions")
public class PushSubscriptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    // Web Push fields
    @Column(columnDefinition = "TEXT")
    private String endpoint;

    @Column(columnDefinition = "TEXT")
    private String p256dh;

    @Column(columnDefinition = "TEXT")
    private String auth;

    // APNs field
    @Column(name = "device_token", columnDefinition = "TEXT")
    private String deviceToken;

    @Column(nullable = false, length = 10)
    private String platform = "web";

    @Column(nullable = false)
    private String timezone;

    @Column(name = "reminder_hour", nullable = false)
    private int reminderHour;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "notify_daily_log", nullable = false)
    private boolean notifyDailyLog = true;

    @Column(name = "notify_bank_win", nullable = false)
    private boolean notifyBankWin = true;

    @Column(name = "notify_streak", nullable = false)
    private boolean notifyStreak = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (timezone == null) timezone = "UTC";
        if (reminderHour == 0) reminderHour = 20;
        if (platform == null) platform = "web";
        enabled = true;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public String getDeviceToken() { return deviceToken; }
    public void setDeviceToken(String deviceToken) { this.deviceToken = deviceToken; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public int getReminderHour() { return reminderHour; }
    public void setReminderHour(int reminderHour) { this.reminderHour = reminderHour; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public boolean isNotifyDailyLog() { return notifyDailyLog; }
    public void setNotifyDailyLog(boolean v) { this.notifyDailyLog = v; }
    public boolean isNotifyBankWin() { return notifyBankWin; }
    public void setNotifyBankWin(boolean v) { this.notifyBankWin = v; }
    public boolean isNotifyStreak() { return notifyStreak; }
    public void setNotifyStreak(boolean v) { this.notifyStreak = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
