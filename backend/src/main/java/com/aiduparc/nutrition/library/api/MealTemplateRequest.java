package com.aiduparc.nutrition.library.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MealTemplateRequest(
        @NotBlank String name,
        @NotNull List<MealTemplateItem> items
) {}
