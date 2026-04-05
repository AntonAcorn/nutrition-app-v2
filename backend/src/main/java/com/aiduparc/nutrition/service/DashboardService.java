package com.aiduparc.nutrition.service;

import com.aiduparc.nutrition.domain.DailyMetric;
import com.aiduparc.nutrition.domain.User;
import com.aiduparc.nutrition.dto.DashboardResponse;
import com.aiduparc.nutrition.repo.DailyMetricRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    private final DailyMetricRepository dailyMetricRepository;
    private final UserService userService;
    private final Clock clock;

    public DashboardService(DailyMetricRepository dailyMetricRepository, UserService userService) {
        this(dailyMetricRepository, userService, Clock.systemUTC());
    }

    DashboardService(DailyMetricRepository dailyMetricRepository, UserService userService, Clock clock) {
        this.dailyMetricRepository = dailyMetricRepository;
        this.userService = userService;
        this.clock = clock;
    }

    public DashboardResponse getDashboard(Integer days) {
        User user = userService.getDefaultUser();
        int effectiveDays = days == null || days < 7 ? 30 : Math.min(days, 365);
        List<DailyMetric> recent = dailyMetricRepository.findTop120ByUserOrderByMetricDateDesc(user)
                .stream()
                .sorted(Comparator.comparing(DailyMetric::getMetricDate))
                .toList();

        LocalDate todayDate = LocalDate.now(clock);
        LocalDate latestDate = recent.isEmpty() ? todayDate : recent.get(recent.size() - 1).getMetricDate();
        LocalDate rangeEnd = latestDate.isAfter(todayDate) ? latestDate : todayDate;
        LocalDate from = rangeEnd.minusDays(effectiveDays - 1L);
        List<DailyMetric> filtered = dailyMetricRepository.findByUserAndMetricDateBetweenOrderByMetricDateAsc(user, from, rangeEnd);

        DailyMetric todayMetric = filtered.stream()
                .filter(metric -> todayDate.equals(metric.getMetricDate()))
                .findFirst()
                .orElse(null);
        BigDecimal defaultTarget = Optional.ofNullable(todayMetric)
                .map(DailyMetric::getCaloriesTargetKcal)
                .or(() -> recent.stream()
                        .map(DailyMetric::getCaloriesTargetKcal)
                        .filter(value -> value != null)
                        .reduce((first, second) -> second))
                .orElse(BigDecimal.ZERO);

        DashboardResponse.SummaryCard today = summaryCard(todayMetric, todayDate, defaultTarget);
        DashboardResponse.SummaryCard totals = new DashboardResponse.SummaryCard(
                rangeEnd.toString(),
                sum(filtered.stream().map(DailyMetric::getCaloriesConsumedKcal).toList()),
                sum(filtered.stream().map(DailyMetric::getCaloriesTargetKcal).toList()),
                sum(filtered.stream().map(metric -> remaining(metric).max(BigDecimal.ZERO)).toList()),
                average(filtered.stream().map(DailyMetric::getWeightKg).toList()),
                sum(filtered.stream().map(DailyMetric::getProteinG).toList()),
                sum(filtered.stream().map(DailyMetric::getFiberG).toList())
        );

        return new DashboardResponse(
                today,
                new DashboardResponse.TimeRange(from.toString(), rangeEnd.toString(), effectiveDays),
                totals,
                filtered.stream().map(metric -> new DashboardResponse.MetricPoint(metric.getMetricDate().toString(), metric.getWeightKg())).toList(),
                filtered.stream().map(metric -> new DashboardResponse.MetricPoint(metric.getMetricDate().toString(), metric.getCaloriesConsumedKcal())).toList(),
                filtered.stream().map(metric -> new DashboardResponse.MetricPoint(metric.getMetricDate().toString(), metric.getProteinG())).toList(),
                filtered.stream().map(metric -> new DashboardResponse.MetricPoint(metric.getMetricDate().toString(), metric.getFiberG())).toList()
        );
    }

    private DashboardResponse.SummaryCard summaryCard(DailyMetric metric, LocalDate date, BigDecimal defaultTarget) {
        if (metric == null) {
            return new DashboardResponse.SummaryCard(
                    date.toString(),
                    BigDecimal.ZERO,
                    valueOrZero(defaultTarget),
                    valueOrZero(defaultTarget),
                    null,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
            );
        }
        return new DashboardResponse.SummaryCard(
                metric.getMetricDate().toString(),
                metric.getCaloriesConsumedKcal(),
                Optional.ofNullable(metric.getCaloriesTargetKcal()).orElse(valueOrZero(defaultTarget)),
                remaining(metric),
                metric.getWeightKg(),
                valueOrZero(metric.getProteinG()),
                valueOrZero(metric.getFiberG())
        );
    }

    private BigDecimal remaining(DailyMetric metric) {
        return Optional.ofNullable(metric.getCaloriesTargetKcal()).orElse(BigDecimal.ZERO)
                .subtract(Optional.ofNullable(metric.getCaloriesConsumedKcal()).orElse(BigDecimal.ZERO));
    }

    private BigDecimal sum(List<BigDecimal> values) {
        return values.stream().filter(v -> v != null).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal average(List<BigDecimal> values) {
        List<BigDecimal> clean = values.stream().filter(v -> v != null).toList();
        if (clean.isEmpty()) {
            return null;
        }
        return sum(clean).divide(BigDecimal.valueOf(clean.size()), 2, java.math.RoundingMode.HALF_UP);
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
