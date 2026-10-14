package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/** Immutable inspection history; public evidence must already be redacted. */
@Entity @Table(name = "room_inspections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomInspection {
    public enum Category { CONDITION, PRICE_AND_FEES, IMAGES, RENTAL_RIGHTS }
    public enum Result { CHECKED, NOT_CHECKED, NEEDS_UPDATE, UNDER_REVIEW, DISCREPANCY_CONFIRMED }
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_id", nullable = false)
    private Room room;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "inspector_id", nullable = false)
    private User inspector;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Category category;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Result result;
    @Column(nullable = false)
    private LocalDate inspectedOn;
    private LocalDate validUntil;
    @Column(length = 2000, nullable = false)
    private String method;
    @Column(length = 4000, nullable = false)
    private String findings;
    @ElementCollection @CollectionTable(name = "inspection_evidence", joinColumns = @JoinColumn(name = "inspection_id"))
    @Column(name = "image_url", length = 2000) @Builder.Default
    private List<String> evidenceImages = new ArrayList<>();
    @Column(nullable = false) @Builder.Default
    private LocalDateTime recordedAt = LocalDateTime.now();
}
