package com.aiduparc.nutrition.photoanalysis.draft.repository;

import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoAnalysisDraftRepository extends JpaRepository<PhotoAnalysisDraftEntity, UUID> {
    Optional<PhotoAnalysisDraftEntity> findById(UUID id);
}

