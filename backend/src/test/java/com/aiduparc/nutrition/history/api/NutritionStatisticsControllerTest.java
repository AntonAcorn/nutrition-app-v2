package com.aiduparc.nutrition.history.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NutritionStatisticsController.class)
class NutritionStatisticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NutritionHistoryService nutritionHistoryService;

    @Test
    void returnsStatisticsPayload() throws Exception {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(nutritionHistoryService.getStatistics(userId, LocalDate.of(2026, 3, 26), LocalDate.of(2026, 4, 8)))
            .thenReturn(new NutritionStatisticsResponse(
                userId,
                LocalDate.of(2026, 3, 26),
                LocalDate.of(2026, 4, 8),
                List.of(new NutritionStatisticsPointResponse(
                    LocalDate.of(2026, 4, 8),
                    new BigDecimal("1840.00"),
                    new BigDecimal("2000.00"),
                    new BigDecimal("-160.00"),
                    new BigDecimal("120.00"),
                    new BigDecimal("65.00"),
                    new BigDecimal("25.00")
                ))
            ));

        mockMvc.perform(get("/api/history/statistics")
                .param("userId", userId.toString())
                .param("fromDate", "2026-03-26")
                .param("toDate", "2026-04-08"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.points[0].entryDate").value("2026-04-08"))
            .andExpect(jsonPath("$.points[0].calorieBalance").value(-160.00));

        verify(nutritionHistoryService).getStatistics(userId, LocalDate.of(2026, 3, 26), LocalDate.of(2026, 4, 8));
    }
}
