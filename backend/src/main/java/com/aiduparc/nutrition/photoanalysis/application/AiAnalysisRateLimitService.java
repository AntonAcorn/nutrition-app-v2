package com.aiduparc.nutrition.photoanalysis.application;

import com.aiduparc.nutrition.photoanalysis.draft.repository.PhotoAnalysisDraftRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiAnalysisRateLimitService {

    private final PhotoAnalysisDraftRepository draftRepository;
    private final int dailyLimit;

    public AiAnalysisRateLimitService(
            PhotoAnalysisDraftRepository draftRepository,
            @Value("${nutrition.ai-analysis.daily-limit:30}") int dailyLimit
    ) {
        this.draftRepository = draftRepository;
        this.dailyLimit = dailyLimit;
    }

    public void checkLimit(UUID userId) {
        OffsetDateTime startOfDay = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        long count = draftRepository.countByUserIdAndCreatedAtAfter(userId, startOfDay);
        if (count >= dailyLimit) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Daily analysis limit reached (" + dailyLimit + "/day). Try again tomorrow."
            );
        }
    }
}
