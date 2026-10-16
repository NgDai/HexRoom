package com.hexroom.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyIdentityRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    @NotBlank(message = "Số CCCD không được để trống")
    private String identityCardNumber;

    private String dateOfBirth;
    private String identityCardIssuedDate;
    private String identityCardIssuedPlace;
    private String permanentAddress;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    private String email;
    private String identityCardFrontUrl;
    private String identityCardBackUrl;
}
