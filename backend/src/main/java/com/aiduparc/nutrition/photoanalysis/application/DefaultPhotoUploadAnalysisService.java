package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoUploadAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.draft.application.PhotoAnalysisDraftService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.CreatePhotoAnalysisDraftRequest;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DefaultPhotoUploadAnalysisService implements PhotoUploadAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(DefaultPhotoUploadAnalysisService.class);

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
        log.info(
                "photo upload normalize userId={} entryDate={} originalBytes={} normalizedBytes={} contentType={}",
                request.userId(),
                request.entryDate(),
                request.imageBytes().length,
                normalizedImage.bytes().length,
                normalizedImage.contentType()
        );

        String imageDataUrl = "data:%s;base64,%s".formatted(
                normalizedImage.contentType(),
                Base64.getEncoder().encodeToString(normalizedImage.bytes())
        );

        var analysis = photoAnalysisService.analyze(new PhotoAnalysisRequest(
                imageDataUrl,
                request.userNote(),
                request.locale()
        ));

        PhotoAnalysisDraftResponse draft = draftService.create(new CreatePhotoAnalysisDraftRequest(
                request.userId(),
                request.entryDate(),
                analysis
        ));

        log.info(
                "photo upload analyzed userId={} entryDate={} draftId={} items={} calories={}",
                request.userId(),
                request.entryDate(),
                draft.id(),
                analysis.items().size(),
                analysis.totals().calories()
        );

        return draft;
    }
}
