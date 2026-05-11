package com.aiduparc.nutrition.calorieBank.api;

import com.aiduparc.nutrition.calorieBank.service.CalorieBankService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calorie-bank")
public class CalorieBankController {

    private final CalorieBankService calorieBankService;
    private final CurrentNutritionUserResolver userResolver;

    public CalorieBankController(
        CalorieBankService calorieBankService,
        CurrentNutritionUserResolver userResolver
    ) {
        this.calorieBankService = calorieBankService;
        this.userResolver = userResolver;
    }

    @GetMapping("/today")
    public CalorieBankSnapshotResponse getToday(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session);
        LocalDate today = date != null ? date : LocalDate.now();
        return calorieBankService.getSnapshot(userId, today);
    }

    @PostMapping("/relax-day")
    @ResponseStatus(HttpStatus.CREATED)
    public void markRelaxDay(@Valid @RequestBody RelaxDayRequest request, HttpSession session) {
        UUID userId = userResolver.resolve(session);
        calorieBankService.markRelaxDay(userId, request.date());
    }

    @DeleteMapping("/relax-day/{date}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unmarkRelaxDay(
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session);
        calorieBankService.unmarkRelaxDay(userId, date);
    }

    @GetMapping("/relax-days")
    public List<LocalDate> getRelaxDays(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month,
        HttpSession session
    ) {
        UUID userId = userResolver.resolve(session);
        LocalDate ref = month != null ? month : LocalDate.now();
        return calorieBankService.getRelaxDaysForMonth(userId, ref);
    }
}
