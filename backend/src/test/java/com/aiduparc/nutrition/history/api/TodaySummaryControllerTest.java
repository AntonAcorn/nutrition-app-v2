package com.aiduparc.nutrition.history.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import com.aiduparc.nutrition.security.SecurityConfig;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TodaySummaryController.class)
@Import(SecurityConfig.class)
class TodaySummaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NutritionHistoryService nutritionHistoryService;

    @Test
    void shouldReturnTodaySummary() throws Exception {
        UUID userId = UUID.randomUUID();
        LocalDate entryDate = LocalDate.of(2026, 4, 8);

        when(nutritionHistoryService.getTodaySummary(userId, entryDate)).thenReturn(
                new TodaySummaryResponse(
                        userId,
                        entryDate,
                        new BigDecimal("82.40"),
                        new BigDecimal("1640.00"),
                        new BigDecimal("2100.00"),
                        new BigDecimal("460.00"),
                        new BigDecimal("108.00"),
                        new BigDecimal("52.00"),
                        new BigDecimal("24.00")
                )
        );

        mockMvc.perform(get("/api/history/today-summary")
                        .param("userId", userId.toString())
                        .param("entryDate", "2026-04-08"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weightKg").value(82.40))
                .andExpect(jsonPath("$.consumedCalories").value(1640.00))
                .andExpect(jsonPath("$.remainingCalories").value(460.00))
                .andExpect(jsonPath("$.proteinGrams").value(108.00))
                .andExpect(jsonPath("$.fatGrams").value(52.00))
                .andExpect(jsonPath("$.fiberGrams").value(24.00));

        verify(nutritionHistoryService).getTodaySummary(userId, entryDate);
    }
}
