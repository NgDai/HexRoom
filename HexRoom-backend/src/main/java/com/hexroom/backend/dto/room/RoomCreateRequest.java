package com.hexroom.backend.dto.room;

import com.hexroom.backend.entity.enums.RoomType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomCreateRequest {

    @NotNull(message = "ID bài đăng (rentalId) không được để trống")
    private UUID rentalId;

    @Size(max = 100, message = "Tên phòng không được quá 100 ký tự")
    private String roomName;

    @Builder.Default
    private RoomType roomType = RoomType.PRIVATE;

    @NotNull(message = "Giá phòng không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá phòng phải lớn hơn 0")
    private BigDecimal price;

    @DecimalMin(value = "0", inclusive = false)
    private BigDecimal sizeM2;

    @Builder.Default
    @jakarta.validation.constraints.Min(1)
    private Integer maxPeople = 1;

    private String description;

    @jakarta.validation.Valid
    private com.hexroom.backend.entity.RoomCosts costs;

    @Builder.Default
    private List<@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Pattern(regexp = "https?://[^\\s]+") String> images = new ArrayList<>();

    @Builder.Default
    private List<String> amenities = new ArrayList<>();
}
