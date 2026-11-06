package com.hexroom.backend.service;

import com.hexroom.backend.dto.tenancy.ContractResponse;
import com.hexroom.backend.dto.tenancy.CreateContractRequest;
import com.hexroom.backend.entity.Rental;
import com.hexroom.backend.entity.RentalContract;
import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.ContractStatus;
import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ForbiddenException;
import com.hexroom.backend.repository.RentalContractRepository;
import com.hexroom.backend.repository.RentalInvoiceRepository;
import com.hexroom.backend.repository.RoomRepository;
import com.hexroom.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Nghiệp vụ cốt lõi của tính năng quản lý trọ: hợp đồng chỉ mở phòng sau khi
 * CẢ HAI bên xác nhận, và mỗi bên không thể xác nhận thay bên kia.
 */
class ContractServiceTest {

    private RentalContractRepository contracts;
    private RentalInvoiceRepository invoices;
    private RoomRepository rooms;
    private UserRepository users;
    private ContractService service;

    private User landlord;
    private User tenant;
    private Room room;

    @BeforeEach
    void setUp() {
        contracts = mock(RentalContractRepository.class);
        invoices = mock(RentalInvoiceRepository.class);
        rooms = mock(RoomRepository.class);
        users = mock(UserRepository.class);
        service = new ContractService(contracts, invoices, rooms, users);

        landlord = User.builder().id(UUID.randomUUID()).fullName("Chủ trọ").email("landlord@test.vn").build();
        tenant = User.builder().id(UUID.randomUUID()).fullName("Người thuê").email("tenant@test.vn").build();

        Rental rental = Rental.builder().id(UUID.randomUUID()).owner(landlord).title("Nhà trọ A").build();
        room = Room.builder().id(UUID.randomUUID()).rental(rental).roomName("P.101")
                .price(BigDecimal.valueOf(3_000_000)).status(RoomStatus.AVAILABLE).build();

        when(rooms.findById(room.getId())).thenReturn(Optional.of(room));
        when(users.findById(tenant.getId())).thenReturn(Optional.of(tenant));
        when(users.findById(landlord.getId())).thenReturn(Optional.of(landlord));
        when(invoices.findByContractIdAndStatusIn(any(), any())).thenReturn(List.of());
        when(contracts.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private CreateContractRequest request() {
        return new CreateContractRequest(
                room.getId(), tenant.getId(), LocalDate.now(), LocalDate.now().plusMonths(12),
                BigDecimal.valueOf(3_000_000), BigDecimal.valueOf(3_000_000), 1, 5, null, null, null);
    }

    private RentalContract pendingLandlordContract() {
        RentalContract c = RentalContract.builder()
                .id(UUID.randomUUID()).room(room).tenant(tenant).landlord(landlord)
                .status(ContractStatus.PENDING_LANDLORD)
                .monthlyRent(BigDecimal.valueOf(3_000_000))
                .depositAmount(BigDecimal.valueOf(3_000_000))
                .tenantConfirmedAt(java.time.LocalDateTime.now())
                .build();
        when(contracts.findById(c.getId())).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    @DisplayName("Hợp đồng mới luôn bắt đầu ở trạng thái chờ người thuê, chưa mở phòng")
    void newContractStartsPendingTenant() {
        ContractResponse created = service.create(landlord.getId(), request());

        assertEquals(ContractStatus.PENDING_TENANT, created.status());
        assertNotNull(created.contractCode());
        verify(rooms, never()).save(any());
    }

    @Test
    @DisplayName("Chủ trọ khác không thể lập hợp đồng cho phòng không thuộc sở hữu")
    void strangerCannotCreateContractForRoom() {
        User stranger = User.builder().id(UUID.randomUUID()).fullName("Người lạ").build();
        when(users.findById(stranger.getId())).thenReturn(Optional.of(stranger));

        assertThrows(ForbiddenException.class, () -> service.create(stranger.getId(), request()));
        verify(contracts, never()).save(any());
    }

    @Test
    @DisplayName("Không thể lập hợp đồng khi phòng đã có hợp đồng đang mở")
    void cannotCreateWhenRoomAlreadyHasOpenContract() {
        when(contracts.existsByRoomIdAndStatusIn(eq(room.getId()), any())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> service.create(landlord.getId(), request()));
    }

    @Test
    @DisplayName("Chủ trọ không thể xác nhận thay người thuê")
    void landlordCannotConfirmOnBehalfOfTenant() {
        RentalContract c = RentalContract.builder()
                .id(UUID.randomUUID()).room(room).tenant(tenant).landlord(landlord)
                .status(ContractStatus.PENDING_TENANT).build();
        when(contracts.findById(c.getId())).thenReturn(Optional.of(c));

        assertThrows(ForbiddenException.class,
                () -> service.tenantConfirm(c.getId(), landlord.getId(), null));
    }

    @Test
    @DisplayName("Chưa có xác nhận của người thuê thì chủ trọ không kích hoạt được hợp đồng")
    void landlordCannotActivateBeforeTenantConfirms() {
        RentalContract c = pendingLandlordContract();
        c.setTenantConfirmedAt(null);

        assertThrows(BadRequestException.class,
                () -> service.landlordConfirm(c.getId(), landlord.getId(), true, null));
        assertNotEquals(ContractStatus.ACTIVE, c.getStatus());
    }

    @Test
    @DisplayName("Có tiền cọc nhưng chưa ghi nhận đã nhận thì hợp đồng chưa kích hoạt")
    void depositMustBeRecordedBeforeActivation() {
        RentalContract c = pendingLandlordContract();

        assertThrows(BadRequestException.class,
                () -> service.landlordConfirm(c.getId(), landlord.getId(), false, null));
        assertNotEquals(ContractStatus.ACTIVE, c.getStatus());
    }

    @Test
    @DisplayName("Hai bên xác nhận đủ thì hợp đồng ACTIVE và phòng chuyển sang RENTED")
    void bothConfirmationsActivateContractAndOpenRoom() {
        RentalContract c = pendingLandlordContract();

        ContractResponse result = service.landlordConfirm(c.getId(), landlord.getId(), true, "Đã nhận cọc");

        assertEquals(ContractStatus.ACTIVE, result.status());
        assertTrue(result.depositPaid());
        assertEquals(RoomStatus.RENTED, room.getStatus());
        verify(rooms).save(room);
    }

    @Test
    @DisplayName("Phòng của tôi tuyệt đối không trả hợp đồng chưa kích hoạt")
    void myRoomsOnlyReturnsActiveContracts() {
        service.myRooms(tenant.getId());

        verify(contracts).findByTenantIdAndStatusOrderByCreatedAtDesc(tenant.getId(), ContractStatus.ACTIVE);
        verify(contracts, never()).findByTenantIdOrderByCreatedAtDesc(tenant.getId());
    }

    @Test
    @DisplayName("Kết thúc hợp đồng trả phòng về AVAILABLE")
    void endingContractReleasesRoom() {
        RentalContract c = pendingLandlordContract();
        c.setStatus(ContractStatus.ACTIVE);
        room.setStatus(RoomStatus.RENTED);

        ContractResponse result = service.end(c.getId(), landlord.getId(), "Hết hạn hợp đồng");

        assertEquals(ContractStatus.ENDED, result.status());
        assertEquals(RoomStatus.AVAILABLE, room.getStatus());
    }

    @Test
    @DisplayName("Người ngoài không xem được chi tiết hợp đồng")
    void outsiderCannotReadContract() {
        RentalContract c = pendingLandlordContract();
        UUID outsider = UUID.randomUUID();

        assertThrows(ForbiddenException.class, () -> service.get(c.getId(), outsider));
    }

    @Test
    @DisplayName("Người thuê từ chối thì hợp đồng đóng và không mở phòng")
    void tenantRejectionClosesContract() {
        RentalContract c = RentalContract.builder()
                .id(UUID.randomUUID()).room(room).tenant(tenant).landlord(landlord)
                .status(ContractStatus.PENDING_TENANT).build();
        when(contracts.findById(c.getId())).thenReturn(Optional.of(c));

        ContractResponse result = service.tenantReject(c.getId(), tenant.getId(), "Giá chưa phù hợp");

        assertEquals(ContractStatus.REJECTED, result.status());
        assertNotEquals(RoomStatus.RENTED, room.getStatus());
    }
}
