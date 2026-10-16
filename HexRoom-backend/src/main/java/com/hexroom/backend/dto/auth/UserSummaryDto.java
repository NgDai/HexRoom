package com.hexroom.backend.dto.auth;

import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.entity.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {

    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private UserRole role;
    private UserStatus status;
    private Boolean isVip;
    private String gender;
    private Boolean isIdentityVerified;
    private String identityCardNumber;
    private String identityCardFrontUrl;
    private String identityCardBackUrl;
    private Boolean phoneVerified;
    private Boolean emailVerified;
    private String permanentAddress;
    private String dateOfBirth;

    public static UserSummaryDto fromEntity(User user) {
        if (user == null) return null;
        return UserSummaryDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .status(user.getStatus())
                .isVip(user.getIsVip())
                .gender(user.getGender())
                .isIdentityVerified(user.getIsIdentityVerified())
                .identityCardNumber(user.getIdentityCardNumber())
                .identityCardFrontUrl(user.getIdentityCardFrontUrl())
                .identityCardBackUrl(user.getIdentityCardBackUrl())
                .phoneVerified(user.getPhoneVerified())
                .emailVerified(user.getEmailVerified())
                .permanentAddress(user.getPermanentAddress())
                .dateOfBirth(user.getDateOfBirth())
                .build();
    }
}
