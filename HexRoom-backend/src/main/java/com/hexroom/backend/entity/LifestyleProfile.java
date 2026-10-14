package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lifestyle_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LifestyleProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "smoking")
    @Builder.Default
    private Boolean smoking = false;

    @Column(name = "drinking")
    @Builder.Default
    private Boolean drinking = false;

    @Column(name = "pets_allowed")
    @Builder.Default
    private Boolean petsAllowed = false;

    @Column(name = "sleep_schedule", length = 50)
    private String sleepSchedule;

    @Column(name = "personality_type", length = 50)
    private String personalityType;

    @Column(name = "bedtime", length = 50)
    private String bedtime;

    @Column(name = "cleanliness", length = 50)
    private String cleanliness;

    @Column(name = "cooking_frequency", length = 50)
    private String cookingFrequency;

    @Column(name = "guest_frequency", length = 50)
    private String guestFrequency;

    @ElementCollection
    @CollectionTable(name = "lifestyle_interests", joinColumns = @JoinColumn(name = "lifestyle_id"))
    @Column(name = "interest")
    @Builder.Default
    private List<String> interests = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "lifestyle_languages", joinColumns = @JoinColumn(name = "lifestyle_id"))
    @Column(name = "language")
    @Builder.Default
    private List<String> languages = new ArrayList<>();

    @Column(name = "move_in_date")
    private LocalDate moveInDate;

    @Column(name = "noise_tolerance", length = 50)
    private String noiseTolerance;

    @Column(name = "occupation_type", length = 50)
    private String occupationType;

    @Column(name = "preferred_lease_months")
    private Integer preferredLeaseMonths;

    @Column(name = "quiet_hours_preference", length = 30)
    private String quietHoursPreference;

    @Column(name = "social_level", length = 50)
    private String socialLevel;

    @Column(name = "temperature_preference", length = 20)
    private String temperaturePreference;

    @Column(name = "wake_time", length = 50)
    private String wakeTime;

    @Column(name = "work_from_home")
    @Builder.Default
    private Boolean workFromHome = false;

    @Column(name = "deal_breakers", length = 500)
    private String dealBreakers;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
