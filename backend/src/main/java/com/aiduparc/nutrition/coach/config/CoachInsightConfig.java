package com.aiduparc.nutrition.coach.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(CoachInsightProperties.class)
public class CoachInsightConfig {
}
