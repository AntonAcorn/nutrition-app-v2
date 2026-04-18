package com.aiduparc.nutrition.photoanalysis.api;

import com.aiduparc.nutrition.photoanalysis.application.PhotoAnalysisService;
import com.aiduparc.nutrition.photoanalysis.application.PhotoUploadAnalysisService;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisResponse;
import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoUploadAnalysisRequest;
import com.aiduparc.nutrition.security.service.CurrentNutritionUserResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    private final PhotoAnalysisService photoAnalysisService;
    private final PhotoUploadAnalysisService photoUploadAnalysisService;
    private final CurrentNutritionUserResolver currentNutritionUserResolver;

    public PhotoAnalysisController(
            PhotoAnalysisService photoAnalysisService,
            PhotoUploadAnalysisService photoUploadAnalysisService,
            CurrentNutritionUserResolver currentNutritionUserResolver
    ) {
        this.photoAnalysisService = photoAnalysisService;
        this.photoUploadAnalysisService = photoUploadAnalysisService;
        this.currentNutritionUserResolver = currentNutritionUserResolver;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public PhotoAnalysisResponse analyze(@Valid @RequestBody PhotoAnalysisRequest request) {
        return photoAnalysisService.analyze(request);
    }

    @PostMapping(path = "/upload", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoUploadAnalysisResponse uploadAndAnalyze(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String entryDate,
            @RequestParam(required = false) String userNote,
            @RequestParam(required = false) String locale,
            @RequestParam("file") MultipartFile file,
            HttpSession session
    ) {
        validateUpload(file);

        try {
            LocalDate safeEntryDate = StringUtils.hasText(entryDate) ? LocalDate.parse(entryDate) : LocalDate.now();
            UUID resolvedUserId = currentNutritionUserResolver.resolve(session, userId);
            return new PhotoUploadAnalysisResponse(photoUploadAnalysisService.analyzeAndCreateDraft(
                    new PhotoUploadAnalysisRequest(
                            resolvedUserId,
                            safeEntryDate,
                            file.getOriginalFilename(),
                            file.getContentType(),
                            file.getBytes(),
                            userNote,
                            locale
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
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image uploads are supported");
        }
    }
}
