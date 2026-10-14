package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.auth.*;
import com.hexroom.backend.dto.lifestyle.LifestyleProfileDto;
import com.hexroom.backend.dto.lifestyle.UserPreferenceDto;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Xác thực, phân quyền và quản lý tài khoản")
public class AuthController {

    private final AuthService authService;

    @Value("${app.jwt.cookie-name:hexroom_refresh_token}")
    private String refreshTokenCookieName;

    @Value("${app.jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenMaxAgeMs;

    @Value("${app.jwt.cookie-secure:false}")
    private boolean cookieSecure;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryDto>> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(authService.getProfile(principal.getId())));
    }

    @GetMapping("/suggest-password")
    @Operation(summary = "Gợi ý mật khẩu mạnh")
    public ResponseEntity<ApiResponse<Map<String, String>>> suggestPassword() {
        String password = authService.suggestPassword();
        return ResponseEntity.ok(ApiResponse.success("Gợi ý mật khẩu", Map.of("password", password)));
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới")
    public ResponseEntity<ApiResponse<UserSummaryDto>> register(@Valid @RequestBody RegisterRequest request) {
        UserSummaryDto user = authService.register(request);
        return new ResponseEntity<>(ApiResponse.success("Đăng ký thành công", user), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request,
                                                           HttpServletRequest httpRequest,
                                                           HttpServletResponse httpResponse) {
        String userAgent = httpRequest.getHeader("User-Agent");
        String ipAddress = httpRequest.getRemoteAddr();

        AuthResponse authResponse = authService.login(request, userAgent, ipAddress);

        // Set refresh token in HttpOnly cookie
        ResponseCookie cookie = ResponseCookie.from(refreshTokenCookieName, authResponse.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(refreshTokenMaxAgeMs / 1000)
                .sameSite("Lax")
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", authResponse));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới access token từ refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshSession(
            @RequestBody(required = false) TokenRefreshRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String refreshToken = null;
        if (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            refreshToken = request.getRefreshToken();
        } else if (httpRequest.getCookies() != null) {
            for (Cookie c : httpRequest.getCookies()) {
                if (refreshTokenCookieName.equals(c.getName())) {
                    refreshToken = c.getValue();
                    break;
                }
            }
        }

        String userAgent = httpRequest.getHeader("User-Agent");
        String ipAddress = httpRequest.getRemoteAddr();

        AuthResponse authResponse = authService.refreshSession(refreshToken, userAgent, ipAddress);

        // Set new refresh token cookie
        ResponseCookie cookie = ResponseCookie.from(refreshTokenCookieName, authResponse.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(refreshTokenMaxAgeMs / 1000)
                .sameSite("Lax")
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Làm mới token thành công", authResponse));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất khỏi thiết bị hiện tại")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) TokenRefreshRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String refreshToken = null;
        if (request != null && request.getRefreshToken() != null) {
            refreshToken = request.getRefreshToken();
        } else if (httpRequest.getCookies() != null) {
            for (Cookie c : httpRequest.getCookies()) {
                if (refreshTokenCookieName.equals(c.getName())) {
                    refreshToken = c.getValue();
                    break;
                }
            }
        }

        authService.logout(refreshToken);

        // Clear cookie
        ResponseCookie cookie = ResponseCookie.from(refreshTokenCookieName, "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công"));
    }

    @PostMapping("/logout-all")
    @Operation(summary = "Đăng xuất khỏi tất cả các thiết bị")
    public ResponseEntity<ApiResponse<Void>> logoutAll(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                       HttpServletResponse httpResponse) {
        authService.logoutAll(userPrincipal.getId());

        ResponseCookie cookie = ResponseCookie.from(refreshTokenCookieName, "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Đã đăng xuất khỏi tất cả thiết bị"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu")
    public ResponseEntity<ApiResponse<Void>> changePassword(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật thông tin cá nhân")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateProfile(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                                     @Valid @RequestBody UpdateProfileRequest request) {
        UserSummaryDto updated = authService.updateProfile(userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin thành công", updated));
    }

    @GetMapping("/lifestyle")
    @Operation(summary = "Lấy thông tin phong cách sống (lifestyle)")
    public ResponseEntity<ApiResponse<LifestyleProfileDto>> getLifestyle(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        LifestyleProfileDto profile = authService.getLifestyle(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/lifestyle")
    @Operation(summary = "Cập nhật thông tin phong cách sống")
    public ResponseEntity<ApiResponse<LifestyleProfileDto>> upsertLifestyle(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                                            @RequestBody LifestyleProfileDto dto) {
        LifestyleProfileDto profile = authService.upsertLifestyle(userPrincipal.getId(), dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lối sống thành công", profile));
    }

    @GetMapping("/preference")
    @Operation(summary = "Lấy tiêu chí tìm kiếm phòng / bạn cùng phòng")
    public ResponseEntity<ApiResponse<UserPreferenceDto>> getPreference(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        UserPreferenceDto pref = authService.getPreference(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(pref));
    }

    @PutMapping("/preference")
    @Operation(summary = "Cập nhật tiêu chí tìm kiếm phòng")
    public ResponseEntity<ApiResponse<UserPreferenceDto>> upsertPreference(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                                           @RequestBody UserPreferenceDto dto) {
        UserPreferenceDto pref = authService.upsertPreference(userPrincipal.getId(), dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tiêu chí thành công", pref));
    }
}
