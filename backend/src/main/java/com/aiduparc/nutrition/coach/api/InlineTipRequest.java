package com.aiduparc.nutrition.coach.api;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record InlineTipRequest(
    @NotNull BigDecimal kcal,
    String slotType
) {}
