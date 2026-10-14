package com.hexroom.backend.dto.room;

import com.hexroom.backend.entity.RoomInspection.Category;
import java.time.LocalDate;

public record InspectionApplicationRequest(
        Category category,
        LocalDate preferredDate,
        String preferredTimeSlot,
        String contactPhone,
        String notes
) {}
