package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.calorieBank.api.CalorieBankSnapshotResponse;
import com.aiduparc.nutrition.calorieBank.repository.RelaxDayRepository;
import com.aiduparc.nutrition.calorieBank.service.CalorieBankService;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.BankStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.DayOfWeekStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.MacroAvg;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.MacroTargets;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.MealTiming;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Profile;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.RelaxDayStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.SlotStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.SlotWellbeing;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.TopMeal;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Totals;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.WeightTrend;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.WellbeingStat;
import com.aiduparc.nutrition.coach.api.CoachSnapshotResponse.Window;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import com.aiduparc.nutrition.history.model.MealSlotEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.history.repository.MealLogEntryRepository;
import com.aiduparc.nutrition.history.repository.MealSlotRepository;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingEntryRepository;
import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CoachSnapshotService {

    private static final int TOP_MEALS_LIMIT = 15;
    private static final double IN_ZONE_OVER_TOLERANCE = 1.02;
    private static final double IN_ZONE_UNDER_TOLERANCE = 0.95;
    private static final int LATE_HOUR_THRESHOLD = 21;
    private static final int EARLY_HOUR_THRESHOLD = 6;

    private final UserProfileRepository userProfileRepository;
    private final DailyNutritionEntryRepository dailyEntryRepository;
    private final MealLogEntryRepository mealLogEntryRepository;
    private final MealSlotRepository mealSlotRepository;
    private final WellbeingEntryRepository wellbeingEntryRepository;
    private final RelaxDayRepository relaxDayRepository;
    private final CalorieBankService calorieBankService;

    public CoachSnapshotService(
        UserProfileRepository userProfileRepository,
        DailyNutritionEntryRepository dailyEntryRepository,
        MealLogEntryRepository mealLogEntryRepository,
        MealSlotRepository mealSlotRepository,
        WellbeingEntryRepository wellbeingEntryRepository,
        RelaxDayRepository relaxDayRepository,
        CalorieBankService calorieBankService
    ) {
        this.userProfileRepository = userProfileRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.mealLogEntryRepository = mealLogEntryRepository;
        this.mealSlotRepository = mealSlotRepository;
        this.wellbeingEntryRepository = wellbeingEntryRepository;
        this.relaxDayRepository = relaxDayRepository;
        this.calorieBankService = calorieBankService;
    }

    public CoachSnapshotResponse buildSnapshot(UUID userId, LocalDate today, int days) {
        return buildSnapshot(userId, today, days, ZoneOffset.UTC);
    }

    public CoachSnapshotResponse buildSnapshot(UUID userId, LocalDate today, int days, ZoneId zone) {
        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        LocalDate from = today.minusDays(days - 1L);
        LocalDate to = today;

        List<DailyNutritionEntryEntity> dailyEntries = dailyEntryRepository
            .findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, from, to);
        Map<LocalDate, DailyNutritionEntryEntity> dailyByDate = dailyEntries.stream()
            .collect(Collectors.toMap(DailyNutritionEntryEntity::getEntryDate, e -> e, (a, b) -> a));

        List<MealLogEntryEntity> meals = mealLogEntryRepository
            .findByUserIdAndEntryDateBetweenOrderByCreatedAtAsc(userId, from, to);

        return new CoachSnapshotResponse(
            buildProfile(profile),
            new Window(days, from, to),
            buildTotals(dailyByDate, profile, from, to),
            buildByDayOfWeek(dailyEntries),
            buildBySlot(userId, meals, from, to),
            buildMealTiming(meals, zone),
            buildWeightTrend(dailyEntries, profile),
            buildBank(userId, today),
            buildRelaxDays(userId, today, from, to, profile.getRelaxDaysPerMonth()),
            buildWellbeing(userId, from, to),
            buildTopMeals(meals)
        );
    }

    public static ZoneId resolveZone(String tz) {
        if (tz == null || tz.isBlank()) return ZoneOffset.UTC;
        try {
            return ZoneId.of(tz);
        } catch (DateTimeException ignored) {
            return ZoneOffset.UTC;
        }
    }

    private Profile buildProfile(UserProfileEntity p) {
        return new Profile(
            p.getGoal(),
            p.getWeightLossStrategy(),
            p.getActivityLevel(),
            p.getAgeYears(),
            p.getGender(),
            toIntOrNull(p.getDailyCalorieTargetKcal()),
            new MacroTargets(
                toIntOrNull(p.getProteinTargetG()),
                toIntOrNull(p.getFatTargetG()),
                toIntOrNull(p.getCarbsTargetG()),
                toIntOrNull(p.getFiberTargetG())
            ),
            toDoubleOrNull(p.getStartingWeightKg()),
            toDoubleOrNull(p.getTargetWeightKg())
        );
    }

    private Totals buildTotals(
        Map<LocalDate, DailyNutritionEntryEntity> byDate,
        UserProfileEntity profile,
        LocalDate from,
        LocalDate to
    ) {
        int loggedDays = 0;
        long sumKcal = 0, sumProtein = 0, sumFat = 0, sumCarbs = 0, sumFiber = 0;
        int daysOver = 0, daysUnder = 0, daysInZone = 0;
        Integer maxOverrun = null, maxUnderrun = null;
        int profileTarget = profile.getDailyCalorieTargetKcal().intValue();

        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            DailyNutritionEntryEntity e = byDate.get(d);
            if (e == null) continue;
            int consumed = e.getCaloriesConsumedKcal().intValue();
            if (consumed <= 0) continue;
            loggedDays++;
            sumKcal += consumed;
            sumProtein += valueOrZero(e.getProteinGrams());
            sumFat += valueOrZero(e.getFatGrams());
            sumCarbs += valueOrZero(e.getCarbsGrams());
            sumFiber += valueOrZero(e.getFiberGrams());

            int target = e.getCalorieTargetKcal() != null ? e.getCalorieTargetKcal().intValue() : profileTarget;
            if (target > 0) {
                if (consumed > target * IN_ZONE_OVER_TOLERANCE) {
                    daysOver++;
                    int overrun = consumed - target;
                    maxOverrun = maxOverrun == null ? overrun : Math.max(maxOverrun, overrun);
                } else if (consumed < target * IN_ZONE_UNDER_TOLERANCE) {
                    daysUnder++;
                    int underrun = target - consumed;
                    maxUnderrun = maxUnderrun == null ? underrun : Math.max(maxUnderrun, underrun);
                } else {
                    daysInZone++;
                }
            }
        }

        Integer avgKcal = loggedDays > 0 ? (int) Math.round((double) sumKcal / loggedDays) : null;
        MacroAvg avgMacros = loggedDays > 0
            ? new MacroAvg(
                (int) Math.round((double) sumProtein / loggedDays),
                (int) Math.round((double) sumFat / loggedDays),
                (int) Math.round((double) sumCarbs / loggedDays),
                (int) Math.round((double) sumFiber / loggedDays))
            : new MacroAvg(null, null, null, null);

        int loggingStreak = computeTrailingStreak(byDate, to, e -> e.getCaloriesConsumedKcal().intValue() > 0);
        int noOverrunStreak = computeTrailingStreak(byDate, to, e -> {
            int consumed = e.getCaloriesConsumedKcal().intValue();
            int target = e.getCalorieTargetKcal() != null ? e.getCalorieTargetKcal().intValue() : profileTarget;
            return consumed > 0 && consumed <= target * IN_ZONE_OVER_TOLERANCE;
        });

        return new Totals(
            loggedDays, avgKcal, avgMacros,
            daysOver, daysUnder, daysInZone,
            maxOverrun, maxUnderrun,
            loggingStreak, noOverrunStreak
        );
    }

    private int computeTrailingStreak(
        Map<LocalDate, DailyNutritionEntryEntity> byDate,
        LocalDate endInclusive,
        java.util.function.Predicate<DailyNutritionEntryEntity> condition
    ) {
        int streak = 0;
        LocalDate d = endInclusive;
        while (true) {
            DailyNutritionEntryEntity e = byDate.get(d);
            if (e == null || !condition.test(e)) break;
            streak++;
            d = d.minusDays(1);
        }
        return streak;
    }

    private Map<String, DayOfWeekStat> buildByDayOfWeek(List<DailyNutritionEntryEntity> entries) {
        Map<DayOfWeek, long[]> sums = new HashMap<>();
        for (DailyNutritionEntryEntity e : entries) {
            int consumed = e.getCaloriesConsumedKcal().intValue();
            if (consumed <= 0) continue;
            DayOfWeek dow = e.getEntryDate().getDayOfWeek();
            long[] s = sums.computeIfAbsent(dow, k -> new long[2]);
            s[0] += consumed;
            s[1] += 1;
        }
        Map<String, DayOfWeekStat> out = new LinkedHashMap<>();
        for (DayOfWeek dow : DayOfWeek.values()) {
            long[] s = sums.get(dow);
            if (s == null) continue;
            out.put(dow.name().toLowerCase(Locale.ROOT),
                new DayOfWeekStat((int) Math.round((double) s[0] / s[1]), (int) s[1]));
        }
        return out;
    }

    private Map<String, SlotStat> buildBySlot(
        UUID userId, List<MealLogEntryEntity> meals, LocalDate from, LocalDate to
    ) {
        // Load all slots in window in one go
        Map<UUID, String> slotIdToType = new HashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            List<MealSlotEntity> slots = mealSlotRepository.findByUserIdAndEntryDateOrderBySortOrderAsc(userId, d);
            for (MealSlotEntity s : slots) {
                slotIdToType.put(s.getId(), s.getSlotType());
            }
        }

        Map<String, long[]> sums = new HashMap<>();
        for (MealLogEntryEntity m : meals) {
            String slot = m.getMealSlotId() != null ? slotIdToType.get(m.getMealSlotId()) : null;
            if (slot == null) continue;
            long[] s = sums.computeIfAbsent(slot, k -> new long[2]);
            s[0] += m.getCaloriesKcal().intValue();
            s[1] += 1;
        }

        Map<String, SlotStat> out = new LinkedHashMap<>();
        for (String key : List.of("BREAKFAST", "LUNCH", "DINNER", "SNACK")) {
            long[] s = sums.get(key);
            if (s == null) continue;
            out.put(key.toLowerCase(Locale.ROOT),
                new SlotStat((int) Math.round((double) s[0] / s[1]), (int) s[1]));
        }
        return out;
    }

    private MealTiming buildMealTiming(List<MealLogEntryEntity> meals, ZoneId zone) {
        Integer earliest = null, latest = null;
        int late = 0, early = 0;
        for (MealLogEntryEntity m : meals) {
            int hour = m.getCreatedAt().atZoneSameInstant(zone).getHour();
            earliest = earliest == null ? hour : Math.min(earliest, hour);
            latest = latest == null ? hour : Math.max(latest, hour);
            if (hour >= LATE_HOUR_THRESHOLD) late++;
            if (hour < EARLY_HOUR_THRESHOLD) early++;
        }
        return new MealTiming(earliest, latest, late, early);
    }

    private WeightTrend buildWeightTrend(
        List<DailyNutritionEntryEntity> entries, UserProfileEntity profile
    ) {
        Double startKg = null, endKg = null;
        for (DailyNutritionEntryEntity e : entries) {
            if (e.getWeightKg() == null) continue;
            double w = e.getWeightKg().doubleValue();
            if (startKg == null) startKg = w;
            endKg = w;
        }
        Double delta = (startKg != null && endKg != null) ? round1(endKg - startKg) : null;
        Double vsTarget = (endKg != null && profile.getTargetWeightKg() != null)
            ? round1(endKg - profile.getTargetWeightKg().doubleValue())
            : null;
        return new WeightTrend(round1(startKg), round1(endKg), delta, vsTarget);
    }

    private BankStat buildBank(UUID userId, LocalDate today) {
        try {
            CalorieBankSnapshotResponse bank = calorieBankService.getSnapshot(userId, today);
            return new BankStat(bank.bank(), bank.bankUsedToday(), 0);
        } catch (RuntimeException ex) {
            return new BankStat(0, 0, 0);
        }
    }

    private RelaxDayStat buildRelaxDays(
        UUID userId, LocalDate today, LocalDate from, LocalDate to, int allowedPerMonth
    ) {
        long usedInWindow = relaxDayRepository.countByUserIdAndRelaxDateBetween(userId, from, to);
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        long usedInMonth = relaxDayRepository.countByUserIdAndRelaxDateBetween(userId, monthStart, monthEnd);
        return new RelaxDayStat((int) usedInWindow, (int) usedInMonth, allowedPerMonth);
    }

    private WellbeingStat buildWellbeing(UUID userId, LocalDate from, LocalDate to) {
        List<WellbeingEntryEntity> entries = wellbeingEntryRepository
            .findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, from, to);
        if (entries.isEmpty()) {
            return new WellbeingStat(0, null, Map.of(), Map.of());
        }
        double sum = 0;
        Map<DayOfWeek, long[]> dowSums = new HashMap<>();
        Map<String, long[]> slotSums = new HashMap<>();
        for (WellbeingEntryEntity e : entries) {
            sum += e.getRating();
            DayOfWeek dow = e.getEntryDate().getDayOfWeek();
            long[] s = dowSums.computeIfAbsent(dow, k -> new long[2]);
            s[0] += e.getRating();
            s[1] += 1;
            if (e.getMealSlot() != null) {
                long[] ss = slotSums.computeIfAbsent(e.getMealSlot(), k -> new long[2]);
                ss[0] += e.getRating();
                ss[1] += 1;
            }
        }
        Map<String, Double> avgByDow = new LinkedHashMap<>();
        for (DayOfWeek dow : DayOfWeek.values()) {
            long[] s = dowSums.get(dow);
            if (s == null) continue;
            avgByDow.put(dow.name().toLowerCase(Locale.ROOT), round1((double) s[0] / s[1]));
        }
        Map<String, SlotWellbeing> bySlot = new LinkedHashMap<>();
        for (String slot : List.of("BREAKFAST", "LUNCH", "DINNER", "SNACK")) {
            long[] ss = slotSums.get(slot);
            if (ss == null) continue;
            bySlot.put(slot.toLowerCase(Locale.ROOT),
                new SlotWellbeing(round1((double) ss[0] / ss[1]), (int) ss[1]));
        }
        double avg = sum / entries.size();
        return new WellbeingStat(entries.size(), round1(avg), avgByDow, bySlot);
    }

    private List<TopMeal> buildTopMeals(List<MealLogEntryEntity> meals) {
        Map<String, long[]> stats = new HashMap<>();
        Map<String, String> displayNames = new HashMap<>();
        for (MealLogEntryEntity m : meals) {
            if (m.getName() == null || m.getName().isBlank()) continue;
            String key = m.getName().trim().toLowerCase(Locale.ROOT);
            long[] s = stats.computeIfAbsent(key, k -> new long[2]);
            s[0] += m.getCaloriesKcal().intValue();
            s[1] += 1;
            displayNames.putIfAbsent(key, m.getName().trim());
        }

        List<TopMeal> out = new ArrayList<>();
        stats.entrySet().stream()
            .sorted((a, b) -> Long.compare(b.getValue()[1], a.getValue()[1]))
            .limit(TOP_MEALS_LIMIT)
            .forEach(e -> {
                long[] s = e.getValue();
                int avg = (int) Math.round((double) s[0] / s[1]);
                out.add(new TopMeal(displayNames.get(e.getKey()), (int) s[1], avg));
            });
        return out;
    }

    private Integer toIntOrNull(BigDecimal v) {
        return v == null ? null : v.intValue();
    }

    private Double toDoubleOrNull(BigDecimal v) {
        return v == null ? null : round1(v.doubleValue());
    }

    private Double round1(Double v) {
        return v == null ? null : Math.round(v * 10.0) / 10.0;
    }

    private long valueOrZero(BigDecimal v) {
        return v == null ? 0L : v.longValue();
    }

    @SuppressWarnings("unused")
    private Optional<Integer> avgInt(long sum, long count) {
        return count > 0 ? Optional.of((int) Math.round((double) sum / count)) : Optional.empty();
    }
}
