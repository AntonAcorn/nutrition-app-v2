package com.aiduparc.nutrition.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        SummaryCard today,
        TimeRange range,
        SummaryCard totals,
        List<MetricPoint> weight,
        List<MetricPoint> calories,
        List<MetricPoint> protein,
        List<MetricPoint> fiber
) {
    public record SummaryCard(
            String date,
            BigDecimal consumed,
            BigDecimal target,
            BigDecimal remaining,
            BigDecimal weight,
            BigDecimal protein,
            BigDecimal fiber
    ) {}

    public record TimeRange(String from, String to, int days) {}

    public record MetricPoint(String date, BigDecimal value) {}
}
