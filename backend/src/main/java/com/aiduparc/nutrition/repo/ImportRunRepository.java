package com.aiduparc.nutrition.repo;

import com.aiduparc.nutrition.domain.ImportRun;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportRunRepository extends JpaRepository<ImportRun, UUID> {
    Optional<ImportRun> findBySourceChecksum(String sourceChecksum);
}
