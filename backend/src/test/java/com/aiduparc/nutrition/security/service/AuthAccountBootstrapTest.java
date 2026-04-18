package com.aiduparc.nutrition.security.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiduparc.nutrition.security.model.AuthAccountEntity;
import java.util.UUID;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Manual bootstrap helper for creating/binding the first auth account")
class AuthAccountBootstrapTest {

    @Autowired
    private AuthAccountService authAccountService;

    @Test
    void bootstrapAntonAccount() {
        UUID liveNutritionUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");

        AuthAccountEntity account = authAccountService.findByEmail("Shustikovanimation@gmail.com")
                .orElseGet(() -> authAccountService.createAccount(
                        "Shustikovanimation@gmail.com",
                        "asdqwe123456",
                        "Anton",
                        liveNutritionUserId
                ));

        if (account.getNutritionUserId() == null || !liveNutritionUserId.equals(account.getNutritionUserId())) {
            account = authAccountService.bindExistingAccountToNutritionUser(account.getEmail(), liveNutritionUserId);
        }

        assertThat(account.getEmail()).isEqualTo("shustikovanimation@gmail.com");
        assertThat(account.getNutritionUserId()).isEqualTo(liveNutritionUserId);
    }
}
