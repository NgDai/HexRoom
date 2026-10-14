package com.hexroom.backend.dto.room;

import com.hexroom.backend.entity.RoomInspection.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record InspectionRequest(
        @NotNull Category category,
        @NotNull Result result,
        @NotNull @PastOrPresent LocalDate inspectedOn,
        LocalDate validUntil,
        @NotBlank @Size(max = 2000) String method,
        @NotBlank @Size(max = 4000) String findings,
        @NotNull @Size(max = 20) List<@NotBlank @Size(max = 2000) @Pattern(regexp = "https?://[^\\s]+", message = "Ảnh phải là đường dẫn HTTP/HTTPS") String> evidenceImages) {}
