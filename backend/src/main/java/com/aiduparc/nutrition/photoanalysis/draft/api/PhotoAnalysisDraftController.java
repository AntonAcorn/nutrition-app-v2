package com.aiduparc.nutrition.photoanalysis.draft.api;

import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.ConfirmPhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/photo-analysis/drafts")
public class PhotoAnalysisDraftController {

    private final PhotoAnalysisDraftService draftService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public PhotoAnalysisDraftController(
            PhotoAnalysisDraftService draftService,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.draftService = draftService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoAnalysisDraftResponse create(@Valid @RequestBody CreatePhotoAnalysisDraftRequest request, HttpSession session) {
        CreatePhotoAnalysisDraftRequest resolvedRequest = new CreatePhotoAnalysisDraftRequest(
                currentNutritionUserResolver.resolve(session, request.userId()),
                request.entryDate(),
                request.analysis()
        );
        return draftService.create(resolvedRequest);
    }

    @GetMapping("/{draftId}")
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisDraftResponse get(@PathVariable UUID draftId,
                                          @RequestParam(required = false) UUID userId,
                                          HttpSession session) {
        return draftService.get(draftId, currentNutritionUserResolver.resolve(session, userId));
    }

    @PostMapping("/{draftId}/confirm")
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisDraftResponse confirm(@PathVariable UUID draftId,
                                              @RequestParam(required = false) UUID userId,
                                              @RequestBody(required = false) ConfirmPhotoAnalysisDraftRequest request,
                                              HttpSession session) {
        ConfirmPhotoAnalysisDraftRequest safeRequest = request == null
                ? new ConfirmPhotoAnalysisDraftRequest(null, null, null, null, null)
                : request;
        return draftService.confirm(draftId, currentNutritionUserResolver.resolve(session, userId), safeRequest);
    }

    @GetMapping("/latest")
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisDraftResponse getLatest(@RequestParam(required = false) UUID userId, HttpSession session) {
        return draftService.getLatest(currentNutritionUserResolver.resolve(session, userId));
    }
}

