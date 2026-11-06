package com.hexroom.backend.service;

import com.hexroom.backend.dto.tenancy.ContractResponse;
import com.hexroom.backend.dto.tenancy.CreateContractRequest;
import com.hexroom.backend.entity.RentalContract;
import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.ContractStatus;
import com.hexroom.backend.entity.enums.InvoiceStatus;
import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ForbiddenException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.RentalContractRepository;
import com.hexroom.backend.repository.RentalInvoiceRepository;
import com.hexroom.backend.repository.RoomRepository;
import com.hexroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Vòng đời hợp đồng hai chiều.
 *
 * Bất biến quan trọng:
 * - Chỉ phòng của chính chủ trọ mới được lập hợp đồng.
 * - Một phòng chỉ có tối đa một hợp đồng đang mở (chưa kết thúc/huỷ).
 * - Chủ trọ không thể tự xác nhận thay người thuê.
 * - Hợp đồng chỉ ACTIVE khi cả hai bên xác nhận và cọc đã được ghi nhận.
 */
@Service
@RequiredArgsConstructor
public class ContractService {

    private static final Set<ContractStatus> OPEN_STATUSES = Set.of(
            ContractStatus.PENDING_TENANT,
            ContractStatus.PENDING_LANDLORD,
            ContractStatus.ACTIVE
    );

    private final RentalContractRepository contracts;
    private final RentalInvoiceRepository invoices;
    private final RoomRepository rooms;
    private final UserRepository users;

