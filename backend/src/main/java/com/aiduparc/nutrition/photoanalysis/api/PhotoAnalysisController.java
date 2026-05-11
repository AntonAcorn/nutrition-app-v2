package com.aiduparc.nutrition.photoanalysis.api;

import com.aiduparc.nutrition.photoanalysis.application.AiAnalysisRateLimitService;
import com.aiduparc.nutrition.photoanalysis.application.PhotoUploadAnalysisService;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoUploadAnalysisRequest;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/photo-analysis")
public class PhotoAnalysisController {

    private static final long MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
    private static final int MAX_USER_NOTE_LENGTH = 500;
    private static final int MAX_LOCALE_LENGTH = 16;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif"
    );

    private final PhotoUploadAnalysisService photoUploadAnalysisService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;
    private final AiAnalysisRateLimitService rateLimitService;

    public PhotoAnalysisController(
            PhotoUploadAnalysisService photoUploadAnalysisService,
            CurrentNutritionUserResolver currentNutritionUserResolver,
            AiAnalysisRateLimitService rateLimitService
    ) {
        this.photoUploadAnalysisService = photoUploadAnalysisService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping(path = "/upload", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoUploadAnalysisResponse uploadAndAnalyze(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate,
            @RequestParam(required = false) String userNote,
            @RequestParam(required = false) String locale,
            @RequestParam("file") MultipartFile file,
            HttpSession session
    ) {
        validateUpload(file);

        try {
            LocalDate safeEntryDate = entryDate != null ? entryDate : LocalDate.now();
            UUID resolvedUserId = currentNutritionUserResolver.resolve(session);
            rateLimitService.checkAndConsume(resolvedUserId, AiAnalysisRateLimitService.Kind.PHOTO);
            return new PhotoUploadAnalysisResponse(photoUploadAnalysisService.analyzeAndCreateDraft(
                    new PhotoUploadAnalysisRequest(
                            resolvedUserId,
                            safeEntryDate,
                            file.getOriginalFilename(),
                            file.getContentType(),
                            file.getBytes(),
                            truncate(userNote, MAX_USER_NOTE_LENGTH),
                            truncate(locale, MAX_LOCALE_LENGTH)
                    )
            ));
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded file", exception);
        }
    }

    private static void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required");
        }
        if (file.getSize() > MAX_UPLOAD_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is too large");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG, WebP, or HEIC images are allowed");
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
