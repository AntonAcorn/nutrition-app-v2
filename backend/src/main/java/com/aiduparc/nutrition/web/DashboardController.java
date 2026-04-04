package com.aiduparc.nutrition.web;

import com.aiduparc.nutrition.dto.DashboardResponse;
import com.aiduparc.nutrition.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard(@RequestParam(defaultValue = "30") Integer days) {
        return dashboardService.getDashboard(days);
    }
}
