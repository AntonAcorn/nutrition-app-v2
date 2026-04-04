package com.aiduparc.nutrition.service;

import com.aiduparc.nutrition.domain.DailyMetric;
import com.aiduparc.nutrition.domain.User;
import com.aiduparc.nutrition.repo.DailyMetricRepository;
import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CsvImportService {
    private static final Logger log = LoggerFactory.getLogger(CsvImportService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private final DailyMetricRepository dailyMetricRepository;
    private final UserService userService;

    public CsvImportService(DailyMetricRepository dailyMetricRepository, UserService userService) {
        this.dailyMetricRepository = dailyMetricRepository;
        this.userService = userService;
    }

    @Transactional
    public CsvImportResult importFile(Path path) throws IOException {
        User user = userService.getDefaultUser();
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            List<String> lines = reader.lines().toList();
            if (lines.isEmpty()) {
                return new CsvImportResult(0, 0);
            }

            Map<String, Integer> headerIndex = parseHeader(lines.get(0));
            int imported = 0;
            int skipped = 0;
            for (int i = 1; i < lines.size(); i++) {
                String line = lines.get(i);
                if (line == null || line.isBlank()) {
                    continue;
                }
                List<String> values = splitCsvLine(line);
                LocalDate date = parseDate(get(values, headerIndex, "Дата"));
                if (date == null) {
                    skipped++;
                    continue;
                }
                DailyMetric metric = dailyMetricRepository.findByUserAndMetricDate(user, date)
                        .orElseGet(DailyMetric::new);
                metric.setUser(user);
                metric.setMetricDate(date);
                metric.setWeightKg(parseDecimal(get(values, headerIndex, "Вес")));
                metric.setCaloriesConsumedKcal(defaultZero(parseDecimal(get(values, headerIndex, "Съедено за день"))));
                metric.setCaloriesTargetKcal(parseDecimal(get(values, headerIndex, "Норма")));
                metric.setProteinG(parseDecimal(get(values, headerIndex, "Белок")));
                metric.setFiberG(parseDecimal(get(values, headerIndex, "Клетчатка")));
                metric.setDataSource("imported_csv");
                metric.setSourcePayload(toJson(values, headerIndex));
                dailyMetricRepository.save(metric);
                imported++;
            }
            log.info("Imported nutrition CSV from {}: {} rows, {} skipped", path, imported, skipped);
            return new CsvImportResult(imported, skipped);
        }
    }

    Map<String, Integer> parseHeader(String headerLine) {
        List<String> headers = splitCsvLine(headerLine);
        Map<String, Integer> index = new HashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            index.put(headers.get(i).trim(), i);
        }
        return index;
    }

    List<String> splitCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        result.add(current.toString().trim());
        return result;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDate.parse(value.trim(), DATE_FORMATTER);
    }

    BigDecimal parseDecimal(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replace(" ", "").replace(',', '.');
        if (normalized.isBlank() || normalized.equals("-")) {
            return null;
        }
        return new BigDecimal(normalized);
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String get(List<String> values, Map<String, Integer> headerIndex, String key) {
        Integer idx = headerIndex.get(key);
        if (idx == null || idx >= values.size()) {
            return null;
        }
        String value = values.get(idx);
        return value != null && value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private String toJson(List<String> values, Map<String, Integer> headerIndex) {
        String[] keys = {"Дата", "Вес", "Съедено за день", "Норма", "Отклонение", "Неделя", "Средний вес недели", "Итог недели по калориям", "Месяц", "Итог месяца по калориям", "Белок", "Клетчатка"};
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (String key : keys) {
            String value = get(values, headerIndex, key);
            if (value == null) {
                continue;
            }
            if (!first) {
                sb.append(',');
            }
            sb.append('"').append(key.replace("\"", "\\\"")).append('"').append(':')
                    .append('"').append(value.replace("\"", "\\\"")).append('"');
            first = false;
        }
        sb.append('}');
        return sb.toString();
    }
}
