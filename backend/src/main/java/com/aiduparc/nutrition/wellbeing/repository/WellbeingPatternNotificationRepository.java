package com.aiduparc.nutrition.wellbeing.repository;

import com.aiduparc.nutrition.wellbeing.model.WellbeingPatternNotificationEntity;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WellbeingPatternNotificationRepository extends JpaRepository<WellbeingPatternNotificationEntity, UUID> {

    boolean existsByUserIdAndFoodKey(UUID userId, String foodKey);

    @Query("SELECT n.foodKey FROM WellbeingPatternNotificationEntity n WHERE n.userId = :userId")
    Set<String> findFoodKeysByUserId(@Param("userId") UUID userId);
}
