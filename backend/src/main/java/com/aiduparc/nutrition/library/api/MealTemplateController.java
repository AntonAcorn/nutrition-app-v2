package com.aiduparc.nutrition.library.api;

import com.aiduparc.nutrition.library.service.MealTemplateService;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meal-templates")
public class MealTemplateController {

    private final MealTemplateService service;
    private final CurrentNutritionUserResolver resolver;

    public MealTemplateController(MealTemplateService service, CurrentNutritionUserResolver resolver) {
        this.service = service;
        this.resolver = resolver;
    }

    @GetMapping
    public List<MealTemplateResponse> list(HttpSession session) {
        UUID userId = resolver.resolve(session, null);
        return service.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MealTemplateResponse create(@Valid @RequestBody MealTemplateRequest request, HttpSession session) {
        UUID userId = resolver.resolve(session, null);
        return service.create(userId, request);
    }

    @PutMapping("/{id}")
    public MealTemplateResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody MealTemplateRequest request,
            HttpSession session
    ) {
        UUID userId = resolver.resolve(session, null);
        return service.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, HttpSession session) {
        UUID userId = resolver.resolve(session, null);
        service.delete(userId, id);
    }

    @PostMapping("/{id}/log")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void log(
            @PathVariable UUID id,
            @Valid @RequestBody LogTemplateRequest request,
            HttpSession session
    ) {
        UUID userId = resolver.resolve(session, null);
        service.log(userId, id, request.entryDate());
    }

    @PostMapping("/{id}/unlog")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlog(
            @PathVariable UUID id,
            @Valid @RequestBody LogTemplateRequest request,
            HttpSession session
    ) {
        UUID userId = resolver.resolve(session, null);
        service.unlog(userId, id, request.entryDate());
    }
}
