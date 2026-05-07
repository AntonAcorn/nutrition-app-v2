package com.aiduparc.nutrition.calorieBank.api;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record RelaxDayRequest(@NotNull LocalDate date) {}
