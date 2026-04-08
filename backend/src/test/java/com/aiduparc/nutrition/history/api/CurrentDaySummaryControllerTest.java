package com.aiduparc.nutrition.history.api;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiduparc.nutrition.history.service.CurrentDaySummarySnapshot;
import com.aiduparc.nutrition.history.service.NutritionHistoryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CurrentDaySummaryController.class)
class CurrentDaySummaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NutritionHistoryService nutritionHistoryService;

    @Test
    void returnsCurrentDaySummaryFromHistory() throws Exception {
        CurrentDaySummarySnapshot snapshot = new CurrentDaySummarySnapshot(
            LocalDate.of(2026, 4, 7),
            new BigDecimal("1490.00"),
            new BigDecimal("2000.00"),
            new BigDecimal("510.00"),
            new BigDecimal("97.00"),
            new BigDecimal("13.00")
        );

        when(nutritionHistoryService.findCurrentDaySummary(UUID.fromString("11111111-1111-1111-1111-111111111111"), LocalDate.now()))
            .thenReturn(Optional.of(snapshot));

        mockMvc.perform(get("/api/history/current-day-summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.entryDate").value("2026-04-07"))
            .andExpect(jsonPath("$.consumedCalories").value(1490.00))
            .andExpect(jsonPath("$.dailyTargetCalories").value(2000.00))
            .andExpect(jsonPath("$.remainingCalories").value(510.00))
            .andExpect(jsonPath("$.proteinGrams").value(97.00))
            .andExpect(jsonPath("$.fiberGrams").value(13.00));
    }

    @Test
    void returnsZeroedSummaryWhenHistoryIsMissing() throws Exception {
        when(nutritionHistoryService.findCurrentDaySummary(UUID.fromString("11111111-1111-1111-1111-111111111111"), LocalDate.now()))
            .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/history/current-day-summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.consumedCalories").value(0))
            .andExpect(jsonPath("$.dailyTargetCalories").value(0))
            .andExpect(jsonPath("$.remainingCalories").value(0))
            .andExpect(jsonPath("$.proteinGrams").value(0))
            .andExpect(jsonPath("$.fiberGrams").value(0));
    }
}
