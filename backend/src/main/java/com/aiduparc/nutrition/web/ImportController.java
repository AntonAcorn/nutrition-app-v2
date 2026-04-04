package com.aiduparc.nutrition.web;

import com.aiduparc.nutrition.dto.CsvImportRequest;
import com.aiduparc.nutrition.service.CsvImportResult;
import com.aiduparc.nutrition.service.CsvImportService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/imports")
public class ImportController {
    private final CsvImportService csvImportService;

    public ImportController(CsvImportService csvImportService) {
        this.csvImportService = csvImportService;
    }

    @PostMapping("/daily-metrics")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> importDailyMetrics(@Valid @RequestBody CsvImportRequest request) throws IOException {
        CsvImportResult result = csvImportService.importFile(Path.of(request.csvPath()));
        return Map.of(
                "status", "accepted",
                "csvPath", request.csvPath(),
                "importedRows", result.importedRows(),
                "skippedRows", result.skippedRows()
        );
    }
}
