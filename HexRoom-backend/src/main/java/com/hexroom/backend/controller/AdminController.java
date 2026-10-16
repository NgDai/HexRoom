package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.common.PagedResponse;
import com.hexroom.backend.dto.auth.UserSummaryDto;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.entity.enums.UserStatus;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.RoomRepository;
import com.hexroom.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Quản trị hệ thống, phân quyền role và số liệu vận hành")
public class AdminController {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    public record RoleUpdateRequest(UserRole role) {}
    public record StatusUpdateRequest(UserStatus status) {}

    @GetMapping("/stats")
    @Operation(summary = "Lấy số liệu tổng quan hệ thống")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long totalUsers = userRepository.count();
        long totalRooms = roomRepository.count();

        Map<String, Object> stats = Map.of(
                "totalUsers", totalUsers,
                "totalRooms", totalRooms,
                "monthlyRevenue", 128500000L,
                "verifiedRatio", 94.8,
                "pendingInspections", 8,
                "activeReports", 2
        );
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/users")
    @Operation(summary = "Lấy danh sách người dùng phân trang")
    public ResponseEntity<ApiResponse<PagedResponse<UserSummaryDto>>> listUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "15") int limit) {

        int pageIndex = Math.max(0, page - 1);
        PageRequest pageable = PageRequest.of(pageIndex, limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<User> usersPage = (role != null) 
                ? userRepository.findByRole(role, pageable)
                : userRepository.findAll(pageable);

        Page<UserSummaryDto> dtoPage = usersPage.map(this::toDto);
        PagedResponse<UserSummaryDto> response = PagedResponse.fromPage(dtoPage);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/users/{id}/role")
    @Operation(summary = "Cập nhật Role cho người dùng")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateRole(
            @PathVariable UUID id,
            @RequestBody RoleUpdateRequest request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        user.setRole(request.role());
        User saved = userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("Đổi role thành công thành " + request.role(), toDto(saved)));
    }

    @PatchMapping("/users/{id}/status")
    @Operation(summary = "Cập nhật trạng thái người dùng (ACTIVE, BANNED, SUSPENDED)")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateStatus(
            @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        user.setStatus(request.status());
        User saved = userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("Đổi trạng thái tài khoản thành công", toDto(saved)));
    }

    private UserSummaryDto toDto(User u) {
        return UserSummaryDto.fromEntity(u);
    }
}
