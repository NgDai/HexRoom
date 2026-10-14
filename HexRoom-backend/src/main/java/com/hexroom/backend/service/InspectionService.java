package com.hexroom.backend.service;

import com.hexroom.backend.dto.room.*;
import com.hexroom.backend.entity.*;
import com.hexroom.backend.entity.RoomInspection.Result;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.exception.*;
import com.hexroom.backend.repository.*;
import com.hexroom.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class InspectionService {
    private final RoomInspectionRepository inspections;
    private final RoomRepository rooms;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public List<InspectionResponse> list(UUID roomId, UserPrincipal viewer) {
        Room room = rooms.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room", "id", roomId));
        boolean privileged = viewer != null && (viewer.getRole() == UserRole.ADMIN || viewer.getRole() == UserRole.MODERATOR
                || room.getRental().getOwner().getId().equals(viewer.getId()));
        if (!privileged) RoomService.requirePublicRoom(room);
        return inspections.findByRoomIdOrderByRecordedAtDesc(roomId).stream().map(InspectionResponse::fromEntity).toList();
    }

    @Transactional
    public InspectionResponse record(UUID roomId, UUID inspectorId, InspectionRequest request) {
        Room room = rooms.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room", "id", roomId));
        if (room.getRental().getOwner().getId().equals(inspectorId)) throw new ForbiddenException("Không tự kiểm tra phòng của mình");
        if (request.validUntil() != null && request.validUntil().isBefore(request.inspectedOn()))
            throw new BadRequestException("Ngày hết hiệu lực phải sau ngày kiểm tra");
        if ((request.result() == Result.CHECKED || request.result() == Result.DISCREPANCY_CONFIRMED)
                && request.evidenceImages().isEmpty()) throw new BadRequestException("Kết luận đối chiếu phải có ảnh bằng chứng");
        if (request.result() == Result.CHECKED && request.validUntil() == null)
            throw new BadRequestException("Cần ghi rõ ngày hết hiệu lực của hạng mục đã đối chiếu");
        RoomInspection entry = RoomInspection.builder().room(room).inspector(users.getReferenceById(inspectorId))
                .category(request.category()).result(request.result()).inspectedOn(request.inspectedOn())
                .validUntil(request.validUntil()).method(request.method()).findings(request.findings())
                .evidenceImages(new ArrayList<>(request.evidenceImages())).build();
        return InspectionResponse.fromEntity(inspections.save(entry));
    }

    @Transactional
    public InspectionResponse requestInspection(UUID roomId, UUID landlordId, InspectionApplicationRequest req) {
        Room room = rooms.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room", "id", roomId));
        if (!room.getRental().getOwner().getId().equals(landlordId)) {
            User u = users.findById(landlordId).orElseThrow(() -> new ResourceNotFoundException("User", "id", landlordId));
            if (u.getRole() != UserRole.ADMIN && u.getRole() != UserRole.MODERATOR) {
                throw new ForbiddenException("Chỉ chủ sở hữu phòng mới có quyền gửi yêu cầu kiểm định");
            }
        }

        org.springframework.data.domain.Page<User> modPage = users.findByRole(UserRole.MODERATOR, org.springframework.data.domain.PageRequest.of(0, 1));
        User inspector = modPage.hasContent() ? modPage.getContent().get(0) : null;
        if (inspector == null) {
            org.springframework.data.domain.Page<User> adminPage = users.findByRole(UserRole.ADMIN, org.springframework.data.domain.PageRequest.of(0, 1));
            inspector = adminPage.hasContent() ? adminPage.getContent().get(0) : null;
        }
        if (inspector == null) {
            inspector = users.findAll().stream().filter(usr -> !usr.getId().equals(landlordId)).findFirst()
                    .orElse(users.getReferenceById(landlordId));
        }

        String findings = "Yêu cầu kiểm định phòng: " + (req.notes() != null && !req.notes().isBlank() ? req.notes() : "Khảo sát & đối chiếu trực tiếp hiện trạng")
                + " | Khung giờ: " + (req.preferredTimeSlot() != null ? req.preferredTimeSlot() : "Giờ hành chính")
                + " | Hotline chủ trọ: " + (req.contactPhone() != null ? req.contactPhone() : "Chưa cung cấp");

        RoomInspection entry = RoomInspection.builder()
                .room(room)
                .inspector(inspector)
                .category(req.category() != null ? req.category() : RoomInspection.Category.CONDITION)
                .result(Result.UNDER_REVIEW)
                .inspectedOn(req.preferredDate() != null ? req.preferredDate() : java.time.LocalDate.now())
                .validUntil(null)
                .method("Đã tiếp nhận yêu cầu từ chủ nhà — Đang điều phối kiểm định viên trực tiếp")
                .findings(findings)
                .evidenceImages(new ArrayList<>())
                .recordedAt(java.time.LocalDateTime.now())
                .build();
        return InspectionResponse.fromEntity(inspections.save(entry));
    }
}
