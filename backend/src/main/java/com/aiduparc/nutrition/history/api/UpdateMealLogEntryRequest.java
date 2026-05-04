package com.aiduparc.nutrition.history.api;

import java.math.BigDecimal;

public record UpdateMealLogEntryRequest(
    String name,
    BigDecimal caloriesKcal,
    BigDecimal proteinG,
    BigDecimal fatG,
    BigDecimal carbsG,
    BigDecimal fiberG,
    String slotType
) {}
