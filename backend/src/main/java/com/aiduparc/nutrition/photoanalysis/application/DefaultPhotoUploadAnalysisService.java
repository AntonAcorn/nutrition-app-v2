package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoUploadAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import java.util.Base64;
import org.springframework.stereotype.Service;

@Service
public class DefaultPhotoUploadAnalysisService implements PhotoUploadAnalysisService {

    private final PhotoAnalysisService photoAnalysisService;
    private final PhotoAnalysisDraftService draftService;

    public DefaultPhotoUploadAnalysisService(
            PhotoAnalysisService photoAnalysisService,
            PhotoAnalysisDraftService draftService
    ) {
        this.photoAnalysisService = photoAnalysisService;
        this.draftService = draftService;
    }

    @Override
    public PhotoAnalysisDraftResponse analyzeAndCreateDraft(PhotoUploadAnalysisRequest request) {
        String contentType = request.contentType() != null && !request.contentType().isBlank()
                ? request.contentType()
                : "image/jpeg";

        String imageDataUrl = "data:%s;base64,%s".formatted(
                contentType,
                Base64.getEncoder().encodeToString(request.imageBytes())
        );

        var analysis = photoAnalysisService.analyze(new PhotoAnalysisRequest(
                imageDataUrl,
                request.userNote(),
                request.locale()
        ));

        return draftService.create(new CreatePhotoAnalysisDraftRequest(
                request.userId(),
                request.entryDate(),
                analysis
        ));
    }
}
