package com.aiduparc.nutrition.photoanalysis.api;

import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;

public record PhotoUploadAnalysisResponse(
        PhotoAnalysisDraftResponse draft
) {
}
