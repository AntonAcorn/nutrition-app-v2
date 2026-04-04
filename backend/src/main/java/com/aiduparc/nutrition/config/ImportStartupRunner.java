package com.aiduparc.nutrition.config;

import com.aiduparc.nutrition.service.CsvImportResult;
import com.aiduparc.nutrition.service.CsvImportService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ImportStartupRunner implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(ImportStartupRunner.class);
    private final ImportProperties importProperties;
    private final CsvImportService csvImportService;

    public ImportStartupRunner(ImportProperties importProperties, CsvImportService csvImportService) {
        this.importProperties = importProperties;
        this.csvImportService = csvImportService;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!importProperties.isEnabled() || importProperties.getCsvPath() == null || importProperties.getCsvPath().isBlank()) {
            return;
        }
        Path path = Path.of(importProperties.getCsvPath());
        if (!Files.exists(path)) {
            log.warn("nutrition.import.enabled=true but CSV file not found: {}", path);
            return;
        }
        CsvImportResult result = csvImportService.importFile(path);
        log.info("Startup import completed: {} imported, {} skipped", result.importedRows(), result.skippedRows());
    }
}
