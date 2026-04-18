package com.aiduparc.nutrition.photoanalysis.draft.repository;

import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftEntity;
import java.util.Optional;
import java.util.UUID;

import com.aiduparc.nutrition.photoanalysis.draft.model.PhotoAnalysisDraftStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoAnalysisDraftRepository extends JpaRepository<PhotoAnalysisDraftEntity, UUID> {
    Optional<PhotoAnalysisDraftEntity> findById(UUID id);
    Optional<PhotoAnalysisDraftEntity> findByIdAndUserId(UUID id, UUID userId);
    Optional<PhotoAnalysisDraftEntity> findTopByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, PhotoAnalysisDraftStatus status);
}

