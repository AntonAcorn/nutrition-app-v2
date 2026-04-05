package com.aiduparc.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.domain.DailyMetric;
import com.aiduparc.nutrition.domain.User;
import com.aiduparc.nutrition.dto.DashboardResponse;
import com.aiduparc.nutrition.repo.DailyMetricRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class DashboardServiceTest {
    private final DailyMetricRepository repository = Mockito.mock(DailyMetricRepository.class);
    private final UserService userService = Mockito.mock(UserService.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-04-05T00:00:00Z"), ZoneOffset.UTC);
    private final DashboardService service = new DashboardService(repository, userService, clock);

    @Test
    void buildsSummaryFromTodayMetricWhenPresent() {
        User user = new User();
        when(userService.getDefaultUser()).thenReturn(user);

        DailyMetric april4 = metric(user, LocalDate.of(2026, 4, 4), "73.80", "1160", "2000", "67", "11");
        DailyMetric april5 = metric(user, LocalDate.of(2026, 4, 5), "73.60", "1500", "2000", "92", "18");

        when(repository.findTop120ByUserOrderByMetricDateDesc(user)).thenReturn(List.of(april5, april4));
        when(repository.findByUserAndMetricDateBetweenOrderByMetricDateAsc(any(), any(), any()))
                .thenReturn(List.of(april4, april5));

        DashboardResponse response = service.getDashboard(30);

        assertEquals("2026-04-05", response.today().date());
        assertEquals(new BigDecimal("1500"), response.today().consumed());
        assertEquals(new BigDecimal("500"), response.today().remaining());
        assertEquals(2, response.weight().size());
        assertEquals(new BigDecimal("2660"), response.totals().consumed());
        assertEquals(new BigDecimal("159"), response.totals().protein());
    }

    @Test
    void fallsBackToCurrentDateAndLatestTargetWhenTodayMetricMissing() {
        User user = new User();
        when(userService.getDefaultUser()).thenReturn(user);

        DailyMetric march30 = metric(user, LocalDate.of(2026, 3, 30), "74.30", "1500", "2000", "65", "12");
        DailyMetric april4 = metric(user, LocalDate.of(2026, 4, 4), "73.80", "1160", "2000", "67", "11");

        when(repository.findTop120ByUserOrderByMetricDateDesc(user)).thenReturn(List.of(april4, march30));
        when(repository.findByUserAndMetricDateBetweenOrderByMetricDateAsc(any(), any(), any()))
                .thenReturn(List.of(march30, april4));

        DashboardResponse response = service.getDashboard(30);

        assertEquals("2026-04-05", response.today().date());
        assertEquals(BigDecimal.ZERO, response.today().consumed());
        assertEquals(new BigDecimal("2000"), response.today().target());
        assertEquals(new BigDecimal("2000"), response.today().remaining());
        assertEquals("2026-04-05", response.range().to());
        assertEquals(new BigDecimal("2660"), response.totals().consumed());
        assertEquals(new BigDecimal("132"), response.totals().protein());
    }

    private DailyMetric metric(User user, LocalDate date, String weight, String consumed, String target, String protein, String fiber) {
        DailyMetric metric = new DailyMetric();
        metric.setUser(user);
        metric.setMetricDate(date);
        metric.setWeightKg(new BigDecimal(weight));
        metric.setCaloriesConsumedKcal(new BigDecimal(consumed));
        metric.setCaloriesTargetKcal(new BigDecimal(target));
        metric.setProteinG(new BigDecimal(protein));
        metric.setFiberG(new BigDecimal(fiber));
        return metric;
    }
}
