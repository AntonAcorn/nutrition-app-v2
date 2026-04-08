package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoUploadAnalysisRequest;

public interface PhotoUploadAnalysisService {
    PhotoAnalysisDraftResponse analyzeAndCreateDraft(PhotoUploadAnalysisRequest request);
}
