package com.aiduparc.nutrition.notifications.push;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Rotation of push-notification copy so reminders don't feel robotic after
 * two weeks of the same wording. Each list is for one trigger type; the
 * scheduler picks a random entry per delivery.
 *
 * <p>Tone is the same as the in-app mascot — light, anti-shame, never
 * scolding. No exclamation overload.
 */
final class PushMessageVariants {

    private PushMessageVariants() {}

    record Message(String title, String body) {}

    private static final List<Message> DAILY_LOG = List.of(
        new Message("Don't forget to log today 🍽",
            "A quick photo or description takes 10 seconds."),
        new Message("Today's log is empty 📝",
            "Even one item helps the bank stay full."),
        new Message("Snap your dinner? 📸",
            "Coach will read it for you — 10 seconds."),
        new Message("Quick log before bed 🌙",
            "What you had today, even ballpark, beats nothing."),
        new Message("Tap a meal in 10 seconds 🍳",
            "Photo, voice, or barcode — whatever's fastest."),
        new Message("Still here, still rooting for you 💛",
            "One tiny log keeps tomorrow's streak alive.")
    );

    private static final List<Message> BANK_WIN = List.of(
        new Message("🏦 Bank up",
            "Stayed under target today — saving up for the weekend."),
        new Message("🏦 Nice — adding to the bank",
            "You banked calories today. Future-you says thanks."),
        new Message("🏦 Quiet win",
            "Under target without trying too hard. That's the goal."),
        new Message("🏦 Deposit made",
            "Today's calorie surplus is in the bank for a treat day.")
    );

    private static final List<Message> STREAK_MILESTONE = List.of(
        new Message("On a roll 🔥",
            "You've logged every day for %d days. Keep going."),
        new Message("%d-day streak going",
            "Showing up daily is the whole game. Nice."),
        new Message("Day %d 🏆",
            "%d consecutive days logged. Quiet consistency wins."),
        new Message("%d days. Hot.",
            "Streak is alive. Tomorrow's log keeps it that way.")
    );

    private static final List<Message> STREAK_SAVE = List.of(
        new Message("🔥 Streak at risk",
            "Your %d-day streak ends at midnight without a log. 10 seconds saves it."),
        new Message("⚡ %d days on the line",
            "Quick log before midnight keeps the streak alive."),
        new Message("⏰ Last call",
            "%d-day streak needs one tap to survive the night."),
        new Message("🚨 Streak save?",
            "%d days in the bag. Don't let tonight be the one that breaks it.")
    );

    static Message dailyLog()        { return pick(DAILY_LOG); }
    static Message bankWin()         { return pick(BANK_WIN); }
    static Message streakMilestone(int days) {
        Message m = pick(STREAK_MILESTONE);
        return new Message(m.title.replace("%d", String.valueOf(days)),
                m.body.replace("%d", String.valueOf(days)));
    }
    static Message streakSave(int days) {
        Message m = pick(STREAK_SAVE);
        return new Message(m.title.replace("%d", String.valueOf(days)),
                m.body.replace("%d", String.valueOf(days)));
    }

    private static Message pick(List<Message> list) {
        return list.get(ThreadLocalRandom.current().nextInt(list.size()));
    }
}
