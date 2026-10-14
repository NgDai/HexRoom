package com.hexroom.backend.service;

import com.hexroom.backend.dto.auth.RegisterRequest;
import com.hexroom.backend.dto.room.*;
import com.hexroom.backend.entity.*;
import com.hexroom.backend.entity.RoomInspection.*;
import com.hexroom.backend.entity.enums.*;
import com.hexroom.backend.exception.*;
import com.hexroom.backend.repository.*;
import com.hexroom.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HexRoomCoreTest {
    private final RoomRepository rooms = mock(RoomRepository.class);
    private final RentalRepository rentals = mock(RentalRepository.class);
    private final AmenityRepository amenities = mock(AmenityRepository.class);
    private final RoomService service = new RoomService(rooms, rentals, amenities);
    private Room room(RoomStatus status, RentalStatus rentalStatus) {
        User owner = User.builder().id(UUID.randomUUID()).build();
        Rental rental = Rental.builder().id(UUID.randomUUID()).owner(owner).status(rentalStatus).build();
        return Room.builder().id(UUID.randomUUID()).rental(rental).status(status).price(BigDecimal.TEN).build();
    }
    @Test void publicRoomRequiresBothApprovals() {
        assertThrows(ResourceNotFoundException.class, () -> RoomService.requirePublicRoom(room(RoomStatus.PENDING, RentalStatus.AVAILABLE)));
        assertThrows(ResourceNotFoundException.class, () -> RoomService.requirePublicRoom(room(RoomStatus.AVAILABLE, RentalStatus.PENDING)));
        assertDoesNotThrow(() -> RoomService.requirePublicRoom(room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE)));
    }
    @Test void pendingRoomCannotBeReadByPublicId() {
        Room room = room(RoomStatus.PENDING, RentalStatus.AVAILABLE);
        when(rooms.findById(room.getId())).thenReturn(Optional.of(room));
        assertThrows(ResourceNotFoundException.class, () -> service.getRoomById(room.getId()));
        verify(rooms, never()).incrementSearchCount(any());
    }
    @Test void invalidBudgetRangeRejectedBeforeQuery() {
        assertThrows(BadRequestException.class, () -> service.listRooms(RoomFilterRequest.builder().minPrice(BigDecimal.TEN).maxPrice(BigDecimal.ONE).build()));
        assertThrows(BadRequestException.class, () -> service.listRooms(RoomFilterRequest.builder().minPrice(BigDecimal.valueOf(-1)).build()));
        verifyNoInteractions(rooms);
    }
    @Test void cannotExposePendingWithStatusFilter() {
        assertThrows(BadRequestException.class, () -> service.listRooms(RoomFilterRequest.builder().status(RoomStatus.PENDING).build()));
    }
    @Test @SuppressWarnings("unchecked") void paginationIsCappedAndPriceSortApplied() {
        when(rooms.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(call -> {
            Pageable pageable = call.getArgument(1);
            assertEquals(100, pageable.getPageSize()); assertEquals(0, pageable.getPageNumber());
            assertEquals(Sort.Direction.ASC, pageable.getSort().getOrderFor("price").getDirection());
            return new PageImpl<Room>(List.of(), pageable, 0);
        });
        service.listRooms(RoomFilterRequest.builder().limit(50000).page(-2).sort("price_asc").build());
    }
    @Test void unknownSortRejected() {
        assertThrows(BadRequestException.class, () -> service.listRooms(RoomFilterRequest.builder().sort("password").build()));
    }
    @Test void roomEditReplacesImagesAndResetsApprovalAndAvailability() {
        Room room = room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE);
        room.setAvailabilityConfirmedAt(LocalDateTime.now());
        room.getImages().add(RoomImage.builder().imageUrl("https://example.test/old.jpg").room(room).build());
        when(rooms.findById(room.getId())).thenReturn(Optional.of(room));
        when(rooms.save(any())).thenAnswer(call -> call.getArgument(0));
        when(amenities.findByNameInIgnoreCase(any())).thenReturn(List.of());
        service.updateRoom(room.getId(), room.getRental().getOwner().getId(), RoomCreateRequest.builder()
                .rentalId(room.getRental().getId()).price(BigDecimal.TEN).images(List.of("https://example.test/new.jpg")).build(), false);
        assertEquals(1, room.getImages().size()); assertEquals("https://example.test/new.jpg", room.getImages().getFirst().getImageUrl());
        assertEquals(RoomStatus.PENDING, room.getStatus()); assertNull(room.getAvailabilityConfirmedAt()); assertNotNull(room.getInformationChangedAt());
    }
    @Test void differentOwnerCannotEditRoom() {
        Room room = room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE);
        when(rooms.findById(room.getId())).thenReturn(Optional.of(room));
        assertThrows(ForbiddenException.class, () -> service.updateRoom(room.getId(), UUID.randomUUID(), new RoomCreateRequest(), false));
    }
    @Test void expiredInspectionKeepsOriginalConclusionButShowsNeedsUpdate() {
        RoomInspection inspection = RoomInspection.builder().result(Result.CHECKED).validUntil(LocalDate.now().minusDays(1)).build();
        InspectionResponse response = InspectionResponse.fromEntity(inspection);
        assertEquals(Result.CHECKED, response.result()); assertEquals(Result.NEEDS_UPDATE, response.currentResult());
    }
    @Test void changingRoomInvalidatesCurrentCheckedLabel() {
        Room room = room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE);
        room.setInformationChangedAt(LocalDateTime.now());
        RoomInspection inspection = RoomInspection.builder().room(room).result(Result.CHECKED).recordedAt(LocalDateTime.now().minusDays(2)).validUntil(LocalDate.now().plusMonths(6)).build();
        assertEquals(Result.NEEDS_UPDATE, InspectionResponse.fromEntity(inspection).currentResult());
    }
    @Test void pendingComplaintNeverBecomesConfirmedDiscrepancy() {
        RoomInspection inspection = RoomInspection.builder().result(Result.UNDER_REVIEW).validUntil(LocalDate.now().minusDays(1)).build();
        assertEquals(Result.UNDER_REVIEW, InspectionResponse.fromEntity(inspection).currentResult());
    }
    @Test void inspectionRequiresEvidenceAndExpiryForCheckedResult() {
        Room room = room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE);
        when(rooms.findById(room.getId())).thenReturn(Optional.of(room));
        RoomInspectionRepository inspections = mock(RoomInspectionRepository.class);
        InspectionService inspectionService = new InspectionService(inspections, rooms, mock(UserRepository.class));
        InspectionRequest request = new InspectionRequest(Category.CONDITION, Result.CHECKED, LocalDate.now(), LocalDate.now().plusMonths(6), "Observed", "Findings", List.of());
        assertThrows(BadRequestException.class, () -> inspectionService.record(room.getId(), UUID.randomUUID(), request));
        verifyNoInteractions(inspections);
    }
    @Test void staffCannotInspectTheirOwnProperty() {
        Room room = room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE);
        when(rooms.findById(room.getId())).thenReturn(Optional.of(room));
        InspectionService inspectionService = new InspectionService(mock(RoomInspectionRepository.class), rooms, mock(UserRepository.class));
        assertThrows(ForbiddenException.class, () -> inspectionService.record(room.getId(), room.getRental().getOwner().getId(), null));
    }
    @Test void registrationCannotGrantAdminOrModerator() {
        AuthService auth = new AuthService(mock(UserRepository.class), mock(RefreshTokenRepository.class), mock(LifestyleProfileRepository.class), mock(UserPreferenceRepository.class), mock(PasswordEncoder.class), mock(JwtTokenProvider.class));
        for (UserRole role : List.of(UserRole.ADMIN, UserRole.MODERATOR))
            assertThrows(BadRequestException.class, () -> auth.register(RegisterRequest.builder().role(role).build()));
    }
    @Test void unknownCostsStayNullAndExplicitFreeStaysZero() {
        Room room = room(RoomStatus.AVAILABLE, RentalStatus.AVAILABLE);
        room.setCosts(RoomCosts.builder().internetMonthly(BigDecimal.ZERO).build());
        RoomResponse response = RoomResponse.fromEntity(room);
        assertNull(response.getCosts().getDeposit()); assertEquals(BigDecimal.ZERO, response.getCosts().getInternetMonthly());
    }
    private RoommateProfile profile() {
        RoommateProfile p = new RoommateProfile(); p.setVisible(true); p.setCity("Hà Nội");
        p.setBudgetMin(BigDecimal.valueOf(1000000)); p.setBudgetMax(BigDecimal.valueOf(3000000));
        p.setMoveInDate(LocalDate.now()); p.setAcceptPets(true); p.setAcceptSmoking(true); return p;
    }
    @Test void matchingHonorsBothDirectionsOfHardRequirements() {
        RoommateProfile a = profile(), b = profile();
        assertTrue(RoommateService.compatible(a,b));
        a.setSmoking(true); b.setAcceptSmoking(false); assertFalse(RoommateService.compatible(a,b)); assertFalse(RoommateService.compatible(b,a));
        a.setSmoking(false); b.setHasPets(true); a.setAcceptPets(false); assertFalse(RoommateService.compatible(a,b));
    }
    @Test void hiddenAndIncompatibleProfilesAreExcluded() {
        RoommateProfile a = profile(), b = profile();
        b.setVisible(false); assertFalse(RoommateService.compatible(a,b));
        b.setVisible(true); b.setCity("Đà Nẵng"); assertFalse(RoommateService.compatible(a,b));
        b.setCity(a.getCity()); b.setBudgetMin(BigDecimal.valueOf(4000000)); assertFalse(RoommateService.compatible(a,b));
        b.setBudgetMin(BigDecimal.ONE); b.setMoveInDate(LocalDate.now().plusDays(31)); assertFalse(RoommateService.compatible(a,b));
    }
}
