package com.hexroom.backend;

import com.hexroom.backend.config.SecurityConfig;
import com.hexroom.backend.controller.*;
import com.hexroom.backend.dto.auth.*;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.*;
import com.hexroom.backend.security.*;
import com.hexroom.backend.service.*;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, RoomController.class, InspectionController.class}, properties = "app.cors.allowed-origins=http://localhost:5173")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class HexRoomApiSecurityTest {
    @Autowired MockMvc mvc;
    @MockBean AuthService auth;
    @MockBean RoomService rooms;
    @MockBean InspectionService inspections;
    @MockBean JwtTokenProvider tokens;
    @MockBean CustomUserDetailsService users;

    private UserPrincipal principal(UserRole role) { return UserPrincipal.create(User.builder().id(UUID.randomUUID()).email("test@example.test").role(role).status(UserStatus.ACTIVE).build()); }
    @Test void privateProfileAndManagedRoomsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/lifestyle")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/rooms/manage")).andExpect(status().isUnauthorized());
    }
    @Test void tenantCannotCreateInspectionOrApproveRoom() throws Exception {
        String id = UUID.randomUUID().toString();
        mvc.perform(patch("/api/rooms/" + id + "/status").with(user(principal(UserRole.TENANT))).contentType("application/json").content("{\"status\":\"AVAILABLE\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/rooms/" + id + "/inspections").with(user(principal(UserRole.LANDLORD))).contentType("application/json")
                .content("{\"category\":\"CONDITION\",\"result\":\"CHECKED\",\"inspectedOn\":\"2026-01-01\",\"validUntil\":\"2027-01-01\",\"method\":\"Observed\",\"findings\":\"Evidence\",\"evidenceImages\":[\"https://example.test/e.jpg\"]}"))
                .andExpect(status().isForbidden());
    }
    @Test void malformedStatusAndNegativeFeesReturn400() throws Exception {
        mvc.perform(patch("/api/rooms/" + UUID.randomUUID() + "/status").with(user(principal(UserRole.MODERATOR))).contentType("application/json").content("{\"status\":\"INVALID\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/rooms").with(user(principal(UserRole.LANDLORD))).contentType("application/json")
                .content("{\"rentalId\":\"" + UUID.randomUUID() + "\",\"price\":1000000,\"costs\":{\"deposit\":-1}}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors['costs.deposit']").exists());
    }
    @Test void refreshTokenCannotAuthenticateAsAccessToken() throws Exception {
        when(tokens.validateToken("refresh-test")).thenReturn(true);
        Claims claims = mock(Claims.class); when(claims.get("type", String.class)).thenReturn("refresh");
        when(tokens.getClaimsFromToken("refresh-test")).thenReturn(claims);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer refresh-test")).andExpect(status().isUnauthorized());
        verifyNoInteractions(users);
    }
    @Test void suspendedUserAccessTokenIsRejected() throws Exception {
        UUID id = UUID.randomUUID();
        when(tokens.validateToken("access-test")).thenReturn(true);
        Claims claims = mock(Claims.class); when(claims.get("type", String.class)).thenReturn("access");
        when(tokens.getClaimsFromToken("access-test")).thenReturn(claims); when(tokens.getUserIdFromToken("access-test")).thenReturn(id);
        when(users.loadUserById(id)).thenReturn(UserPrincipal.create(User.builder().id(id).role(UserRole.TENANT).status(UserStatus.SUSPENDED).build()));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer access-test")).andExpect(status().isUnauthorized());
    }
    @Test void loginReturnsNestedUserAndHttpOnlyCookieWithoutRefreshTokenInBody() throws Exception {
        when(auth.login(any(), any(), any())).thenReturn(AuthResponse.builder().accessToken("access").refreshToken("refresh-secret")
                .user(UserSummaryDto.builder().id(UUID.randomUUID()).fullName("Test").build()).build());
        mvc.perform(post("/api/auth/login").contentType("application/json").content("{\"email\":\"test@example.test\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").value("access"))
                .andExpect(jsonPath("$.data.user.fullName").value("Test"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(cookie().httpOnly("hexroom_refresh_token", true));
    }
}
