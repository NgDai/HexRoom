package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.room.*;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.InspectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/rooms/{roomId}/inspections") @RequiredArgsConstructor
public class InspectionController {
    private final InspectionService service;
    @GetMapping
    public ApiResponse<List<InspectionResponse>> list(@PathVariable UUID roomId, @AuthenticationPrincipal UserPrincipal viewer) {
        return ApiResponse.success(service.list(roomId, viewer));
    }
    @PostMapping @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'INSPECTOR')")
    public ApiResponse<InspectionResponse> record(@PathVariable UUID roomId, @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody InspectionRequest request) {
        return ApiResponse.success(service.record(roomId, user.getId(), request));
    }

    @PostMapping("/request") @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN', 'MODERATOR')")
    public ApiResponse<InspectionResponse> requestInspection(@PathVariable UUID roomId, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody InspectionApplicationRequest request) {
        return ApiResponse.success(service.requestInspection(roomId, user.getId(), request));
    }
}
