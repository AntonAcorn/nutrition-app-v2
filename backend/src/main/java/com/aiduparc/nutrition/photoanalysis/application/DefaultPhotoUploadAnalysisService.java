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
    private final ImageNormalizationService imageNormalizationService;

    public DefaultPhotoUploadAnalysisService(
            PhotoAnalysisService photoAnalysisService,
            PhotoAnalysisDraftService draftService,
            ImageNormalizationService imageNormalizationService
    ) {
        this.photoAnalysisService = photoAnalysisService;
        this.draftService = draftService;
        this.imageNormalizationService = imageNormalizationService;
    }

    @Override
    public PhotoAnalysisDraftResponse analyzeAndCreateDraft(PhotoUploadAnalysisRequest request) {
        var normalizedImage = imageNormalizationService.normalize(request.imageBytes(), request.contentType());

        String imageDataUrl = "data:%s;base64,%s".formatted(
                normalizedImage.contentType(),
                Base64.getEncoder().encodeToString(normalizedImage.bytes())
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
