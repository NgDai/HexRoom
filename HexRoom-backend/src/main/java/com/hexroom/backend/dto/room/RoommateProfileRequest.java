package com.hexroom.backend.dto.room;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
public record RoommateProfileRequest(
    @NotBlank @Size(max = 60) String nickname,
    @NotBlank @Size(max = 120) String city,
    @NotNull @DecimalMin("0") BigDecimal budgetMin,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal budgetMax,
    @NotNull LocalDate moveInDate,
    boolean smoking, boolean hasPets, boolean acceptSmoking, boolean acceptPets, boolean visible,
    @NotBlank @Pattern(regexp = "EARLY|LATE|FLEXIBLE") String sleepSchedule,
    @AssertTrue(message = "Tính năng thử nghiệm dành cho người từ 18 tuổi. Cần xác nhận trước khi tham gia.") boolean adultConfirmed) {}
