package com.aiduparc.nutrition.aibudget;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiCostLedgerRepository extends JpaRepository<AiCostLedgerEntity, LocalDate> {

    @Query(value = "select cents_spent from ai_cost_ledger where day = :day", nativeQuery = true)
    Optional<Long> findCentsSpent(@Param("day") LocalDate day);

    /**
     * Atomic upsert: insert today's row or add to existing total. Uses Postgres
     * "on conflict" so two concurrent AI calls don't race on read-modify-write.
     */
    @Modifying
    @Query(value = """
            insert into ai_cost_ledger(day, cents_spent, updated_at)
            values (:day, :cents, now())
            on conflict (day) do update
              set cents_spent = ai_cost_ledger.cents_spent + excluded.cents_spent,
                  updated_at = now()
            """, nativeQuery = true)
    void addCost(@Param("day") LocalDate day, @Param("cents") long cents);
}
