package com.aiduparc.nutrition.calorieBank.service;

import com.aiduparc.nutrition.calorieBank.api.CalorieBankSnapshotResponse;
import com.aiduparc.nutrition.calorieBank.model.RelaxDayEntity;
import com.aiduparc.nutrition.calorieBank.repository.RelaxDayRepository;
import com.aiduparc.nutrition.history.model.DailyNutritionEntryEntity;
import com.aiduparc.nutrition.history.repository.DailyNutritionEntryRepository;
import com.aiduparc.nutrition.user.model.UserProfileEntity;
import com.aiduparc.nutrition.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CalorieBankService {

    static final int LOOKBACK_DAYS = 7;

    private final UserProfileRepository userProfileRepository;
    private final DailyNutritionEntryRepository dailyEntryRepository;
    private final RelaxDayRepository relaxDayRepository;

    public CalorieBankService(
        UserProfileRepository userProfileRepository,
        DailyNutritionEntryRepository dailyEntryRepository,
        RelaxDayRepository relaxDayRepository
    ) {
        this.userProfileRepository = userProfileRepository;
        this.dailyEntryRepository = dailyEntryRepository;
        this.relaxDayRepository = relaxDayRepository;
    }

    public CalorieBankSnapshotResponse getSnapshot(UUID userId, LocalDate today) {
        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        int dailyCap = profile.getDailyBankCapKcal();
        int bankMax = profile.getBankMaxKcal();
        int relaxAllowed = profile.getRelaxDaysPerMonth();
        int profileTarget = profile.getDailyCalorieTargetKcal().intValue();

        LocalDate windowStart = today.minusDays(LOOKBACK_DAYS);
        LocalDate yesterday = today.minusDays(1);

        Set<LocalDate> relaxDates = new HashSet<>(
            relaxDayRepository.findByUserIdAndRelaxDateBetween(userId, windowStart, today)
                .stream().map(RelaxDayEntity::getRelaxDate).toList()
        );

        Map<LocalDate, DailyNutritionEntryEntity> byDate = dailyEntryRepository
            .findByUserIdAndEntryDateBetweenOrderByEntryDateAsc(userId, windowStart, today)
            .stream()
            .collect(Collectors.toMap(DailyNutritionEntryEntity::getEntryDate, e -> e, (a, b) -> a));

        int bank = 0;
        for (LocalDate day = windowStart; !day.isAfter(yesterday); day = day.plusDays(1)) {
            if (relaxDates.contains(day)) continue;
            DailyNutritionEntryEntity entry = byDate.get(day);
            if (entry == null) continue;
            int consumed = entry.getCaloriesConsumedKcal().intValue();
            if (consumed <= 0) continue;
            int target = entry.getCalorieTargetKcal() != null
                ? entry.getCalorieTargetKcal().intValue()
                : profileTarget;
            int delta = target - consumed;
            if (delta > dailyCap) delta = dailyCap;
            bank = Math.max(0, Math.min(bankMax, bank + delta));
        }

        DailyNutritionEntryEntity todayEntry = byDate.get(today);
        int todayConsumed = todayEntry != null ? todayEntry.getCaloriesConsumedKcal().intValue() : 0;
        int todayTarget = todayEntry != null && todayEntry.getCalorieTargetKcal() != null
            ? todayEntry.getCalorieTargetKcal().intValue()
            : profileTarget;
        int todayOverrun = Math.max(0, todayConsumed - todayTarget);
        boolean isRelaxToday = relaxDates.contains(today);

        int bankUsedToday = isRelaxToday ? 0 : Math.min(bank, todayOverrun);
        int bankRemaining = Math.max(0, bank - bankUsedToday);

        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        long relaxUsed = relaxDayRepository.countByUserIdAndRelaxDateBetween(userId, monthStart, monthEnd);

        return new CalorieBankSnapshotResponse(
            bank,
            bankUsedToday,
            bankRemaining,
            todayOverrun,
            isRelaxToday,
            relaxUsed,
            relaxAllowed,
            dailyCap,
            bankMax
        );
    }

    @Transactional
    public RelaxDayEntity markRelaxDay(UUID userId, LocalDate date) {
        UserProfileEntity profile = userProfileRepository.findByNutritionUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Optional<RelaxDayEntity> existing = relaxDayRepository.findByUserIdAndRelaxDate(userId, date);
        if (existing.isPresent()) return existing.get();

        LocalDate monthStart = date.withDayOfMonth(1);
        LocalDate monthEnd = date.withDayOfMonth(date.lengthOfMonth());
        long usedInMonth = relaxDayRepository.countByUserIdAndRelaxDateBetween(userId, monthStart, monthEnd);
        if (usedInMonth >= profile.getRelaxDaysPerMonth()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Relax days limit reached for the month"
            );
        }

        RelaxDayEntity entity = new RelaxDayEntity();
        entity.setUserId(userId);
        entity.setRelaxDate(date);
        return relaxDayRepository.save(entity);
    }

    @Transactional
    public void unmarkRelaxDay(UUID userId, LocalDate date) {
        relaxDayRepository.deleteByUserIdAndRelaxDate(userId, date);
    }

    public int getTodayDeposit(UUID userId, LocalDate today) {
        Optional<UserProfileEntity> profileOpt = userProfileRepository.findByNutritionUserId(userId);
        if (profileOpt.isEmpty()) return 0;
        UserProfileEntity profile = profileOpt.get();

        if (relaxDayRepository.findByUserIdAndRelaxDate(userId, today).isPresent()) return 0;

        var entryOpt = dailyEntryRepository.findByUserIdAndEntryDate(userId, today);
        if (entryOpt.isEmpty()) return 0;
        var entry = entryOpt.get();
        int consumed = entry.getCaloriesConsumedKcal().intValue();
        if (consumed <= 0) return 0;

        int target = entry.getCalorieTargetKcal() != null
            ? entry.getCalorieTargetKcal().intValue()
            : profile.getDailyCalorieTargetKcal().intValue();
        int delta = target - consumed;
        return Math.max(0, Math.min(profile.getDailyBankCapKcal(), delta));
    }

    public List<LocalDate> getRelaxDaysForMonth(UUID userId, LocalDate anyDateInMonth) {
        LocalDate monthStart = anyDateInMonth.withDayOfMonth(1);
        LocalDate monthEnd = anyDateInMonth.withDayOfMonth(anyDateInMonth.lengthOfMonth());
        return relaxDayRepository.findByUserIdAndRelaxDateBetween(userId, monthStart, monthEnd)
            .stream().map(RelaxDayEntity::getRelaxDate).sorted().toList();
    }

    static int simulateBank(List<DailyDelta> chronological, int dailyCap, int bankMax) {
        int bank = 0;
        for (DailyDelta d : chronological) {
            if (d.isRelax() || !d.logged()) continue;
            int delta = Math.min(dailyCap, d.target() - d.consumed());
            bank = Math.max(0, Math.min(bankMax, bank + delta));
        }
        return bank;
    }

    public record DailyDelta(int target, int consumed, boolean isRelax, boolean logged) {
        public static DailyDelta logged(int target, int consumed, boolean isRelax) {
            return new DailyDelta(target, consumed, isRelax, true);
        }
        public static DailyDelta notLogged() {
            return new DailyDelta(0, 0, false, false);
        }
    }
}
