package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.room.RoomResponse;
import com.hexroom.backend.entity.*;
import com.hexroom.backend.entity.enums.*;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.*;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Pageable;
import java.util.*;

@RestController @RequestMapping("/api/favorites") @RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteRoomRepository favorites;
    private final RoomRepository rooms;
    private final UserRepository users;
    @GetMapping @Transactional(readOnly = true)
    public ApiResponse<List<RoomResponse>> list(@AuthenticationPrincipal UserPrincipal user) {
        return ApiResponse.success(favorites.findByIdUserId(user.getId(), Pageable.unpaged()).stream()
                .map(FavoriteRoom::getRoom)
                .filter(room -> room.getStatus() == RoomStatus.AVAILABLE && room.getRental().getStatus() == RentalStatus.AVAILABLE)
                .map(RoomResponse::fromEntity).toList());
    }
    @PostMapping("/{id}") @Transactional
    public ApiResponse<Map<String, UUID>> add(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        Room room = rooms.findById(id).orElseThrow(() -> new ResourceNotFoundException("Room", "id", id));
        RoomService.requirePublicRoom(room);
        FavoriteRoomId key = new FavoriteRoomId(user.getId(), id);
        if (!favorites.existsById(key)) favorites.save(FavoriteRoom.builder().id(key).room(room).user(users.getReferenceById(user.getId())).build());
        return ApiResponse.success(Map.of("roomId", id));
    }
    @DeleteMapping("/{id}") @Transactional
    public ApiResponse<Map<String, UUID>> remove(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        favorites.deleteByIdUserIdAndIdRoomId(user.getId(), id);
        return ApiResponse.success(Map.of("roomId", id));
    }
}
