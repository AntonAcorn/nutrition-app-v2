package com.aiduparc.nutrition.photoanalysis.draft.application;

import com.aiduparc.nutrition.photoanalysis.draft.dto.ConfirmPhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import java.util.UUID;

public interface PhotoAnalysisDraftService {
    PhotoAnalysisDraftResponse create(CreatePhotoAnalysisDraftRequest request);

    PhotoAnalysisDraftResponse get(UUID draftId, UUID userId);

    PhotoAnalysisDraftResponse confirm(UUID draftId, UUID userId, ConfirmPhotoAnalysisDraftRequest request);

    PhotoAnalysisDraftResponse getLatest(UUID userId);
}

