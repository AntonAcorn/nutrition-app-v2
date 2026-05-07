package com.aiduparc.nutrition.calorieBank.repository;

import com.aiduparc.nutrition.calorieBank.model.RelaxDayEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelaxDayRepository extends JpaRepository<RelaxDayEntity, UUID> {

    Optional<RelaxDayEntity> findByUserIdAndRelaxDate(UUID userId, LocalDate relaxDate);

    List<RelaxDayEntity> findByUserIdAndRelaxDateBetween(UUID userId, LocalDate start, LocalDate end);

    long countByUserIdAndRelaxDateBetween(UUID userId, LocalDate start, LocalDate end);

    void deleteByUserIdAndRelaxDate(UUID userId, LocalDate relaxDate);
}
