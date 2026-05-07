package com.aiduparc.nutrition.wellbeing.service;

import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import com.aiduparc.nutrition.notifications.push.PushNotificationService;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionEntity;
import com.aiduparc.nutrition.notifications.push.PushSubscriptionRepository;
import com.aiduparc.nutrition.wellbeing.api.FoodRatingItem;
import com.aiduparc.nutrition.wellbeing.api.WellbeingFoodHintResponse;
import com.aiduparc.nutrition.wellbeing.api.WellbeingInsightsResponse;
import com.aiduparc.nutrition.wellbeing.api.WellbeingNudgeResponse;
import com.aiduparc.nutrition.wellbeing.api.WellbeingPendingResponse;
import com.aiduparc.nutrition.wellbeing.api.WellbeingRetrospectiveRequest;
import com.aiduparc.nutrition.wellbeing.api.WellbeingTrendDay;
import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import com.aiduparc.nutrition.wellbeing.model.WellbeingPushQueueEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingEntryRepository;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingPushQueueRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WellbeingService {

    private static final Logger log = LoggerFactory.getLogger(WellbeingService.class);

    public static final int REQUIRED_ENTRIES = 7;
    private static final int INSIGHTS_WINDOW_DAYS = 30;
    public static final int MEAL_CORRELATION_HOURS = 3;
    private static final int PENDING_EXPIRY_HOURS = 4;
    public static final int MIN_SAMPLES_FOR_INSIGHT = 3;
    public static final double GOOD_THRESHOLD = 4.0;
    public static final double BAD_THRESHOLD = 2.5;

    private final WellbeingEntryRepository entryRepository;
    private final WellbeingPushQueueRepository queueRepository;
    private final MealLogEntryRepository mealLogEntryRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushNotificationService pushNotificationService;

    public WellbeingService(
            WellbeingEntryRepository entryRepository,
            WellbeingPushQueueRepository queueRepository,
            MealLogEntryRepository mealLogEntryRepository,
            PushSubscriptionRepository pushSubscriptionRepository,
            PushNotificationService pushNotificationService
    ) {
        this.entryRepository = entryRepository;
        this.queueRepository = queueRepository;
        this.mealLogEntryRepository = mealLogEntryRepository;
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.pushNotificationService = pushNotificationService;
    }

    // ── Scheduling ───────────────────────────────────────────────────────────

    @Transactional
    public void scheduleCheckAfterMeal(UUID userId) {
        OffsetDateTime notifyAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(2);

        queueRepository.findTopByUserIdAndSentAtIsNullOrderByScheduledAtDesc(userId)
            .ifPresentOrElse(
                existing -> {
                    existing.setScheduledAt(notifyAt);
                    queueRepository.save(existing);
                },
                () -> {
                    WellbeingPushQueueEntity item = new WellbeingPushQueueEntity();
                    item.setUserId(userId);
                    item.setScheduledAt(notifyAt);
                    queueRepository.save(item);
                    log.debug("wellbeing check scheduled userId={} at={}", userId, notifyAt);
                }
            );
    }

    // ── Pending prompt ───────────────────────────────────────────────────────

    public WellbeingPendingResponse getPending(UUID userId) {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusHours(PENDING_EXPIRY_HOURS);
        return queueRepository
            .findTopByUserIdAndSentAtIsNotNullAndRespondedAtIsNullOrderBySentAtDesc(userId)
            .filter(q -> q.getSentAt().isAfter(cutoff))
            .map(q -> {
                String mealName = mealLogEntryRepository
                    .findTopByUserIdAndCreatedAtBeforeOrderByCreatedAtDesc(userId, q.getScheduledAt())
                    .map(MealLogEntryEntity::getName)
                    .orElse(null);
                return new WellbeingPendingResponse(true, mealName);
            })
            .orElse(new WellbeingPendingResponse(false, null));
    }

    // ── Rating ───────────────────────────────────────────────────────────────

    @Transactional
    public void saveRating(UUID userId, int rating) {
        WellbeingEntryEntity entry = new WellbeingEntryEntity();
        entry.setUserId(userId);
        entry.setRating(rating);
        entry.setEntryDate(LocalDate.now(ZoneOffset.UTC));
        entryRepository.save(entry);

        queueRepository
            .findTopByUserIdAndSentAtIsNotNullAndRespondedAtIsNullOrderBySentAtDesc(userId)
            .ifPresent(q -> {
                q.setRespondedAt(OffsetDateTime.now(ZoneOffset.UTC));
                queueRepository.save(q);
            });

        log.info("wellbeing rating saved userId={} rating={}", userId, rating);

        // Push when insights unlock for the first time
        long count = entryRepository.countByUserId(userId);
        if (count == REQUIRED_ENTRIES) {
            sendInsightsUnlockPush(userId);
        }
    }

    private void sendInsightsUnlockPush(UUID userId) {
        List<PushSubscriptionEntity> subs = pushSubscriptionRepository.findByUserId(userId)
            .stream().filter(PushSubscriptionEntity::isEnabled).toList();
        for (PushSubscriptionEntity sub : subs) {
            pushNotificationService.send(sub,
                "Your energy profile is ready ⚡",
                "We found your first patterns. Open Stats to see which foods work for you.");
        }
        log.info("wellbeing insights-unlock push sent userId={}", userId);
    }

    // ── Insights ─────────────────────────────────────────────────────────────

    public WellbeingInsightsResponse getInsights(UUID userId) {
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(INSIGHTS_WINDOW_DAYS);
        List<WellbeingEntryEntity> entries =
            entryRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, since);

        if (entries.size() < REQUIRED_ENTRIES) {
            return WellbeingInsightsResponse.notEnoughData(entries.size());
        }

        List<MealLogEntryEntity> meals =
            mealLogEntryRepository.findByUserIdAndCreatedAtAfter(userId, since.minusHours(MEAL_CORRELATION_HOURS));

        Map<String, List<Integer>> ratingsByFood = correlate(entries, meals);
        Map<String, String> displayNames = buildDisplayNames(meals);

        List<FoodRatingItem> energizers = ratingsByFood.entrySet().stream()
            .filter(e -> e.getValue().size() >= MIN_SAMPLES_FOR_INSIGHT)
            .map(e -> new FoodRatingItem(displayNames.getOrDefault(e.getKey(), e.getKey()), average(e.getValue()), e.getValue().size()))
            .sorted(Comparator.comparingDouble(FoodRatingItem::avgRating).reversed())
            .limit(3)
            .toList();

        List<FoodRatingItem> drainers = ratingsByFood.entrySet().stream()
            .filter(e -> e.getValue().size() >= MIN_SAMPLES_FOR_INSIGHT)
            .map(e -> new FoodRatingItem(displayNames.getOrDefault(e.getKey(), e.getKey()), average(e.getValue()), e.getValue().size()))
            .sorted(Comparator.comparingDouble(FoodRatingItem::avgRating))
            .limit(3)
            .toList();

        return WellbeingInsightsResponse.withData(entries.size(), energizers, drainers);
    }

    // ── Retrospective onboarding ──────────────────────────────────────────────

    @Transactional
    public void saveRetrospective(UUID userId, List<WellbeingRetrospectiveRequest.Entry> entries) {
        for (WellbeingRetrospectiveRequest.Entry e : entries) {
            // Skip dates that already have an entry
            OffsetDateTime dayStart = e.date().atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime dayEnd = dayStart.plusDays(1);
            boolean alreadyExists = entryRepository
                .findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, dayStart)
                .stream().anyMatch(ex -> !ex.getCreatedAt().isAfter(dayEnd));
            if (alreadyExists) continue;

            WellbeingEntryEntity entity = new WellbeingEntryEntity();
            entity.setUserId(userId);
            entity.setRating(e.rating());
            entity.setEntryDate(e.date());
            entity.setCreatedAt(e.date().atTime(20, 0).atOffset(ZoneOffset.UTC));
            entryRepository.save(entity);
        }
        log.info("wellbeing retrospective saved userId={} count={}", userId, entries.size());
    }

    // ── Food hint (used at logging time) ─────────────────────────────────────

    public WellbeingFoodHintResponse getFoodHint(UUID userId, String name) {
        if (name == null || name.isBlank()) return WellbeingFoodHintResponse.none();

        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(INSIGHTS_WINDOW_DAYS);
        List<MealLogEntryEntity> meals =
            mealLogEntryRepository.findByUserIdAndCreatedAtAfter(userId, since.minusHours(MEAL_CORRELATION_HOURS));

        String searchKey = normalizeName(name.trim());
        boolean loggedBefore = meals.stream().anyMatch(m -> normalizeName(m.getName()).contains(searchKey));

        List<WellbeingEntryEntity> entries =
            entryRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, since);

        if (entries.isEmpty()) {
            return loggedBefore ? WellbeingFoodHintResponse.none() : WellbeingFoodHintResponse.newFood();
        }

        List<Integer> ratings = new ArrayList<>();
        for (WellbeingEntryEntity entry : entries) {
            OffsetDateTime windowStart = entry.getCreatedAt().minusHours(MEAL_CORRELATION_HOURS);
            for (MealLogEntryEntity meal : meals) {
                if (normalizeName(meal.getName()).contains(searchKey)
                        && meal.getCreatedAt().isAfter(windowStart)
                        && !meal.getCreatedAt().isAfter(entry.getCreatedAt())) {
                    ratings.add(entry.getRating());
                }
            }
        }

        if (ratings.size() < MIN_SAMPLES_FOR_INSIGHT) {
            return loggedBefore ? WellbeingFoodHintResponse.none() : WellbeingFoodHintResponse.newFood();
        }

        double avg = Math.round(average(ratings) * 10.0) / 10.0;
        String tone = avg >= GOOD_THRESHOLD ? "good" : avg <= BAD_THRESHOLD ? "bad" : "neutral";

        if ("neutral".equals(tone)) return WellbeingFoodHintResponse.none();

        return new WellbeingFoodHintResponse(true, avg, ratings.size(), tone, false);
    }

    // ── Weekly report data (used by scheduler) ───────────────────────────────

    public record WeeklyReport(boolean hasData, String topFood, double topFoodRating, double avgRating) {
        public static WeeklyReport empty() { return new WeeklyReport(false, null, 0, 0); }
    }

    public WeeklyReport computeWeeklyReport(UUID userId) {
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
        List<WellbeingEntryEntity> entries =
            entryRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, since);

        if (entries.size() < 2) return WeeklyReport.empty();

        double weekAvg = Math.round(average(entries.stream().map(WellbeingEntryEntity::getRating).toList()) * 10.0) / 10.0;

        List<MealLogEntryEntity> meals =
            mealLogEntryRepository.findByUserIdAndCreatedAtAfter(userId, since.minusHours(MEAL_CORRELATION_HOURS));

        Map<String, List<Integer>> ratingsByFood = correlate(entries, meals);
        Map<String, String> displayNames = buildDisplayNames(meals);

        FoodRatingItem topFood = ratingsByFood.entrySet().stream()
            .filter(e -> e.getValue().size() >= MIN_SAMPLES_FOR_INSIGHT)
            .map(e -> new FoodRatingItem(displayNames.getOrDefault(e.getKey(), e.getKey()), average(e.getValue()), e.getValue().size()))
            .max(Comparator.comparingDouble(FoodRatingItem::avgRating))
            .orElse(null);

        if (topFood == null) return new WeeklyReport(true, null, 0, weekAvg);
        return new WeeklyReport(true, topFood.name(), topFood.avgRating(), weekAvg);
    }

    // ── Trend ────────────────────────────────────────────────────────────────

    public List<WellbeingTrendDay> getTrend(UUID userId, int days) {
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(days);
        List<WellbeingEntryEntity> entries =
            entryRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, since);

        Map<LocalDate, List<Integer>> byDay = new LinkedHashMap<>();
        for (WellbeingEntryEntity e : entries) {
            byDay.computeIfAbsent(e.getCreatedAt().toLocalDate(), k -> new ArrayList<>()).add(e.getRating());
        }

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<WellbeingTrendDay> result = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            List<Integer> ratings = byDay.get(day);
            if (ratings != null) {
                double avg = Math.round(average(ratings) * 10.0) / 10.0;
                result.add(new WellbeingTrendDay(day, avg, ratings.size()));
            }
        }
        return result;
    }

    // ── Nudge ─────────────────────────────────────────────────────────────────

    public WellbeingNudgeResponse getNudge(UUID userId) {
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(30);
        List<WellbeingEntryEntity> entries =
            entryRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, since);

        if (entries.size() < REQUIRED_ENTRIES) return WellbeingNudgeResponse.none();

        OffsetDateTime weekAgo = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
        OffsetDateTime twoWeeksAgo = weekAgo.minusDays(7);

        List<Integer> thisWeek = entries.stream()
            .filter(e -> e.getCreatedAt().isAfter(weekAgo))
            .map(WellbeingEntryEntity::getRating).toList();
        List<Integer> lastWeek = entries.stream()
            .filter(e -> e.getCreatedAt().isAfter(twoWeeksAgo) && !e.getCreatedAt().isAfter(weekAgo))
            .map(WellbeingEntryEntity::getRating).toList();

        if (thisWeek.size() >= 3 && lastWeek.size() >= 3) {
            double thisAvg = average(thisWeek);
            double lastAvg = average(lastWeek);
            double diff = thisAvg - lastAvg;
            if (diff >= 0.4) {
                return new WellbeingNudgeResponse(true,
                    String.format("Your energy is trending up this week (%.1f → %.1f/5) 📈", lastAvg, thisAvg));
            }
            if (diff <= -0.4) {
                return new WellbeingNudgeResponse(true,
                    String.format("Energy dipped vs last week (%.1f → %.1f/5). Notice any patterns?", lastAvg, thisAvg));
            }
        }

        List<MealLogEntryEntity> meals =
            mealLogEntryRepository.findByUserIdAndCreatedAtAfter(userId, since.minusHours(MEAL_CORRELATION_HOURS));
        Map<String, List<Integer>> ratingsByFood = correlate(entries, meals);
        Map<String, String> displayNames = buildDisplayNames(meals);

        return ratingsByFood.entrySet().stream()
            .filter(e -> e.getValue().size() >= MIN_SAMPLES_FOR_INSIGHT)
            .map(e -> new FoodRatingItem(
                displayNames.getOrDefault(e.getKey(), e.getKey()),
                average(e.getValue()),
                e.getValue().size()))
            .filter(f -> f.avgRating() >= 4.0)
            .max(Comparator.comparingDouble(FoodRatingItem::avgRating))
            .map(f -> new WellbeingNudgeResponse(true,
                String.format("⚡ %s gives you top energy (%.1f/5)", f.name(), f.avgRating())))
            .orElseGet(WellbeingNudgeResponse::none);
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private static final Set<String> NAME_NOISE = Set.of(
        "grilled", "baked", "fried", "steamed", "roasted", "boiled", "sauteed", "sautéed",
        "smoked", "raw", "fresh", "sliced", "diced", "chopped", "cooked", "stewed",
        "braised", "poached", "broiled", "crispy", "creamy", "spicy", "homemade",
        "with", "and", "in", "on", "a", "the", "some", "of", "mixed", "style"
    );

    public static String normalizeName(String name) {
        String[] words = name.trim().toLowerCase().split("\\s+");
        String normalized = Arrays.stream(words)
            .filter(w -> !NAME_NOISE.contains(w) && w.length() > 1)
            .collect(Collectors.joining(" "));
        return normalized.isEmpty() ? name.trim().toLowerCase() : normalized;
    }

    private Map<String, List<Integer>> correlate(List<WellbeingEntryEntity> entries, List<MealLogEntryEntity> meals) {
        Map<String, List<Integer>> result = new HashMap<>();
        for (WellbeingEntryEntity entry : entries) {
            OffsetDateTime windowStart = entry.getCreatedAt().minusHours(MEAL_CORRELATION_HOURS);
            for (MealLogEntryEntity meal : meals) {
                if (meal.getCreatedAt().isAfter(windowStart) && !meal.getCreatedAt().isAfter(entry.getCreatedAt())) {
                    String key = normalizeName(meal.getName());
                    result.computeIfAbsent(key, k -> new ArrayList<>()).add(entry.getRating());
                }
            }
        }
        return result;
    }

    private Map<String, String> buildDisplayNames(List<MealLogEntryEntity> meals) {
        Map<String, String> names = new HashMap<>();
        for (MealLogEntryEntity meal : meals) {
            names.putIfAbsent(normalizeName(meal.getName()), meal.getName().trim());
        }
        return names;
    }

    static double average(List<Integer> values) {
        return values.stream().mapToInt(i -> i).average().orElse(0);
    }
}
