package com.aiduparc.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.aiduparc.nutrition.repo.DailyMetricRepository;
import com.aiduparc.nutrition.repo.ImportRunRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class CsvImportServiceTest {
    private final CsvImportService service = new CsvImportService(
            Mockito.mock(DailyMetricRepository.class),
            Mockito.mock(ImportRunRepository.class),
            Mockito.mock(UserService.class)
    );

    @Test
    void splitsSemicolonCsvAndCommaDecimals() {
        List<String> values = service.splitCsvLine("19.3.2026;89,4;2011;2200;154,5;18,2", ';');
        assertEquals("89,4", values.get(1));
        assertEquals("154,5", values.get(4));
        assertEquals("18,2", values.get(5));
    }

    @Test
    void parsesRussianStyleDecimals() {
        assertEquals("79.20", service.parseDecimal("79,2").setScale(2).toPlainString());
        assertEquals("1800", service.parseDecimal("1 800").toPlainString());
        assertNull(service.parseDecimal("-"));
    }
}
