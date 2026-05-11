package com.aiduparc.nutrition.history.repository;

import com.aiduparc.nutrition.history.model.MealLogEntryEntity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MealLogEntryRepository extends JpaRepository<MealLogEntryEntity, UUID> {

    List<MealLogEntryEntity> findByUserIdAndEntryDateOrderByCreatedAtAsc(UUID userId, LocalDate entryDate);

    Optional<MealLogEntryEntity> findByIdAndUserId(UUID id, UUID userId);

    Optional<MealLogEntryEntity> findTopByUserIdAndEntryDateAndNameOrderByCreatedAtDesc(
        UUID userId, LocalDate entryDate, String name
    );

    void deleteByUserIdAndEntryDate(UUID userId, LocalDate entryDate);

    List<MealLogEntryEntity> findByUserIdAndCreatedAtAfter(UUID userId, OffsetDateTime after);

    List<MealLogEntryEntity> findByUserIdAndEntryDateBetweenOrderByCreatedAtAsc(
        UUID userId, LocalDate fromInclusive, LocalDate toInclusive);

    Optional<MealLogEntryEntity> findTopByUserIdAndCreatedAtBeforeOrderByCreatedAtDesc(UUID userId, OffsetDateTime before);

    @Query(value = """
        select
            name,
            round(avg(calories_kcal)::numeric, 0) as cal,
            round(avg(protein_g)::numeric, 1)    as prot,
            round(avg(fat_g)::numeric, 1)        as fat,
            round(avg(carbs_g)::numeric, 1)      as carb,
            round(avg(fiber_g)::numeric, 1)      as fib,
            count(*)                              as cnt
        from meal_log_entries
        where user_id = :userId
          and entry_date >= :since
          and length(trim(name)) > 0
        group by name
        order by cnt desc, max(created_at) desc
        limit :maxRows
        """, nativeQuery = true)
    List<Object[]> findFrequentMeals(
        @Param("userId") UUID userId,
        @Param("since") LocalDate since,
        @Param("maxRows") int maxRows
    );
}
