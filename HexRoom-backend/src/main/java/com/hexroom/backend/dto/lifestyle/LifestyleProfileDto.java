package com.hexroom.backend.dto.lifestyle;

import com.hexroom.backend.entity.LifestyleProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LifestyleProfileDto {

    private UUID id;
    private Boolean smoking;
    private Boolean drinking;
    private Boolean petsAllowed;
    private String sleepSchedule;
    private String personalityType;
    private String bedtime;
    private String cleanliness;
    private String cookingFrequency;
    private String guestFrequency;
    private List<String> interests;
    private List<String> languages;
    private LocalDate moveInDate;
    private String noiseTolerance;
    private String occupationType;
    private Integer preferredLeaseMonths;
    private String quietHoursPreference;
    private String socialLevel;
    private String temperaturePreference;
    private String wakeTime;
    private Boolean workFromHome;
    private String dealBreakers;

    public static LifestyleProfileDto fromEntity(LifestyleProfile profile) {
        if (profile == null) return null;
        return LifestyleProfileDto.builder()
                .id(profile.getId())
                .smoking(profile.getSmoking())
                .drinking(profile.getDrinking())
                .petsAllowed(profile.getPetsAllowed())
                .sleepSchedule(profile.getSleepSchedule())
                .personalityType(profile.getPersonalityType())
                .bedtime(profile.getBedtime())
                .cleanliness(profile.getCleanliness())
                .cookingFrequency(profile.getCookingFrequency())
                .guestFrequency(profile.getGuestFrequency())
                .interests(profile.getInterests())
                .languages(profile.getLanguages())
                .moveInDate(profile.getMoveInDate())
                .noiseTolerance(profile.getNoiseTolerance())
                .occupationType(profile.getOccupationType())
                .preferredLeaseMonths(profile.getPreferredLeaseMonths())
                .quietHoursPreference(profile.getQuietHoursPreference())
                .socialLevel(profile.getSocialLevel())
                .temperaturePreference(profile.getTemperaturePreference())
                .wakeTime(profile.getWakeTime())
                .workFromHome(profile.getWorkFromHome())
                .dealBreakers(profile.getDealBreakers())
                .build();
    }
}
