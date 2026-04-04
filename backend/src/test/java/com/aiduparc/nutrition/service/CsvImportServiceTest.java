package com.aiduparc.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.aiduparc.nutrition.repo.DailyMetricRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class CsvImportServiceTest {
    private final CsvImportService service = new CsvImportService(Mockito.mock(DailyMetricRepository.class), Mockito.mock(UserService.class));

    @Test
    void splitsQuotedCsvAndCommaDecimals() {
        List<String> values = service.splitCsvLine("2026-04-04,79,2,1800,2000,\"note, with comma\",130,18");
        assertEquals("79", values.get(1));
        assertEquals("note, with comma", values.get(5));
        assertEquals("130", values.get(6));
        assertEquals("18", values.get(7));
    }

    @Test
    void parsesRussianStyleDecimals() {
        assertEquals("79.20", service.parseDecimal("79,2").setScale(2).toPlainString());
        assertEquals("1800", service.parseDecimal("1 800").toPlainString());
        assertNull(service.parseDecimal("-"));
    }
}
