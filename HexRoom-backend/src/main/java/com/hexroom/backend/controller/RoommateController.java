package com.hexroom.backend.controller;
import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.room.RoommateProfileRequest;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.RoommateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping({"/api/roommates", "/api/roommate"}) @RequiredArgsConstructor
public class RoommateController {
    private final RoommateService service;
    @GetMapping("/profile") public ApiResponse<RoommateService.PublicProfile> mine(@AuthenticationPrincipal UserPrincipal user) {
        return ApiResponse.success(service.mine(user.getId()));
    }
    @PutMapping("/profile") public ApiResponse<RoommateService.PublicProfile> save(@AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody RoommateProfileRequest request) { return ApiResponse.success(service.save(user.getId(), request)); }
    @GetMapping("/suggestions") public ApiResponse<List<RoommateService.Suggestion>> suggestions(@AuthenticationPrincipal UserPrincipal user) {
        return ApiResponse.success(service.suggestions(user.getId()));
    }
    @GetMapping("/profile/{userId}")
    public ApiResponse<RoommateService.Suggestion> publicProfile(@PathVariable java.util.UUID userId) {
        return ApiResponse.success(service.getPublicProfile(userId));
    }
}
