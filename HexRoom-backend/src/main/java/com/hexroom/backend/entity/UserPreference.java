package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "budget_min", precision = 12, scale = 2)
    private BigDecimal budgetMin;

    @Column(name = "budget_max", precision = 12, scale = 2)
    private BigDecimal budgetMax;

    @Column(name = "preferred_location")
    private String preferredLocation;

    @Column(name = "preferred_gender", length = 20)
    private String preferredGender;

    @Column(name = "lifestyle_match_weight", precision = 3, scale = 2)
    private BigDecimal lifestyleMatchWeight;

    @Column(name = "max_distance_km", precision = 6, scale = 2)
    private BigDecimal maxDistanceKm;

    @Column(name = "move_in_date_min")
    private LocalDate moveInDateMin;

    @Column(name = "move_in_date_max")
    private LocalDate moveInDateMax;

    @ElementCollection
    @CollectionTable(name = "user_pref_must_have_amenities", joinColumns = @JoinColumn(name = "pref_id"))
    @Column(name = "amenity")
    @Builder.Default
    private List<String> mustHaveAmenities = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "user_pref_preferred_amenities", joinColumns = @JoinColumn(name = "pref_id"))
    @Column(name = "amenity")
    @Builder.Default
    private List<String> preferredAmenities = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "user_pref_preferred_districts", joinColumns = @JoinColumn(name = "pref_id"))
    @Column(name = "district")
    @Builder.Default
    private List<String> preferredDistricts = new ArrayList<>();

    @Column(name = "preferred_lease_months")
    private Integer preferredLeaseMonths;

    @Column(name = "preferred_roommate_age_min")
    private Integer preferredRoommateAgeMin;

    @Column(name = "preferred_roommate_age_max")
    private Integer preferredRoommateAgeMax;

    @Column(name = "room_type", length = 30)
    private String roomType;

    @Column(name = "safety_priority")
    private Integer safetyPriority;

    @Column(name = "transport_nearby")
    private Boolean transportNearby;

    @Column(name = "pet_friendly")
    private Boolean petFriendly;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
