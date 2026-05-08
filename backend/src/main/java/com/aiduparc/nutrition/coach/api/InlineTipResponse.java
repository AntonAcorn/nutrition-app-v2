package com.aiduparc.nutrition.coach.api;

/**
 * Lightweight signal shown inline in QuickAdd / photo confirm before the
 * user saves the meal. Designed to be cheap to compute (no LLM) and have
 * sub-50ms latency so it can refresh on every keystroke.
 *
 * tone:
 *   good    — within target, sensible distribution
 *   caution — close to target / heavy for time of day
 *   over    — would push the user over target today
 *   muted   — not enough info to advise
 */
public record InlineTipResponse(
    String tone,
    String text,
    Integer kcalAfter,
    Integer kcalTarget
) {}
