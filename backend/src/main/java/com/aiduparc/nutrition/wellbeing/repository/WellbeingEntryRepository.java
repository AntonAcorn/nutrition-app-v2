package com.aiduparc.nutrition.wellbeing.repository;

import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WellbeingEntryRepository extends JpaRepository<WellbeingEntryEntity, UUID> {
}
