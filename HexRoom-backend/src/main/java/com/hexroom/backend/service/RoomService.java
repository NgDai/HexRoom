package com.hexroom.backend.service;

import com.hexroom.backend.common.PagedResponse;
import com.hexroom.backend.dto.room.RoomCreateRequest;
import com.hexroom.backend.dto.room.RoomFilterRequest;
import com.hexroom.backend.dto.room.RoomResponse;
import com.hexroom.backend.entity.Amenity;
import com.hexroom.backend.entity.Rental;
import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.RoomImage;
import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.entity.enums.RentalStatus;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ForbiddenException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.AmenityRepository;
import com.hexroom.backend.repository.RentalRepository;
import com.hexroom.backend.repository.RoomRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RentalRepository rentalRepository;
    private final AmenityRepository amenityRepository;

    @Transactional
    public RoomResponse createRoom(UUID landlordId, RoomCreateRequest request, boolean isAdmin) {
        Rental rental = rentalRepository.findById(request.getRentalId())
                .orElseThrow(() -> new ResourceNotFoundException("Rental", "id", request.getRentalId()));

        if (!isAdmin && !rental.getOwner().getId().equals(landlordId)) {
            throw new ForbiddenException("Bạn không phải chủ sở hữu của bài đăng này");
        }

        Room room = Room.builder()
                .rental(rental)
                .roomName(request.getRoomName() != null ? request.getRoomName().trim() : null)
                .roomType(request.getRoomType())
                .price(request.getPrice())
                .sizeM2(request.getSizeM2())
                .maxPeople(request.getMaxPeople() != null ? request.getMaxPeople() : 1)
                .description(request.getDescription())
                .costs(request.getCosts())
                .status(RoomStatus.PENDING)
                .build();

        // Handle amenities
        if (request.getAmenities() != null && !request.getAmenities().isEmpty()) {
            List<Amenity> existing = amenityRepository.findByNameInIgnoreCase(request.getAmenities());
            room.setAmenities(new HashSet<>(existing));
        }

        // Handle images
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            for (String imgUrl : request.getImages()) {
                RoomImage img = RoomImage.builder()
                        .room(room)
                        .imageUrl(imgUrl.trim())
                        .build();
                room.getImages().add(img);
            }
        }

        Room saved = roomRepository.save(room);
        return RoomResponse.fromEntity(saved);
    }

    @Transactional
    public RoomResponse getRoomById(UUID id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", "id", id));

        requirePublicRoom(room);
        // Increment view count
        roomRepository.incrementSearchCount(id);

        return RoomResponse.fromEntity(room);
    }

    @Transactional(readOnly = true)
    public PagedResponse<RoomResponse> listRooms(RoomFilterRequest filter) {
        if ((filter.getMinPrice() != null && filter.getMinPrice().signum() < 0)
                || (filter.getMaxPrice() != null && filter.getMaxPrice().signum() < 0)
                || (filter.getMinPrice() != null && filter.getMaxPrice() != null && filter.getMinPrice().compareTo(filter.getMaxPrice()) > 0)
                || (filter.getMinSize() != null && filter.getMinSize().signum() < 0)
                || (filter.getMaxSize() != null && filter.getMaxSize().signum() < 0)
                || (filter.getMinSize() != null && filter.getMaxSize() != null && filter.getMinSize().compareTo(filter.getMaxSize()) > 0)) {
            throw new BadRequestException("Khoảng giá hoặc diện tích không hợp lệ");
        }
        if (filter.getStatus() != null && filter.getStatus() != RoomStatus.AVAILABLE) {
            throw new BadRequestException("Danh sách công khai chỉ hiển thị phòng đang cho thuê");
        }
        Sort sort = switch (filter.getSort() == null ? "newest" : filter.getSort()) {
            case "price_asc" -> Sort.by("price").ascending();
            case "price_desc" -> Sort.by("price").descending();
            case "newest", "recommended" -> Sort.by("createdAt").descending();
            default -> throw new BadRequestException("Thứ tự sắp xếp không hợp lệ");
        };
        Pageable pageable = PageRequest.of(
                Math.max(0, filter.getPage() - 1),
                Math.min(100, Math.max(1, filter.getLimit())),
                sort.and(Sort.by("id"))
        );

        Specification<Room> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("rental").get("status"), RentalStatus.AVAILABLE));

            if (filter.getRentalId() != null) {
                predicates.add(cb.equal(root.get("rental").get("id"), filter.getRentalId()));
            }

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            } else {
                predicates.add(cb.equal(root.get("status"), RoomStatus.AVAILABLE));
            }

            if (filter.getRoomType() != null) {
                predicates.add(cb.equal(root.get("roomType"), filter.getRoomType()));
            }

            if (filter.getMinPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), filter.getMinPrice()));
            }

            if (filter.getMaxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), filter.getMaxPrice()));
            }

            if (filter.getMinSize() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("sizeM2"), filter.getMinSize()));
            }

            if (filter.getMaxSize() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("sizeM2"), filter.getMaxSize()));
            }

            if (filter.getDistrict() != null && !filter.getDistrict().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("rental").get("location").get("district")),
                        "%" + filter.getDistrict().toLowerCase() + "%"
                ));
            }

            if (filter.getCity() != null && !filter.getCity().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("rental").get("location").get("city")),
                        "%" + filter.getCity().toLowerCase() + "%"
                ));
            }

            if (filter.getKeyword() != null && !filter.getKeyword().isBlank()) {
                String kw = "%" + filter.getKeyword().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("roomName")), kw);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), kw);
                predicates.add(cb.or(nameMatch, descMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Room> roomPage = roomRepository.findAll(spec, pageable);
        return PagedResponse.fromPage(roomPage.map(RoomResponse::fromEntity));
    }

    @Transactional
    public RoomResponse updateRoom(UUID id, UUID landlordId, RoomCreateRequest request, boolean isAdmin) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", "id", id));

        if (!isAdmin && !room.getRental().getOwner().getId().equals(landlordId)) {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa phòng này");
        }

        if (request.getRoomName() != null) room.setRoomName(request.getRoomName().trim());
        if (request.getRoomType() != null) room.setRoomType(request.getRoomType());
        if (request.getPrice() != null) room.setPrice(request.getPrice());
        if (request.getSizeM2() != null) room.setSizeM2(request.getSizeM2());
        if (request.getMaxPeople() != null) room.setMaxPeople(request.getMaxPeople());
        if (request.getDescription() != null) room.setDescription(request.getDescription());
        room.setInformationChangedAt(java.time.LocalDateTime.now());
        room.setAvailabilityConfirmedAt(null);
        room.setStatus(RoomStatus.PENDING);
        if (request.getCosts() != null) room.setCosts(request.getCosts());
        if (request.getImages() != null) {
            room.getImages().clear();
            request.getImages().forEach(url -> room.getImages().add(RoomImage.builder().room(room).imageUrl(url.trim()).build()));
        }

        if (request.getAmenities() != null) {
            List<Amenity> amenities = amenityRepository.findByNameInIgnoreCase(request.getAmenities());
            room.setAmenities(new HashSet<>(amenities));
        }

        Room updated = roomRepository.save(room);
        return RoomResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteRoom(UUID id, UUID landlordId, boolean isAdmin) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", "id", id));

        if (!isAdmin && !room.getRental().getOwner().getId().equals(landlordId)) {
            throw new ForbiddenException("Bạn không có quyền xóa phòng này");
        }

        roomRepository.delete(room);
    }

    public static void requirePublicRoom(Room room) {
        if (room.getStatus() != RoomStatus.AVAILABLE || room.getRental().getStatus() != RentalStatus.AVAILABLE) {
            throw new ResourceNotFoundException("Room", "id", room.getId());
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<RoomResponse> managedRooms(UUID userId, boolean staff, int page) {
        Specification<Room> spec = (root, query, cb) -> staff ? cb.conjunction()
                : cb.equal(root.get("rental").get("owner").get("id"), userId);
        return PagedResponse.fromPage(roomRepository.findAll(spec,
                PageRequest.of(Math.max(0, page - 1), 20, Sort.by("createdAt").descending())).map(RoomResponse::fromEntity));
    }

    @Transactional
    public RoomResponse confirmAvailability(UUID id, UUID userId, boolean admin) {
        Room room = roomRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Room", "id", id));
        if (!admin && !room.getRental().getOwner().getId().equals(userId)) throw new ForbiddenException("Bạn không sở hữu phòng này");
        if (room.getStatus() != RoomStatus.AVAILABLE) throw new BadRequestException("Chỉ xác nhận còn phòng sau khi tin đã được duyệt");
        room.setAvailabilityConfirmedAt(java.time.LocalDateTime.now());
        return RoomResponse.fromEntity(room);
    }

    @Transactional
    public RoomResponse moderate(UUID id, RoomStatus status) {
        Room room = roomRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Room", "id", id));
        room.setStatus(status);
        return RoomResponse.fromEntity(room);
    }
}
