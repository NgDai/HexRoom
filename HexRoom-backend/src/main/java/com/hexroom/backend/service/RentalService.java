package com.hexroom.backend.service;

import com.hexroom.backend.common.PagedResponse;
import com.hexroom.backend.dto.rental.RentalCreateRequest;
import com.hexroom.backend.dto.rental.RentalResponse;
import com.hexroom.backend.entity.Location;
import com.hexroom.backend.entity.Rental;
import com.hexroom.backend.entity.RentalImage;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.RentalStatus;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ForbiddenException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.LocationRepository;
import com.hexroom.backend.repository.RentalRepository;
import com.hexroom.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RentalService {

    private final RentalRepository rentalRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;

    @Transactional
    public RentalResponse createRental(UUID ownerId, RentalCreateRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", ownerId));

        if (owner.getRole() == UserRole.LANDLORD && !Boolean.TRUE.equals(owner.getIsIdentityVerified())) {
            throw new BadRequestException("Chủ trọ cần hoàn tất xác thực thông tin cá nhân (CCCD, SĐT, Email) trước khi tạo bài đăng cho thuê.");
        }

        Location location = Location.builder()
                .address(request.getLocation().getAddress().trim())
                .district(request.getLocation().getDistrict() != null ? request.getLocation().getDistrict().trim() : null)
                .city(request.getLocation().getCity() != null ? request.getLocation().getCity().trim() : null)
                .latitude(request.getLocation().getLatitude())
                .longitude(request.getLocation().getLongitude())
                .build();
        location = locationRepository.save(location);

        Rental rental = Rental.builder()
                .owner(owner)
                .location(location)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .status(RentalStatus.PENDING)
                .build();

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            for (String imgUrl : request.getImages()) {
                RentalImage img = RentalImage.builder()
                        .rental(rental)
                        .imageUrl(imgUrl.trim())
                        .build();
                rental.getImages().add(img);
            }
        }

        Rental saved = rentalRepository.save(rental);
        return RentalResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public RentalResponse getRentalById(UUID id) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rental", "id", id));
        if (rental.getStatus() != RentalStatus.AVAILABLE) throw new ResourceNotFoundException("Rental", "id", id);
        return RentalResponse.publicView(rental);
    }

    @Transactional(readOnly = true)
    public PagedResponse<RentalResponse> listRentals(RentalStatus status, String district, String city, int page, int limit) {
        if (status != null && status != RentalStatus.AVAILABLE) throw new com.hexroom.backend.exception.BadRequestException("Chỉ hiển thị tin đã duyệt");
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(100, Math.max(1, limit)), Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<Rental> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else {
                // Default to available rentals for public browse
                predicates.add(cb.equal(root.get("status"), RentalStatus.AVAILABLE));
            }

            if (district != null && !district.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("location").get("district")), "%" + district.toLowerCase() + "%"));
            }

            if (city != null && !city.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("location").get("city")), "%" + city.toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Rental> rentalPage = rentalRepository.findAll(spec, pageable);
        return PagedResponse.fromPage(rentalPage.map(RentalResponse::publicView));
    }

    @Transactional(readOnly = true)
    public PagedResponse<RentalResponse> listRentalsByOwner(UUID ownerId, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.max(1, limit), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Rental> rentalPage = rentalRepository.findByOwnerId(ownerId, pageable);
        return PagedResponse.fromPage(rentalPage.map(RentalResponse::fromEntity));
    }

    @Transactional
    public RentalResponse updateRentalStatus(UUID id, RentalStatus status, UUID moderatorId) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rental", "id", id));

        User moderator = userRepository.findById(moderatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", moderatorId));

        rental.setStatus(status);
        rental.setModeratedBy(moderator);
        rental.setModeratedAt(LocalDateTime.now());

        Rental updated = rentalRepository.save(rental);
        return RentalResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteRental(UUID id, UUID userId, boolean isAdmin) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rental", "id", id));

        if (!isAdmin && !rental.getOwner().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa bài đăng này");
        }

        rentalRepository.delete(rental);
    }
}