    @Transactional
    public ContractResponse create(UUID landlordId, CreateContractRequest req) {
        Room room = rooms.findById(req.roomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room", "id", req.roomId()));
        User landlord = requireLandlordOf(room, landlordId);

        User tenant = users.findById(req.tenantId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", req.tenantId()));
        if (tenant.getId().equals(landlord.getId())) {
            throw new BadRequestException("Không thể lập hợp đồng với chính tài khoản chủ trọ");
        }
        if (room.getStatus() == RoomStatus.RENTED) {
            throw new BadRequestException("Phòng đang được thuê, không thể lập hợp đồng mới");
        }
        if (contracts.existsByRoomIdAndStatusIn(room.getId(), OPEN_STATUSES)) {
            throw new BadRequestException("Phòng đã có hợp đồng đang mở. Hãy kết thúc hợp đồng cũ trước.");
        }
        if (req.endDate() != null && req.endDate().isBefore(req.startDate())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        RentalContract contract = RentalContract.builder()
                .contractCode(nextCode())
                .room(room)
                .tenant(tenant)
                .landlord(landlord)
                .status(ContractStatus.PENDING_TENANT)
                .startDate(req.startDate())
                .endDate(req.endDate())
                .monthlyRent(req.monthlyRent())
                .depositAmount(req.depositAmount() != null ? req.depositAmount() : java.math.BigDecimal.ZERO)
                .paymentCycleMonths(req.paymentCycleMonths() != null ? req.paymentCycleMonths() : 1)
                .billingDay(req.billingDay() != null ? req.billingDay() : 5)
                .houseRules(req.houseRules() != null ? req.houseRules() : room.getCosts() != null ? room.getCosts().getHouseRules() : null)
                .extraTerms(req.extraTerms())
                .landlordNote(req.landlordNote())
                .depositPaid(false)
                .build();

        return ContractResponse.from(contracts.save(contract));
    }

    @Transactional(readOnly = true)
    public List<ContractResponse> listForTenant(UUID tenantId) {
        return contracts.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(this::withInvoiceSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContractResponse> listForLandlord(UUID landlordId) {
        return contracts.findByLandlordIdOrderByCreatedAtDesc(landlordId).stream()
                .map(this::withInvoiceSummary)
                .toList();
    }

    /** "Phòng của tôi" — chỉ hợp đồng đã kích hoạt mới mở phòng cho người thuê. */
    @Transactional(readOnly = true)
    public List<ContractResponse> myRooms(UUID tenantId) {
        return contracts.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, ContractStatus.ACTIVE).stream()
                .map(this::withInvoiceSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ContractResponse get(UUID contractId, UUID userId) {
        RentalContract c = requireContract(contractId);
        requireParticipant(c, userId);
        return withInvoiceSummary(c);
    }

    /** Người thuê xác nhận đồng ý điều khoản và thông tin hợp đồng. */
    @Transactional
    public ContractResponse tenantConfirm(UUID contractId, UUID tenantId, String note) {
        RentalContract c = requireContract(contractId);
        if (!c.getTenant().getId().equals(tenantId)) {
            throw new ForbiddenException("Chỉ người thuê trong hợp đồng mới được xác nhận");
        }
        if (c.getStatus() != ContractStatus.PENDING_TENANT) {
            throw new BadRequestException("Hợp đồng không ở trạng thái chờ người thuê xác nhận");
        }
        c.setTenantConfirmedAt(LocalDateTime.now());
        if (note != null) c.setTenantNote(note);
        c.setStatus(ContractStatus.PENDING_LANDLORD);
        return ContractResponse.from(contracts.save(c));
    }

    /** Người thuê từ chối hợp đồng. */
    @Transactional
    public ContractResponse tenantReject(UUID contractId, UUID tenantId, String reason) {
        RentalContract c = requireContract(contractId);
        if (!c.getTenant().getId().equals(tenantId)) {
            throw new ForbiddenException("Chỉ người thuê trong hợp đồng mới được từ chối");
        }
        if (c.getStatus() != ContractStatus.PENDING_TENANT) {
            throw new BadRequestException("Chỉ từ chối được hợp đồng đang chờ bạn xác nhận");
        }
        c.setStatus(ContractStatus.REJECTED);
        c.setTenantNote(reason);
        c.setEndedAt(LocalDateTime.now());
        c.setEndReason(reason != null ? reason : "Người thuê từ chối hợp đồng");
        return ContractResponse.from(contracts.save(c));
    }

    /**
     * Chủ trọ xác nhận lần cuối. Chỉ khi đã có xác nhận của người thuê, và tiền cọc
     * đã được ghi nhận (nếu có cọc) thì hợp đồng mới kích hoạt và mở phòng.
     */
    @Transactional
    public ContractResponse landlordConfirm(UUID contractId, UUID landlordId, boolean depositReceived, String note) {
        RentalContract c = requireContract(contractId);
        if (!c.getLandlord().getId().equals(landlordId)) {
            throw new ForbiddenException("Chỉ chủ trọ trong hợp đồng mới được xác nhận");
        }
        if (c.getStatus() != ContractStatus.PENDING_LANDLORD) {
            throw new BadRequestException("Cần người thuê xác nhận trước khi chủ trọ xác nhận");
        }
        if (c.getTenantConfirmedAt() == null) {
            throw new BadRequestException("Người thuê chưa xác nhận hợp đồng");
        }
        if (depositReceived) {
            c.setDepositPaid(true);
        }
        boolean hasDeposit = c.getDepositAmount() != null && c.getDepositAmount().signum() > 0;
        if (hasDeposit && !Boolean.TRUE.equals(c.getDepositPaid())) {
            throw new BadRequestException("Cần xác nhận đã nhận tiền cọc trước khi kích hoạt hợp đồng");
        }

        c.setLandlordConfirmedAt(LocalDateTime.now());
        if (note != null) c.setLandlordNote(note);
        c.setStatus(ContractStatus.ACTIVE);
        c.setActivatedAt(LocalDateTime.now());

        Room room = c.getRoom();
        room.setStatus(RoomStatus.RENTED);
        rooms.saveAndFlush(room);

        return ContractResponse.from(contracts.saveAndFlush(c));
    }

    /** Chủ trọ kết thúc hợp đồng đang hiệu lực (trả phòng, chấm dứt trước hạn...). */
    @Transactional
    public ContractResponse end(UUID contractId, UUID landlordId, String reason) {
        RentalContract c = requireContract(contractId);
        if (!c.getLandlord().getId().equals(landlordId)) {
            throw new ForbiddenException("Chỉ chủ trọ mới được kết thúc hợp đồng");
        }
        if (c.getStatus() != ContractStatus.ACTIVE) {
            throw new BadRequestException("Chỉ kết thúc được hợp đồng đang hiệu lực");
        }
        c.setStatus(ContractStatus.ENDED);
        c.setEndedAt(LocalDateTime.now());
        c.setEndReason(reason);

        Room room = c.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        rooms.save(room);

        return ContractResponse.from(contracts.save(c));
    }

    /** Hợp đồng của một phòng — dùng cho màn hình quản lý của chủ trọ. */
    @Transactional(readOnly = true)
    public List<ContractResponse> listForRoom(UUID roomId, UUID landlordId) {
        Room room = rooms.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room", "id", roomId));
        String ownerId = room.getRental() != null && room.getRental().getOwner() != null
                ? room.getRental().getOwner().getId().toString() : null;
        boolean isAdmin = users.findById(landlordId).map(u -> u.getRole() == UserRole.ADMIN).orElse(false);
        if (!isAdmin && (ownerId == null || !ownerId.equals(landlordId.toString()))) {
            throw new ForbiddenException("Bạn không phải chủ sở hữu phòng này");
        }
        return contracts.findAll().stream()
                .filter(c -> c.getRoom() != null && c.getRoom().getId().equals(roomId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::withInvoiceSummary)
                .toList();
    }

    // ---------------------------------------------------------------- helpers

    /** Tìm người thuê theo email hoặc số điện thoại; chỉ trả tối đa 10 gợi ý. */
    @Transactional(readOnly = true)
    public List<User> searchTenants(String query) {
        return users.searchTenants(query, org.springframework.data.domain.PageRequest.of(0, 10));
    }

    private ContractResponse withInvoiceSummary(RentalContract c) {
        var open = invoices.findByContractIdAndStatusIn(c.getId(), List.of(
                InvoiceStatus.ISSUED, InvoiceStatus.TENANT_CONFIRMED, InvoiceStatus.OVERDUE));
        var total = open.stream()
                .map(i -> i.getTotalAmount() == null ? java.math.BigDecimal.ZERO : i.getTotalAmount())
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        return ContractResponse.from(c, total, open.size());
    }

    private RentalContract requireContract(UUID id) {
        return contracts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
    }

    private User requireLandlordOf(Room room, UUID userId) {
        User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        boolean owns = room.getRental() != null && room.getRental().getOwner() != null
                && room.getRental().getOwner().getId().equals(userId);
        if (!owns && user.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Bạn không phải chủ sở hữu phòng này");
        }
        return room.getRental().getOwner();
    }

    private void requireParticipant(RentalContract c, UUID userId) {
        boolean allowed = c.getTenant().getId().equals(userId) || c.getLandlord().getId().equals(userId);
        if (!allowed) {
            throw new ForbiddenException("Bạn không thuộc hợp đồng này");
        }
    }

    private String nextCode() {
        String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss"));
        String suffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "HD-" + stamp + "-" + suffix;
    }
}
