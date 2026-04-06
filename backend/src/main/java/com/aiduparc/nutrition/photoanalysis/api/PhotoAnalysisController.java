package com.aiduparc.nutrition.photoanalysis.api;

import com.aiduparc.nutrition.photoanalysis.application.PhotoAnalysisService;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/photo-analysis")
public class PhotoAnalysisController {

    private final PhotoAnalysisService photoAnalysisService;

    public PhotoAnalysisController(PhotoAnalysisService photoAnalysisService) {
        this.photoAnalysisService = photoAnalysisService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisResponse analyze(@Valid @RequestBody PhotoAnalysisRequest request) {
        return photoAnalysisService.analyze(request);
    }
}
