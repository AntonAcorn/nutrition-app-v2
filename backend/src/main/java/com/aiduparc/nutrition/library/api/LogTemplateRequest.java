package com.aiduparc.nutrition.library.api;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record LogTemplateRequest(@NotNull LocalDate entryDate) {}
