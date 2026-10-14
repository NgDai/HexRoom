package com.hexroom.backend.controller;

import com.hexroom.backend.common.*;
import com.hexroom.backend.entity.RoommateReport;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.RoommateConnectionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/roommates") @RequiredArgsConstructor
public class RoommateConnectionController {
    private final RoommateConnectionService service;
    public record InviteRequest(@NotNull UUID profileId, @Size(max = 500) String introduction) {}
    public record ActionRequest(@NotBlank @Pattern(regexp = "ACCEPT|DECLINE|CANCEL|END") String action) {}
    public record MessageRequest(@NotBlank @Size(max = 2000) String content, @NotNull UUID clientId) {}
    public record ReportRequest(@NotBlank @Size(max = 2000) String reason, Long messageId) {}
    public record ReviewRequest(@NotNull RoommateReport.Status status, @Size(max = 2000) String resolution) {}
    @GetMapping("/connections") public ApiResponse<PagedResponse<RoommateConnectionService.ConnectionView>> list(@AuthenticationPrincipal UserPrincipal user, @RequestParam(defaultValue = "1") int page) {
        return ApiResponse.success(service.list(user.getId(), page));
    }
    @GetMapping("/connections/{id}") public ApiResponse<RoommateConnectionService.ConnectionView> get(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(service.get(id, user.getId())); }
    @PostMapping("/connections") public ApiResponse<RoommateConnectionService.ConnectionView> invite(@AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody InviteRequest request) { return ApiResponse.success(service.invite(user.getId(), request.profileId(), request.introduction())); }
    @PatchMapping("/connections/{id}") public ApiResponse<RoommateConnectionService.ConnectionView> respond(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody ActionRequest request) { return ApiResponse.success(service.respond(id, user.getId(), request.action())); }
    @PutMapping("/connections/{id}/block") public ApiResponse<RoommateConnectionService.ConnectionView> block(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(service.block(id, user.getId(), true)); }
    @DeleteMapping("/connections/{id}/block") public ApiResponse<RoommateConnectionService.ConnectionView> unblock(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) { return ApiResponse.success(service.block(id, user.getId(), false)); }
    @GetMapping("/connections/{id}/messages") public ApiResponse<RoommateConnectionService.MessagePage> messages(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user, @RequestParam(required = false) Long before, @RequestParam(required = false) Long after) { return ApiResponse.success(service.history(id, user.getId(), before, after)); }
    @PostMapping("/connections/{id}/messages") public ApiResponse<RoommateConnectionService.MessageView> send(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody MessageRequest request) { return ApiResponse.success(service.send(id, user.getId(), request.content(), request.clientId())); }
    @PostMapping("/connections/{id}/reports") public ApiResponse<Map<String, UUID>> report(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody ReportRequest request) { return ApiResponse.success(Map.of("id", service.report(id, user.getId(), request.reason(), request.messageId()))); }
    @GetMapping("/reports") @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')") public ApiResponse<PagedResponse<RoommateConnectionService.ReportView>> reports(@RequestParam(defaultValue = "1") int page) { return ApiResponse.success(service.reportQueue(page)); }
    @PatchMapping("/reports/{id}") @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')") public ApiResponse<RoommateConnectionService.ReportView> review(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user, @Valid @RequestBody ReviewRequest request) { return ApiResponse.success(service.review(id, user.getId(), request.status(), request.resolution())); }
}
