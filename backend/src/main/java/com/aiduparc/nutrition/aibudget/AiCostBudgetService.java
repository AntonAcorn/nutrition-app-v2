package com.aiduparc.nutrition.aibudget;

import java.time.LocalDate;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Hard daily cap on aggregate AI spend across all users. Backstop to the
 * per-user quota: protects against viral spikes, runaway scripts, or a bug
 * in the per-user counter. Per-call estimates are accurate enough at the
 * cent level — the goal is "don't exceed $X/day," not perfect accounting.
 *
 * <p>Tuned via {@code nutrition.ai-budget.daily-cents} (default 500 = $5/day).
 * Set to 0 or negative to disable the cap entirely.
 */
@Service
public class AiCostBudgetService {

    private static final Logger log = LoggerFactory.getLogger(AiCostBudgetService.class);

    public static final long PHOTO_CENTS = 1;   // gpt-4.1-mini @ detail=low
    public static final long VOICE_CENTS = 1;   // gpt-4.1-mini text only
    public static final long COACH_INSIGHT_CENTS = 2;  // gpt-4o-mini, large prompt
    public static final long COACH_TRIGGER_CENTS = 1;
    public static final long COACH_INLINE_TIP_CENTS = 1;

    private final AiCostLedgerRepository repository;
    private final long dailyBudgetCents;

    public AiCostBudgetService(
            AiCostLedgerRepository repository,
            @Value("${nutrition.ai-budget.daily-cents:500}") long dailyBudgetCents
    ) {
        this.repository = repository;
        this.dailyBudgetCents = dailyBudgetCents;
        log.info("ai-budget initialised dailyBudgetCents={}", dailyBudgetCents);
    }

    /**
     * Throws 503 if today's spend already meets or exceeds the budget. Call
     * this immediately before any outbound OpenAI request — no point burning
     * latency on a call we'll have to discard.
     */
    public void assertBudgetOk() {
        if (dailyBudgetCents <= 0) return;
        long spent = todaysCentsSpent();
        if (spent >= dailyBudgetCents) {
            log.warn("ai-budget exceeded spent={}c budget={}c", spent, dailyBudgetCents);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AI is at capacity for today. Try again tomorrow."
            );
        }
    }

    /**
     * Records cost of one OpenAI call. Always call after a successful response
     * (don't charge for failures the user didn't get value from).
     */
    @Transactional
    public void recordCost(long cents) {
        if (cents <= 0) return;
        repository.addCost(LocalDate.now(ZoneOffset.UTC), cents);
    }

    public long todaysCentsSpent() {
        return repository.findCentsSpent(LocalDate.now(ZoneOffset.UTC)).orElse(0L);
    }

    public long dailyBudgetCents() {
        return dailyBudgetCents;
    }
}
