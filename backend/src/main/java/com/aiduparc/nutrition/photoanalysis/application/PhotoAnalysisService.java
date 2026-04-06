package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;

public interface PhotoAnalysisService {
    PhotoAnalysisResponse analyze(PhotoAnalysisRequest request);
}
