package com.hexroom.backend.service;

import com.hexroom.backend.dto.tenancy.RoomServiceResponse;
import com.hexroom.backend.dto.tenancy.ServiceRequest;
import com.hexroom.backend.entity.ContractServiceSubscription;
import com.hexroom.backend.entity.RentalContract;
import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.RoomService;
import com.hexroom.backend.entity.enums.ContractStatus;
import com.hexroom.backend.entity.enums.ServiceCategory;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ForbiddenException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.ContractServiceSubscriptionRepository;
import com.hexroom.backend.repository.RentalContractRepository;
import com.hexroom.backend.repository.RoomRepository;
import com.hexroom.backend.repository.RoomServiceRepository;
import com.hexroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomServiceCatalog {

    private final RoomServiceRepository services;
    private final ContractServiceSubscriptionRepository subscriptions;
    private final RentalContractRepository contracts;
    private final RoomRepository rooms;
    private final UserRepository users;

    // ------------------------------------------------------- landlord side

    @Transactional
    public RoomServiceResponse create(UUID roomId, UUID actorId, ServiceRequest req) {
        Room room = requireOwnedRoom(roomId, actorId);
        RoomService service = RoomService.builder()
                .room(room)
                .name(req.name().trim())
                .category(parseCategory(req.category()))
                .unitPrice(req.unitPrice())
                .unit(req.unit())
                .description(req.description())
                .active(req.active() == null || req.active())
                .build();
        return RoomServiceResponse.of(services.save(service), null);
    }

    @Transactional
    public RoomServiceResponse update(UUID serviceId, UUID actorId, ServiceRequest req) {
        RoomService service = services.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("RoomService", "id", serviceId));
        requireOwnedRoom(service.getRoom().getId(), actorId);
        service.setName(req.name().trim());
        if (req.category() != null) service.setCategory(parseCategory(req.category()));
        service.setUnitPrice(req.unitPrice());
        service.setUnit(req.unit());
        service.setDescription(req.description());
        if (req.active() != null) service.setActive(req.active());
        return RoomServiceResponse.of(services.save(service), null);
    }

    @Transactional
    public void delete(UUID serviceId, UUID actorId) {
        RoomService service = services.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("RoomService", "id", serviceId));
        requireOwnedRoom(service.getRoom().getId(), actorId);
        boolean inUse = subscriptions.findByContractId(serviceId).stream()
                .anyMatch(s -> Boolean.TRUE.equals(s.getSubscribed()));
        if (inUse) {
            // Dịch vụ đã có người đăng ký: chỉ ngừng bán, không xoá để giữ lịch sử hoá đơn.
            service.setActive(false);
            services.save(service);
            return;
        }
        services.delete(service);
    }

    @Transactional(readOnly = true)
    public List<RoomServiceResponse> listForRoom(UUID roomId) {
        return services.findByRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(s -> RoomServiceResponse.of(s, null))
                .toList();
    }

    // --------------------------------------------------------- tenant side

    /** Danh sách dịch vụ của phòng kèm trạng thái người thuê đã đăng ký hay chưa. */
    @Transactional(readOnly = true)
    public List<RoomServiceResponse> listForContract(UUID contractId, UUID userId) {
        RentalContract contract = requireContractParticipant(contractId, userId);
        var subs = subscriptions.findByContractId(contractId);
        return services.findByRoomIdAndActiveTrueOrderByCreatedAtAsc(contract.getRoom().getId()).stream()
                .map(s -> {
                    var sub = subs.stream().filter(x -> x.getService().getId().equals(s.getId())).findFirst().orElse(null);
                    return RoomServiceResponse.of(s, sub);
                })
                .toList();
    }

    @Transactional
    public RoomServiceResponse setSubscription(UUID contractId, UUID serviceId, UUID userId, boolean subscribed) {
        RentalContract contract = requireContractParticipant(contractId, userId);
        if (!contract.getTenant().getId().equals(userId)) {
            throw new ForbiddenException("Chỉ người thuê mới được đăng ký dịch vụ");
        }
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new BadRequestException("Chỉ đăng ký dịch vụ khi hợp đồng đang hiệu lực");
        }
        RoomService service = services.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("RoomService", "id", serviceId));
        if (!service.getRoom().getId().equals(contract.getRoom().getId())) {
            throw new BadRequestException("Dịch vụ không thuộc phòng của hợp đồng này");
        }

        ContractServiceSubscription sub = subscriptions.findByContractIdAndServiceId(contractId, serviceId)
                .orElseGet(() -> ContractServiceSubscription.builder()
                        .contract(contract)
                        .service(service)
                        .build());
        sub.setSubscribed(subscribed);
        if (subscribed) {
            sub.setEffectiveFrom(LocalDate.now());
            sub.setCancelledAt(null);
        } else {
            sub.setCancelledAt(LocalDateTime.now());
        }
        return RoomServiceResponse.of(service, subscriptions.save(sub));
    }

    // ---------------------------------------------------------------- helpers

    public RoomService requireService(UUID id) {
        return services.findById(id).orElseThrow(() -> new ResourceNotFoundException("RoomService", "id", id));
    }

    private RentalContract requireContractParticipant(UUID contractId, UUID userId) {
        RentalContract contract = contracts.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", contractId));
        boolean allowed = contract.getTenant().getId().equals(userId)
                || contract.getLandlord().getId().equals(userId);
        if (!allowed) throw new ForbiddenException("Bạn không thuộc hợp đồng này");
        return contract;
    }

    private Room requireOwnedRoom(UUID roomId, UUID actorId) {
        Room room = rooms.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room", "id", roomId));
        var ownerId = room.getRental() != null && room.getRental().getOwner() != null
                ? room.getRental().getOwner().getId() : null;
        boolean isAdmin = users.findById(actorId).map(u -> u.getRole() == UserRole.ADMIN).orElse(false);
        if (!isAdmin && (ownerId == null || !ownerId.equals(actorId))) {
            throw new ForbiddenException("Bạn không phải chủ sở hữu phòng này");
        }
        return room;
    }

    private ServiceCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return ServiceCategory.OTHER;
        try {
            return ServiceCategory.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Loại dịch vụ không hợp lệ");
        }
    }
}
