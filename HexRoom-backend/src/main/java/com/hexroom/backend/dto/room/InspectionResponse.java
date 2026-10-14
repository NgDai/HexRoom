package com.hexroom.backend.dto.room;

import com.hexroom.backend.entity.RoomInspection;
import com.hexroom.backend.entity.RoomInspection.*;
import java.time.*;
import java.util.*;

public record InspectionResponse(UUID id, Category category, Result result, Result currentResult,
        LocalDate inspectedOn, LocalDate validUntil, String method, String findings,
        List<String> evidenceImages, LocalDateTime recordedAt) {
    public static InspectionResponse fromEntity(RoomInspection item) {
        Result current = item.getResult();
        boolean informationChanged = item.getRoom() != null && item.getRoom().getInformationChangedAt() != null
                && item.getRoom().getInformationChangedAt().isAfter(item.getRecordedAt());
        if (current == Result.CHECKED && (informationChanged || (item.getValidUntil() != null && item.getValidUntil().isBefore(LocalDate.now())))) {
            current = Result.NEEDS_UPDATE;
        }
        return new InspectionResponse(item.getId(), item.getCategory(), item.getResult(), current,
                item.getInspectedOn(), item.getValidUntil(), item.getMethod(), item.getFindings(),
                List.copyOf(item.getEvidenceImages()), item.getRecordedAt());
    }
}
