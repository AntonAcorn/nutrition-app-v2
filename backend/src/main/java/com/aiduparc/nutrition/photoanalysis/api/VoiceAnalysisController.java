package com.aiduparc.nutrition.photoanalysis.api;

import com.aiduparc.nutrition.photoanalysis.application.DefaultVoiceAnalysisService;
import com.aiduparc.nutrition.photoanalysis.draft.dto.PhotoAnalysisDraftResponse;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/voice-analysis")
@ConditionalOnProperty(prefix = "nutrition.photo-analysis", name = "provider", havingValue = "openai")
public class VoiceAnalysisController {

    private final DefaultVoiceAnalysisService voiceAnalysisService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public VoiceAnalysisController(
            DefaultVoiceAnalysisService voiceAnalysisService,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.voiceAnalysisService = voiceAnalysisService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoAnalysisDraftResponse analyze(
            @Valid @RequestBody VoiceAnalysisRequest request,
            HttpSession session
    ) {
        UUID userId = currentNutritionUserResolver.resolve(session, null);
        LocalDate entryDate = StringUtils.hasText(request.entryDate())
                ? LocalDate.parse(request.entryDate())
                : LocalDate.now();
        return voiceAnalysisService.analyzeAndCreateDraft(userId, entryDate, request.description(), request.locale());
    }
}
