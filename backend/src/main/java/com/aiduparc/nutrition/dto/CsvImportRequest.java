package com.aiduparc.nutrition.dto;

import jakarta.validation.constraints.NotBlank;

public record CsvImportRequest(@NotBlank String csvPath) {}
