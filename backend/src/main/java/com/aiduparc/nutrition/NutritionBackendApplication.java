package com.aiduparc.nutrition;

import com.aiduparc.nutrition.config.ImportProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(ImportProperties.class)
public class NutritionBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(NutritionBackendApplication.class, args);
    }
}
