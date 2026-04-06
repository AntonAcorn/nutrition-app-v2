package com.aiduparc.nutrition.photoanalysis.draft.api;

import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.ConfirmPhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/photo-analysis/drafts")
public class PhotoAnalysisDraftController {

    private final PhotoAnalysisDraftService draftService;

    public PhotoAnalysisDraftController(PhotoAnalysisDraftService draftService) {
        this.draftService = draftService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoAnalysisDraftResponse create(@Valid @RequestBody CreatePhotoAnalysisDraftRequest request) {
        return draftService.create(request);
    }

    @GetMapping("/{draftId}")
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisDraftResponse get(@PathVariable UUID draftId) {
        return draftService.get(draftId);
    }

    @PostMapping("/{draftId}/confirm")
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisDraftResponse confirm(@PathVariable UUID draftId,
                                              @RequestBody(required = false) ConfirmPhotoAnalysisDraftRequest request) {
        ConfirmPhotoAnalysisDraftRequest safeRequest = request == null
                ? new ConfirmPhotoAnalysisDraftRequest(null, null, null, null)
                : request;
        return draftService.confirm(draftId, safeRequest);
    }
}

