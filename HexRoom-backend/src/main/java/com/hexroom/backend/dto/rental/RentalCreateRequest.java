package com.hexroom.backend.dto.rental;

import com.hexroom.backend.dto.location.LocationDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalCreateRequest {

    @NotBlank(message = "Tiêu đề bài đăng không được để trống")
    @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
    private String title;

    private String description;

    @Valid
    @NotNull(message = "Thông tin địa chỉ không được để trống")
    private LocationDto location;

    @Builder.Default
    private List<String> images = new ArrayList<>();
}
