package com.hexroom.backend.dto.lifestyle;

import com.hexroom.backend.entity.UserPreference;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceDto {

    private UUID id;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private String preferredLocation;
    private String preferredGender;
    private BigDecimal lifestyleMatchWeight;
    private BigDecimal maxDistanceKm;
    private LocalDate moveInDateMin;
    private LocalDate moveInDateMax;
    private List<String> mustHaveAmenities;
    private List<String> preferredAmenities;
    private List<String> preferredDistricts;
    private Integer preferredLeaseMonths;
    private Integer preferredRoommateAgeMin;
    private Integer preferredRoommateAgeMax;
    private String roomType;
    private Integer safetyPriority;
    private Boolean transportNearby;
    private Boolean petFriendly;

    public static UserPreferenceDto fromEntity(UserPreference pref) {
        if (pref == null) return null;
        return UserPreferenceDto.builder()
                .id(pref.getId())
                .budgetMin(pref.getBudgetMin())
                .budgetMax(pref.getBudgetMax())
                .preferredLocation(pref.getPreferredLocation())
                .preferredGender(pref.getPreferredGender())
                .lifestyleMatchWeight(pref.getLifestyleMatchWeight())
                .maxDistanceKm(pref.getMaxDistanceKm())
                .moveInDateMin(pref.getMoveInDateMin())
                .moveInDateMax(pref.getMoveInDateMax())
                .mustHaveAmenities(pref.getMustHaveAmenities())
                .preferredAmenities(pref.getPreferredAmenities())
                .preferredDistricts(pref.getPreferredDistricts())
                .preferredLeaseMonths(pref.getPreferredLeaseMonths())
                .preferredRoommateAgeMin(pref.getPreferredRoommateAgeMin())
                .preferredRoommateAgeMax(pref.getPreferredRoommateAgeMax())
                .roomType(pref.getRoomType())
                .safetyPriority(pref.getSafetyPriority())
                .transportNearby(pref.getTransportNearby())
                .petFriendly(pref.getPetFriendly())
                .build();
    }
}
