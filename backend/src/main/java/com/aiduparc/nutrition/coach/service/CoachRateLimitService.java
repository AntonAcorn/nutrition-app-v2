package com.aiduparc.nutrition.coach.service;

import com.aiduparc.nutrition.coach.repository.UserInsightRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cost guard for the LLM-backed coach. Counts how many fresh
 * insight rows already exist for the user in the relevant window
 * and refuses further generation if either an hourly or a daily
 * cap is reached. Each LLM call writes 1-3 rows; the cap is on
 * generation cycles (i.e. distinct generated_at values), so we
 * compare against generated_at, not row count.
 */
@Service
public class CoachRateLimitService {

    private final UserInsightRepository repository;
    private final int hourlyLimit;
    private final int dailyLimit;

    public CoachRateLimitService(
        UserInsightRepository repository,
        @Value("${nutrition.coach.refresh-hourly-limit:5}") int hourlyLimit,
        @Value("${nutrition.coach.refresh-daily-limit:20}") int dailyLimit
    ) {
        this.repository = repository;
        this.hourlyLimit = hourlyLimit;
        this.dailyLimit = dailyLimit;
    }

    public void checkRefreshLimit(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime hourAgo = now.minusHours(1);

        long perHour = repository.countByUserIdAndGeneratedAtAfter(userId, hourAgo);
        if (perHour >= hourlyLimit) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Coach refresh limited to " + hourlyLimit + "/hour. Try again later."
            );
        }

        long perDay = repository.countByUserIdAndGeneratedAtAfter(userId, startOfDay);
        if (perDay >= dailyLimit) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Coach refresh limited to " + dailyLimit + "/day. Try again tomorrow."
            );
        }
    }
}
