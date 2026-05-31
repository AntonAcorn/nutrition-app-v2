package com.aiduparc.nutrition.user.service;

import java.math.BigDecimal;
import java.math.MathContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Hard guard against weight goals that would push the user below a clinically
 * concerning BMI. We don't want to be a tool that enables eating disorders.
 *
 * <p>Threshold is BMI 17 (significantly underweight per WHO classification).
 * Anything between 17 and 18.5 is handled with an in-app warning on the
 * frontend — soft enough that an athlete with low body fat can still proceed
 * with confirmation, hard enough that we surface the resource to anyone who
 * needs it.
 *
 * <p>Returns the {@code NEDIC} helpline because the app is Canada-first; the
 * resource is appropriate worldwide for English speakers.
 */
final class SafetyCheck {

    private SafetyCheck() {}

    private static final BigDecimal MIN_TARGET_BMI = new BigDecimal("17.0");

    static void assertTargetWeightSafe(BigDecimal targetWeightKg, BigDecimal heightCm) {
        if (targetWeightKg == null || heightCm == null) return;
        BigDecimal heightMeters = heightCm.divide(new BigDecimal("100"), MathContext.DECIMAL64);
        BigDecimal bmi = targetWeightKg.divide(
                heightMeters.multiply(heightMeters), MathContext.DECIMAL64);
        if (bmi.compareTo(MIN_TARGET_BMI) < 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "This target weight is below the healthy range for your height. "
                + "Please talk to a doctor first. Free Canadian helpline: "
                + "NEDIC 1-866-633-4220 or nedic.ca."
            );
        }
    }
}
