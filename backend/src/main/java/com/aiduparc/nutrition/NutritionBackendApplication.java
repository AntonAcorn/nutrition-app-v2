package com.aiduparc.nutrition;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NutritionBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(NutritionBackendApplication.class, args);
    }
}
