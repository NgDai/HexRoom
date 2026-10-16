package com.hexroom.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.entity.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_role", columnList = "role")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    @Builder.Default
    private UserRole role = UserRole.TENANT;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "is_vip")
    @Builder.Default
    private Boolean isVip = false;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "vip_expires_at")
    private LocalDateTime vipExpiresAt;

    @Column(name = "is_identity_verified")
    @Builder.Default
    private Boolean isIdentityVerified = false;

    @Column(name = "identity_card_number", length = 30)
    private String identityCardNumber;

    @Column(name = "identity_card_issued_date")
    private String identityCardIssuedDate;

    @Column(name = "identity_card_issued_place", length = 150)
    private String identityCardIssuedPlace;

    @Column(name = "identity_card_front_url")
    private String identityCardFrontUrl;

    @Column(name = "identity_card_back_url")
    private String identityCardBackUrl;

    @Column(name = "phone_verified")
    @Builder.Default
    private Boolean phoneVerified = false;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "permanent_address")
    private String permanentAddress;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "identity_verified_at")
    private LocalDateTime identityVerifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private LifestyleProfile lifestyleProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserPreference preference;
}
