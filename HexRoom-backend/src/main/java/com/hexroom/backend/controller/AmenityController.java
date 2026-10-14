package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.amenity.AmenityDto;
import com.hexroom.backend.service.AmenityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/amenities")
@RequiredArgsConstructor
@Tag(name = "Amenities", description = "Quản lý danh mục tiện ích phòng trọ")
public class AmenityController {

    private final AmenityService amenityService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tiện ích")
    public ResponseEntity<ApiResponse<List<AmenityDto>>> getAllAmenities() {
        List<AmenityDto> amenities = amenityService.getAllAmenities();
        return ResponseEntity.ok(ApiResponse.success(amenities));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết một tiện ích")
    public ResponseEntity<ApiResponse<AmenityDto>> getAmenity(@PathVariable UUID id) {
        AmenityDto amenity = amenityService.getAmenityById(id);
        return ResponseEntity.ok(ApiResponse.success(amenity));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Thêm mới một tiện ích (Chỉ dành cho Admin)")
    public ResponseEntity<ApiResponse<AmenityDto>> createAmenity(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        AmenityDto created = amenityService.createAmenity(name);
        return new ResponseEntity<>(ApiResponse.success("Thêm tiện ích thành công", created), HttpStatus.CREATED);
    }
}
