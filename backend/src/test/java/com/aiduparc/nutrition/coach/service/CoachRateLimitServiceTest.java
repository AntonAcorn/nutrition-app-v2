package com.aiduparc.nutrition.coach.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aiduparc.nutrition.coach.repository.UserInsightRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class CoachRateLimitServiceTest {

    private final UserInsightRepository repo = mock(UserInsightRepository.class);
    private final UUID userId = UUID.randomUUID();

    @Test
    void allowsWhenUnderBothLimits() {
        when(repo.countByUserIdAndGeneratedAtAfter(eq(userId), any(OffsetDateTime.class))).thenReturn(0L);
        var service = new CoachRateLimitService(repo, 1, 5);

        assertThatCode(() -> service.checkRefreshLimit(userId)).doesNotThrowAnyException();
    }

    @Test
    void blocksWhenHourlyLimitReached() {
        when(repo.countByUserIdAndGeneratedAtAfter(eq(userId), any(OffsetDateTime.class))).thenReturn(1L);
        var service = new CoachRateLimitService(repo, 1, 5);

        assertThatThrownBy(() -> service.checkRefreshLimit(userId))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                var sse = (ResponseStatusException) ex;
                org.assertj.core.api.Assertions.assertThat(sse.getStatusCode())
                    .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                org.assertj.core.api.Assertions.assertThat(sse.getReason())
                    .contains("hour");
            });
    }

    @Test
    void blocksWhenDailyLimitReachedEvenIfHourlyOk() {
        // First call is for hourly check (≤1h ago), second for daily.
        // We can't differentiate by stub args easily here, so make hourly cap high (10).
        when(repo.countByUserIdAndGeneratedAtAfter(eq(userId), any(OffsetDateTime.class))).thenReturn(5L);
        var service = new CoachRateLimitService(repo, 10, 5);

        assertThatThrownBy(() -> service.checkRefreshLimit(userId))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                var sse = (ResponseStatusException) ex;
                org.assertj.core.api.Assertions.assertThat(sse.getStatusCode())
                    .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                org.assertj.core.api.Assertions.assertThat(sse.getReason())
                    .contains("day");
            });
    }
}
