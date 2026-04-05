package com.aiduparc.nutrition.service;

import com.aiduparc.nutrition.domain.DailyMetric;
import com.aiduparc.nutrition.domain.ImportRun;
import com.aiduparc.nutrition.domain.User;
import com.aiduparc.nutrition.repo.DailyMetricRepository;
import com.aiduparc.nutrition.repo.ImportRunRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CsvImportService {
    private static final Logger log = LoggerFactory.getLogger(CsvImportService.class);
    private static final String[] RAW_COLUMNS = {
            "Дата", "Вес", "Съедено за день", "Норма", "Отклонение", "Неделя",
            "Средний вес недели", "Итог недели по калориям", "Месяц", "Итог месяца по калориям",
            "Белок", "Клетчатка"
    };
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter RU_DATE = DateTimeFormatter.ofPattern("d.M.yyyy");

    private final DailyMetricRepository dailyMetricRepository;
    private final ImportRunRepository importRunRepository;
    private final UserService userService;

    public CsvImportService(
            DailyMetricRepository dailyMetricRepository,
            ImportRunRepository importRunRepository,
            UserService userService
    ) {
        this.dailyMetricRepository = dailyMetricRepository;
        this.importRunRepository = importRunRepository;
        this.userService = userService;
    }

    @Transactional
    public CsvImportResult importFile(Path path) throws IOException {
        User user = userService.getDefaultUser();
        String content = Files.readString(path, StandardCharsets.UTF_8).replace("\uFEFF", "").replace("\r\n", "\n").trim();
        if (content.isBlank()) {
            return new CsvImportResult(0, 0, false);
        }

        String checksum = sha256(content);
        if (importRunRepository.findBySourceChecksum(checksum).isPresent()) {
            return new CsvImportResult(0, 0, true);
        }

        List<String> lines = content.lines().toList();
        Map<String, Integer> headerIndex = parseHeader(lines.get(0));
        int imported = 0;
        int skipped = 0;

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line == null || line.isBlank()) {
                continue;
            }

            List<String> values = splitCsvLine(line, detectDelimiter(lines.get(0)));
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

        ImportRun importRun = new ImportRun();
        importRun.setSourceName(path.getFileName().toString());
        importRun.setSourceChecksum(checksum);
        importRun.setImportedRows(imported);
        importRunRepository.save(importRun);

        log.info("Imported nutrition CSV from {}: imported={}, skipped={}", path, imported, skipped);
        return new CsvImportResult(imported, skipped, false);
    }

    Map<String, Integer> parseHeader(String headerLine) {
        List<String> headers = splitCsvLine(headerLine, detectDelimiter(headerLine));
        Map<String, Integer> index = new HashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            index.put(stripBom(headers.get(i)).trim(), i);
        }
        return index;
    }

    List<String> splitCsvLine(String line, char delimiter) {
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
            } else if (c == delimiter && !inQuotes) {
                result.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        result.add(current.toString().trim());
        return result;
    }

    BigDecimal parseDecimal(String value) {
        if (value == null) {
            return null;
        }
        String normalized = stripBom(value).trim().replace(" ", "").replace(',', '.');
        if (normalized.isBlank() || normalized.equals("-")) {
            return null;
        }
        return new BigDecimal(normalized);
    }

    private char detectDelimiter(String line) {
        return line.indexOf(';') >= 0 ? ';' : ',';
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = stripBom(value).trim();
        try {
            return LocalDate.parse(normalized, ISO_DATE);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDate.parse(normalized, RU_DATE);
            } catch (DateTimeParseException ignoredAgain) {
                return null;
            }
        }
    }

    private String get(List<String> values, Map<String, Integer> headerIndex, String key) {
        Integer idx = headerIndex.get(key);
        if (idx == null || idx >= values.size()) {
            return null;
        }
        return stripBom(values.get(idx));
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String stripBom(String value) {
        return value != null && value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private String toJson(List<String> values, Map<String, Integer> headerIndex) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (String key : RAW_COLUMNS) {
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

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is not available", e);
        }
    }
}
