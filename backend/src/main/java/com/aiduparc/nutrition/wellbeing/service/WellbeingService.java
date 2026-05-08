package com.aiduparc.nutrition.wellbeing.service;

import com.aiduparc.nutrition.wellbeing.model.WellbeingEntryEntity;
import com.aiduparc.nutrition.wellbeing.repository.WellbeingEntryRepository;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WellbeingService {

    private static final Logger log = LoggerFactory.getLogger(WellbeingService.class);

    private final WellbeingEntryRepository entryRepository;

    public WellbeingService(WellbeingEntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    @Transactional
    public void saveRating(UUID userId, int rating) {
        WellbeingEntryEntity entry = new WellbeingEntryEntity();
        entry.setUserId(userId);
        entry.setRating(rating);
        entry.setEntryDate(LocalDate.now(ZoneOffset.UTC));
        entryRepository.save(entry);
        log.info("wellbeing rating saved userId={} rating={}", userId, rating);
    }
}
