package com.aiduparc.nutrition.service;

public record CsvImportResult(int importedRows, int skippedRows, boolean duplicateSource) {}
