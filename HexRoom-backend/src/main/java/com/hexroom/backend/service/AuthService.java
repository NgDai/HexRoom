package com.hexroom.backend.service;

import com.hexroom.backend.dto.auth.*;
import com.hexroom.backend.dto.lifestyle.LifestyleProfileDto;
import com.hexroom.backend.dto.lifestyle.UserPreferenceDto;
import com.hexroom.backend.entity.LifestyleProfile;
import com.hexroom.backend.entity.RefreshToken;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.UserPreference;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.entity.enums.UserStatus;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.exception.UnauthorizedException;
import com.hexroom.backend.repository.LifestyleProfileRepository;
import com.hexroom.backend.repository.RefreshTokenRepository;
import com.hexroom.backend.repository.UserPreferenceRepository;
import com.hexroom.backend.repository.UserRepository;
import com.hexroom.backend.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LifestyleProfileRepository lifestyleProfileRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public UserSummaryDto register(RegisterRequest request) {
        if (request.getRole() != null && request.getRole() != UserRole.TENANT && request.getRole() != UserRole.LANDLORD) {
            throw new BadRequestException("Chỉ có thể đăng ký tài khoản người thuê hoặc chủ trọ");
        }
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Email đã được sử dụng", "EMAIL_EXISTS");
        }

        if (request.getConfirmPassword() != null && !request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp", "PASSWORD_MISMATCH");
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .role(request.getRole() != null ? request.getRole() : UserRole.TENANT)
                .status(UserStatus.ACTIVE)
                .isVip(false)
                .build();

        User savedUser = userRepository.save(user);
        return UserSummaryDto.fromEntity(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String userAgent, String ipAddress) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Tài khoản đã bị khóa hoặc tạm ngưng", "ACCOUNT_LOCKED");
        }

        String accessToken = tokenProvider.generateAccessToken(user);
        String refreshToken = issueRefreshToken(user, userAgent, ipAddress);

        return AuthResponse.builder()
                .token(accessToken)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserSummaryDto.fromEntity(user))
                .build();
    }

    @Transactional
    public AuthResponse refreshSession(String rawRefreshToken, String userAgent, String ipAddress) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Refresh token không được để trống", "REFRESH_INVALID");
        }

        if (!tokenProvider.validateToken(rawRefreshToken)) {
            throw new UnauthorizedException("Refresh token không hợp lệ hoặc đã hết hạn", "REFRESH_INVALID");
        }

        Claims claims = tokenProvider.getClaimsFromToken(rawRefreshToken);
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new UnauthorizedException("Sai loại token", "REFRESH_INVALID");
        }
        String tokenIdStr = claims.get("tokenId", String.class);
        if (tokenIdStr == null) {
            throw new UnauthorizedException("Refresh token không hợp lệ", "REFRESH_INVALID");
        }

        UUID tokenId = UUID.fromString(tokenIdStr);
        String tokenHash = JwtTokenProvider.hashToken(rawRefreshToken);

        RefreshToken current = refreshTokenRepository.findById(tokenId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ", "REFRESH_REVOKED"));

        if (Boolean.TRUE.equals(current.getIsRevoked())
                || !current.getTokenHash().equals(tokenHash)
                || current.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ", "REFRESH_REVOKED");
        }

        User user = current.getUser();
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Tài khoản không tồn tại hoặc đã bị khóa", "USER_INACTIVE");
        }

        // Revoke the old token
        current.setIsRevoked(true);
        current.setLastUsedAt(LocalDateTime.now());
        refreshTokenRepository.save(current);

        // Issue new pair
        String newAccessToken = tokenProvider.generateAccessToken(user);
        String newRefreshToken = issueRefreshToken(user, userAgent, ipAddress);

        return AuthResponse.builder()
                .token(newAccessToken)
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .user(UserSummaryDto.fromEntity(user))
                .build();
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        try {
            Claims claims = tokenProvider.getClaimsFromToken(rawRefreshToken);
            String tokenIdStr = claims.get("tokenId", String.class);
            if (tokenIdStr != null) {
                refreshTokenRepository.revokeById(UUID.fromString(tokenIdStr));
            }
        } catch (Exception ex) {
            log.warn("Logout token parsing failed: {}", ex.getMessage());
        }
    }

    @Transactional
    public void logoutAll(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác", "WRONG_PASSWORD");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu mới và mật khẩu xác nhận không khớp", "PASSWORD_MISMATCH");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Revoke all existing sessions for security
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getProfile(UUID userId) {
        return UserSummaryDto.fromEntity(userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId)));
    }

    @Transactional
    public UserSummaryDto updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().isBlank() ? null : request.getPhone().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().isBlank() ? null : request.getAvatarUrl().trim());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender().isBlank() ? null : request.getGender().trim());
        }

        User updatedUser = userRepository.save(user);
        return UserSummaryDto.fromEntity(updatedUser);
    }

    @Transactional(readOnly = true)
    public LifestyleProfileDto getLifestyle(UUID userId) {
        return lifestyleProfileRepository.findByUserId(userId)
                .map(LifestyleProfileDto::fromEntity)
                .orElse(null);
    }

    @Transactional
    public LifestyleProfileDto upsertLifestyle(UUID userId, LifestyleProfileDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        LifestyleProfile profile = lifestyleProfileRepository.findByUserId(userId)
                .orElseGet(() -> LifestyleProfile.builder().user(user).build());

        if (dto.getSmoking() != null) profile.setSmoking(dto.getSmoking());
        if (dto.getDrinking() != null) profile.setDrinking(dto.getDrinking());
        if (dto.getPetsAllowed() != null) profile.setPetsAllowed(dto.getPetsAllowed());
        if (dto.getSleepSchedule() != null) profile.setSleepSchedule(dto.getSleepSchedule());
        if (dto.getPersonalityType() != null) profile.setPersonalityType(dto.getPersonalityType());
        if (dto.getBedtime() != null) profile.setBedtime(dto.getBedtime());
        if (dto.getCleanliness() != null) profile.setCleanliness(dto.getCleanliness());
        if (dto.getCookingFrequency() != null) profile.setCookingFrequency(dto.getCookingFrequency());
        if (dto.getGuestFrequency() != null) profile.setGuestFrequency(dto.getGuestFrequency());
        if (dto.getInterests() != null) profile.setInterests(dto.getInterests());
        if (dto.getLanguages() != null) profile.setLanguages(dto.getLanguages());
        if (dto.getMoveInDate() != null) profile.setMoveInDate(dto.getMoveInDate());
        if (dto.getNoiseTolerance() != null) profile.setNoiseTolerance(dto.getNoiseTolerance());
        if (dto.getOccupationType() != null) profile.setOccupationType(dto.getOccupationType());
        if (dto.getPreferredLeaseMonths() != null) profile.setPreferredLeaseMonths(dto.getPreferredLeaseMonths());
        if (dto.getQuietHoursPreference() != null) profile.setQuietHoursPreference(dto.getQuietHoursPreference());
        if (dto.getSocialLevel() != null) profile.setSocialLevel(dto.getSocialLevel());
        if (dto.getTemperaturePreference() != null) profile.setTemperaturePreference(dto.getTemperaturePreference());
        if (dto.getWakeTime() != null) profile.setWakeTime(dto.getWakeTime());
        if (dto.getWorkFromHome() != null) profile.setWorkFromHome(dto.getWorkFromHome());
        if (dto.getDealBreakers() != null) profile.setDealBreakers(dto.getDealBreakers());

        LifestyleProfile saved = lifestyleProfileRepository.save(profile);
        return LifestyleProfileDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public UserPreferenceDto getPreference(UUID userId) {
        return userPreferenceRepository.findByUserId(userId)
                .map(UserPreferenceDto::fromEntity)
                .orElse(null);
    }

    @Transactional
    public UserPreferenceDto upsertPreference(UUID userId, UserPreferenceDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        UserPreference pref = userPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> UserPreference.builder().user(user).build());

        if (dto.getBudgetMin() != null) pref.setBudgetMin(dto.getBudgetMin());
        if (dto.getBudgetMax() != null) pref.setBudgetMax(dto.getBudgetMax());
        if (dto.getPreferredLocation() != null) pref.setPreferredLocation(dto.getPreferredLocation());
        if (dto.getPreferredGender() != null) pref.setPreferredGender(dto.getPreferredGender());
        if (dto.getLifestyleMatchWeight() != null) pref.setLifestyleMatchWeight(dto.getLifestyleMatchWeight());
        if (dto.getMaxDistanceKm() != null) pref.setMaxDistanceKm(dto.getMaxDistanceKm());
        if (dto.getMoveInDateMin() != null) pref.setMoveInDateMin(dto.getMoveInDateMin());
        if (dto.getMoveInDateMax() != null) pref.setMoveInDateMax(dto.getMoveInDateMax());
        if (dto.getMustHaveAmenities() != null) pref.setMustHaveAmenities(dto.getMustHaveAmenities());
        if (dto.getPreferredAmenities() != null) pref.setPreferredAmenities(dto.getPreferredAmenities());
        if (dto.getPreferredDistricts() != null) pref.setPreferredDistricts(dto.getPreferredDistricts());
        if (dto.getPreferredLeaseMonths() != null) pref.setPreferredLeaseMonths(dto.getPreferredLeaseMonths());
        if (dto.getPreferredRoommateAgeMin() != null) pref.setPreferredRoommateAgeMin(dto.getPreferredRoommateAgeMin());
        if (dto.getPreferredRoommateAgeMax() != null) pref.setPreferredRoommateAgeMax(dto.getPreferredRoommateAgeMax());
        if (dto.getRoomType() != null) pref.setRoomType(dto.getRoomType());
        if (dto.getSafetyPriority() != null) pref.setSafetyPriority(dto.getSafetyPriority());
        if (dto.getTransportNearby() != null) pref.setTransportNearby(dto.getTransportNearby());
        if (dto.getPetFriendly() != null) pref.setPetFriendly(dto.getPetFriendly());

        UserPreference saved = userPreferenceRepository.save(pref);
        return UserPreferenceDto.fromEntity(saved);
    }

    public String suggestPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghjkmnpqrstuvwxyz";
        String numbers = "23456789";
        String special = "!@#$%&*";
        String all = upper + lower + numbers + special;

        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();

        sb.append(upper.charAt(random.nextInt(upper.length())));
        sb.append(lower.charAt(random.nextInt(lower.length())));
        sb.append(numbers.charAt(random.nextInt(numbers.length())));
        sb.append(special.charAt(random.nextInt(special.length())));

        for (int i = 0; i < 8; i++) {
            sb.append(all.charAt(random.nextInt(all.length())));
        }

        // Shuffle characters
        List<Character> chars = new ArrayList<>();
        for (char c : sb.toString().toCharArray()) {
            chars.add(c);
        }
        Collections.shuffle(chars, random);

        StringBuilder result = new StringBuilder();
        for (char c : chars) {
            result.append(c);
        }
        return result.toString();
    }

    private String issueRefreshToken(User user, String userAgent, String ipAddress) {
        UUID tokenId = UUID.randomUUID();
        String token = tokenProvider.generateRefreshToken(user, tokenId);

        RefreshToken refreshToken = RefreshToken.builder()
                .id(tokenId)
                .user(user)
                .tokenHash(JwtTokenProvider.hashToken(token))
                .isRevoked(false)
                .expiresAt(tokenProvider.getExpirationFromToken(token))
                .userAgent(userAgent != null ? userAgent.substring(0, Math.min(userAgent.length(), 500)) : null)
                .ipAddress(ipAddress != null ? ipAddress.substring(0, Math.min(ipAddress.length(), 45)) : null)
                .build();

        refreshTokenRepository.save(refreshToken);
        return token;
    }

    @Transactional
    public UserSummaryDto verifyIdentity(UUID userId, VerifyIdentityRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setFullName(req.getFullName().trim());
        user.setIdentityCardNumber(req.getIdentityCardNumber().trim());
        user.setPhone(req.getPhone().trim());
        user.setPhoneVerified(true);
        user.setEmailVerified(true);
        user.setIsIdentityVerified(true);
        user.setIdentityVerifiedAt(LocalDateTime.now());
        if (req.getPermanentAddress() != null) user.setPermanentAddress(req.getPermanentAddress().trim());
        if (req.getDateOfBirth() != null) user.setDateOfBirth(req.getDateOfBirth().trim());
        if (req.getIdentityCardIssuedDate() != null) user.setIdentityCardIssuedDate(req.getIdentityCardIssuedDate().trim());
        if (req.getIdentityCardIssuedPlace() != null) user.setIdentityCardIssuedPlace(req.getIdentityCardIssuedPlace().trim());
        if (req.getIdentityCardFrontUrl() != null) user.setIdentityCardFrontUrl(req.getIdentityCardFrontUrl().trim());
        if (req.getIdentityCardBackUrl() != null) user.setIdentityCardBackUrl(req.getIdentityCardBackUrl().trim());

        User saved = userRepository.save(user);
        log.info("Chủ trọ {} đã xác thực CCCD {} thành công", saved.getEmail(), saved.getIdentityCardNumber());
        return UserSummaryDto.fromEntity(saved);
    }
}
