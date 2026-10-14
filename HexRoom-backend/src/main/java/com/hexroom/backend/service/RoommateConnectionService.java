package com.hexroom.backend.service;

import com.hexroom.backend.common.PagedResponse;
import com.hexroom.backend.entity.*;
import com.hexroom.backend.entity.RoommateConnection.Status;
import com.hexroom.backend.entity.enums.UserStatus;
import com.hexroom.backend.exception.*;
import com.hexroom.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class RoommateConnectionService {
    private final RoommateConnectionRepository connections;
    private final RoommateMessageRepository messages;
    private final RoommateProfileRepository profiles;
    private final RoommateBlockRepository blocks;
    private final RoommateReportRepository reports;
    private final UserRepository users;

    public record ConnectionView(UUID id, String nickname, Status status, boolean incoming, boolean canChat,
            boolean blockedByMe, String introduction, LocalDateTime updatedAt) {}
    public record MessageView(Long id, boolean mine, String content, LocalDateTime createdAt) {}
    public record MessagePage(List<MessageView> items, boolean hasMore) {}
    public record ReportView(UUID id, UUID connectionId, String reporter, String reason, String reportedMessage,
            RoommateReport.Status status, LocalDateTime createdAt, String resolution) {}

    private String pairKey(UUID a, UUID b) {
        return a.toString().compareTo(b.toString()) < 0 ? a + ":" + b : b + ":" + a;
    }
    // Every pair mutation acquires the same two user locks in the same order.
    private void lockPair(UUID a, UUID b) {
        List<UUID> ordered = new ArrayList<>(List.of(a, b)); ordered.sort(Comparator.comparing(UUID::toString));
        for (UUID id : ordered) users.lockById(id).orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }
    private UUID peer(RoommateConnection connection, UUID userId) {
        if (connection.getSender().getId().equals(userId)) return connection.getRecipient().getId();
        if (connection.getRecipient().getId().equals(userId)) return connection.getSender().getId();
        throw new ForbiddenException("Bạn không tham gia cuộc trò chuyện này");
    }
    private RoommateConnection member(UUID id, UUID userId) {
        RoommateConnection c = connections.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lời mời", "id", id));
        peer(c, userId); return c;
    }
    private boolean blocked(UUID a, UUID b) {
        return blocks.existsByBlockerIdAndBlockedId(a, b) || blocks.existsByBlockerIdAndBlockedId(b, a);
    }
    private String nickname(UUID userId) {
        return profiles.findByUserId(userId).map(RoommateProfile::getNickname).orElse("Thành viên HexRoom");
    }
    private boolean active(RoommateConnection c) {
        return c.getSender().getStatus() == UserStatus.ACTIVE && c.getRecipient().getStatus() == UserStatus.ACTIVE;
    }
    private ConnectionView view(RoommateConnection c, UUID userId) {
        UUID other = peer(c, userId);
        return new ConnectionView(c.getId(), nickname(other), c.getStatus(), c.getRecipient().getId().equals(userId),
                c.getStatus() == Status.ACCEPTED && active(c) && !blocked(userId, other),
                blocks.existsByBlockerIdAndBlockedId(userId, other), c.getIntroduction(), c.getUpdatedAt());
    }
    private void requireChat(RoommateConnection c, UUID userId) {
        if (c.getStatus() != Status.ACCEPTED || !active(c) || blocked(userId, peer(c, userId)))
            throw new ForbiddenException("Cuộc trò chuyện chưa được đồng ý hoặc đã kết thúc");
    }

    @Transactional(readOnly = true)
    public PagedResponse<ConnectionView> list(UUID userId, int page) {
        return PagedResponse.fromPage(connections.findBySenderIdOrRecipientIdOrderByUpdatedAtDesc(userId, userId,
                PageRequest.of(Math.max(0, page - 1), 20)).map(c -> view(c, userId)));
    }
    @Transactional(readOnly = true)
    public ConnectionView get(UUID id, UUID userId) { return view(member(id, userId), userId); }

    @Transactional
    public ConnectionView invite(UUID userId, UUID profileId, String introduction) {
        RoommateProfile target = profiles.findById(profileId).orElseThrow(() -> new ResourceNotFoundException("Hồ sơ", "id", profileId));
        UUID other = target.getUser().getId();
        if (other.equals(userId)) throw new BadRequestException("Không thể tự gửi lời mời cho mình");
        lockPair(userId, other);
        RoommateProfile me = profiles.findByUserId(userId).orElseThrow(() -> new BadRequestException("Hãy lưu hồ sơ ở ghép trước"));
        if (target.getUser().getStatus() != UserStatus.ACTIVE || blocked(userId, other) || !RoommateService.compatible(me, target))
            throw new BadRequestException("Hồ sơ không còn đáp ứng điều kiện gửi lời mời. Vui lòng tải lại gợi ý.");
        String key = pairKey(userId, other);
        RoommateConnection c = connections.findByPairKey(key).orElseGet(RoommateConnection::new);
        if (c.getId() != null) {
            if (c.getStatus() == Status.ACCEPTED || c.getStatus() == Status.PENDING) return view(c, userId);
            if (c.getUpdatedAt().isAfter(LocalDateTime.now().minusDays(7)))
                throw new BadRequestException("Chờ 7 ngày sau khi lời mời kết thúc trước khi gửi lại");
        }
        c.setPairKey(key); c.setSender(me.getUser()); c.setRecipient(target.getUser()); c.setStatus(Status.PENDING);
        c.setIntroduction(introduction == null ? "" : introduction.strip()); c.setAcceptedAt(null);
        if (c.getCreatedAt() == null) c.setCreatedAt(LocalDateTime.now());
        c.setUpdatedAt(LocalDateTime.now());
        return view(connections.save(c), userId);
    }

    @Transactional
    public ConnectionView respond(UUID id, UUID userId, String action) {
        RoommateConnection c = member(id, userId); UUID other = peer(c, userId); lockPair(userId, other);
        // Refresh after waiting on the pair lock so a concurrent action cannot reuse stale consent.
        entityRefresh(c);
        switch (action) {
            case "ACCEPT", "DECLINE" -> {
                if (!c.getRecipient().getId().equals(userId)) throw new ForbiddenException("Chỉ người nhận được trả lời lời mời");
                if (c.getStatus() != Status.PENDING) throw new BadRequestException("Lời mời không còn chờ trả lời");
                if (action.equals("ACCEPT")) {
                    if (!active(c) || blocked(userId, other)) throw new ForbiddenException("Không thể chấp nhận lời mời này");
                    c.setStatus(Status.ACCEPTED); c.setAcceptedAt(LocalDateTime.now());
                } else c.setStatus(Status.DECLINED);
            }
            case "CANCEL" -> {
                if (!c.getSender().getId().equals(userId)) throw new ForbiddenException("Chỉ người gửi được thu hồi lời mời");
                if (c.getStatus() != Status.PENDING) throw new BadRequestException("Lời mời không còn chờ trả lời");
                c.setStatus(Status.CANCELLED);
            }
            case "END" -> {
                if (c.getStatus() != Status.ACCEPTED) throw new BadRequestException("Hai bên chưa ghép với nhau");
                c.setStatus(Status.ENDED);
            }
            default -> throw new BadRequestException("Thao tác không hợp lệ");
        }
        c.setUpdatedAt(LocalDateTime.now()); return view(c, userId);
    }

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private void entityRefresh(RoommateConnection c) { entityManager.refresh(c); }

    @Transactional
    public ConnectionView block(UUID id, UUID userId, boolean enabled) {
        RoommateConnection c = member(id, userId); UUID other = peer(c, userId); lockPair(userId, other); entityRefresh(c);
        if (enabled) {
            if (!blocks.existsByBlockerIdAndBlockedId(userId, other)) {
                RoommateBlock block = new RoommateBlock(); block.setBlocker(users.getReferenceById(userId));
                block.setBlocked(users.getReferenceById(other)); block.setCreatedAt(LocalDateTime.now()); blocks.save(block);
            }
            c.setStatus(Status.ENDED); c.setUpdatedAt(LocalDateTime.now());
        } else blocks.deleteByBlockerIdAndBlockedId(userId, other);
        return view(c, userId);
    }

    @Transactional(readOnly = true)
    public MessagePage history(UUID id, UUID userId, Long before, Long after) {
        RoommateConnection c = member(id, userId); requireChat(c, userId);
        if (before != null && after != null) throw new BadRequestException("Chỉ dùng một mốc phân trang tin nhắn");
        Pageable page = PageRequest.of(0, 51);
        List<RoommateMessage> rows = after != null ? messages.findByConnectionIdAndIdGreaterThanOrderByIdAsc(id, after, page)
                : before != null ? messages.findByConnectionIdAndIdLessThanOrderByIdDesc(id, before, page)
                : messages.findByConnectionIdOrderByIdDesc(id, page);
        boolean more = rows.size() > 50;
        List<RoommateMessage> limited = new ArrayList<>(rows.subList(0, Math.min(50, rows.size())));
        if (after == null) Collections.reverse(limited);
        return new MessagePage(limited.stream().map(m -> messageView(m, userId)).toList(), more);
    }
    private MessageView messageView(RoommateMessage message, UUID userId) {
        return new MessageView(message.getId(), message.getSender().getId().equals(userId), message.getContent(), message.getCreatedAt());
    }
    @Transactional
    public MessageView send(UUID id, UUID userId, String content, UUID clientId) {
        RoommateConnection c = member(id, userId); lockPair(userId, peer(c, userId)); entityRefresh(c); requireChat(c, userId);
        Optional<RoommateMessage> existing = messages.findByConnectionIdAndSenderIdAndClientId(id, userId, clientId);
        if (existing.isPresent()) return messageView(existing.get(), userId);
        if (content.strip().isEmpty()) throw new BadRequestException("Tin nhắn không được để trống");
        RoommateMessage m = new RoommateMessage(); m.setConnection(c); m.setSender(users.getReferenceById(userId));
        m.setClientId(clientId); m.setContent(content.strip()); m.setCreatedAt(LocalDateTime.now()); c.setUpdatedAt(m.getCreatedAt());
        return messageView(messages.save(m), userId);
    }
    @Transactional
    public UUID report(UUID id, UUID userId, String reason, Long messageId) {
        RoommateConnection c = member(id, userId);
        RoommateReport r = new RoommateReport(); r.setConnection(c); r.setReporter(users.getReferenceById(userId));
        r.setReason(reason.strip()); r.setStatus(RoommateReport.Status.OPEN); r.setCreatedAt(LocalDateTime.now());
        if (messageId != null) {
            RoommateMessage m = messages.findById(messageId).orElseThrow(() -> new BadRequestException("Tin nhắn không tồn tại"));
            if (!m.getConnection().getId().equals(id)) throw new ForbiddenException("Tin nhắn không thuộc cuộc trò chuyện này");
            r.setMessage(m);
        }
        return reports.save(r).getId();
    }
    private ReportView reportView(RoommateReport r) {
        return new ReportView(r.getId(), r.getConnection().getId(), nickname(r.getReporter().getId()), r.getReason(),
                r.getMessage() == null ? null : r.getMessage().getContent(), r.getStatus(), r.getCreatedAt(), r.getResolution());
    }
    @Transactional(readOnly = true)
    public PagedResponse<ReportView> reportQueue(int page) {
        return PagedResponse.fromPage(reports.findAll(PageRequest.of(Math.max(0, page - 1), 20, Sort.by("createdAt").descending())).map(this::reportView));
    }
    @Transactional
    public ReportView review(UUID id, UUID reviewer, RoommateReport.Status status, String resolution) {
        RoommateReport r = reports.findById(id).orElseThrow(() -> new ResourceNotFoundException("Phản ánh", "id", id));
        if (r.getConnection().getSender().getId().equals(reviewer) || r.getConnection().getRecipient().getId().equals(reviewer))
            throw new ForbiddenException("Không tự xử lý phản ánh của cuộc trò chuyện mình tham gia");
        if (status == RoommateReport.Status.RESOLVED && (resolution == null || resolution.isBlank()))
            throw new BadRequestException("Cần ghi kết quả xử lý trước khi đóng phản ánh");
        r.setStatus(status); r.setResolution(resolution); r.setReviewedBy(users.getReferenceById(reviewer)); r.setReviewedAt(LocalDateTime.now());
        return reportView(r);
    }
}
