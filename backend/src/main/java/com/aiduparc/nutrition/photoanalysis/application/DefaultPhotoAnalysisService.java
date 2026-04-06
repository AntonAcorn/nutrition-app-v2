package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import com.aiduparc.nutrition.photoanalysis.infrastructure.openai.OpenAiPhotoAnalysisPrompt;
import com.aiduparc.nutrition.photoanalysis.infrastructure.openai.OpenAiPhotoAnalysisProvider;
import org.springframework.stereotype.Service;

@Service
public class DefaultPhotoAnalysisService implements PhotoAnalysisService {

    private final OpenAiPhotoAnalysisProvider provider;
    private final PhotoAnalysisProperties properties;

    public DefaultPhotoAnalysisService(OpenAiPhotoAnalysisProvider provider, PhotoAnalysisProperties properties) {
        this.provider = provider;
        this.properties = properties;
    }

    @Override
    public PhotoAnalysisResponse analyze(PhotoAnalysisRequest request) {
        var prompt = OpenAiPhotoAnalysisPrompt.from(request, properties);
        return provider.analyze(prompt);
    }
}
