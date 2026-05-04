package com.aiduparc.nutrition.history.api;

import java.util.List;
import java.util.UUID;

public record MealSlotResponse(
    UUID slotId,
    String slotType,
    int sortOrder,
    List<MealLogEntryResponse> items
) {}
