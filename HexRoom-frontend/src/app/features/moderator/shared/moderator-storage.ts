import { authFetch } from '@/lib/api';
import type {
    HandleReportInput,
    ModerateRentalInput,
    ModerateReviewInput,
    ModerateRoomPostInput,
    ModeratedReview,
    ModerationDecision,
    ModerationHistoryRecord,
    RentalModerationItem,
    RentalDocument,
    RoomPostModerationItem,
    ViolationReport,
} from './types';

type ReportStatusEnum = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISMISSED';

const STORAGE_KEY = 'ezroom:moderator:state';

interface StoredModerationDecision {
    decision: ModerationDecision;
    moderated_at: string;
    note?: string;
}

interface ModeratorState {
    rental_decisions: Record<string, StoredModerationDecision>;
    room_post_decisions: Record<string, StoredModerationDecision>;
    reports: ViolationReport[];
    reviews: ModeratedReview[];
    history: ModerationHistoryRecord[];
}

function createDefaultState(): ModeratorState {
    return {
        rental_decisions: {},
        room_post_decisions: {},
        reports: [],
        reviews: [],
        history: [],
    };
}

function wait(ms = 120) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function createHistoryId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `moderation-history-${crypto.randomUUID()}`;
    }
    return `moderation-history-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function readState(): ModeratorState {
    if (typeof window === 'undefined') {
        return createDefaultState();
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return createDefaultState();
    }

    try {
        const parsed = JSON.parse(raw) as Partial<ModeratorState>;
        return {
            rental_decisions: parsed.rental_decisions ?? {},
            room_post_decisions: parsed.room_post_decisions ?? {},
            reports: Array.isArray(parsed.reports) ? parsed.reports : [],
            reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
        };
    } catch {
        return createDefaultState();
    }
}

function writeState(state: ModeratorState) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deriveRentalModerationStatus(rentalStatus: string): ModerationDecision {
    if (rentalStatus === 'PENDING' || rentalStatus === 'HIDDEN') return 'pending_review';
    if (rentalStatus === 'VIOLATE') return 'rejected';
    return 'approved';
}

export async function listRentalModerationItems() {
    try {
        const res = await authFetch('/moderator/rentals/moderation');
        const response = await res.json();
        if (!res.ok) throw new Error(response?.message || 'Lấy danh sách duyệt thất bại');
        const state = readState();

        interface RentalApiItem {
            id: string;
            owner?: { fullName?: string; id?: string; email?: string; phone?: string };
            title?: string;
            description?: string;
            location?: { city?: string; district?: string; address?: string };
            createdAt?: string;
            status?: string;
            images?: string[];
            documents?: unknown[];
            roomsCount?: number;
        }
        const result: RentalModerationItem[] = (response.data as RentalApiItem[]).map((rental) => {
            const decision = state.rental_decisions[rental.id];
            return {
                rental_id: rental.id,
                user_id: rental.owner?.fullName ?? rental.owner?.id ?? '--',
                title: rental.title ?? '',
                description: rental.description ?? undefined,
                city: rental.location?.city ?? '',
                district: rental.location?.district ?? '',
                address: rental.location?.address ?? '',
                property_type: 'house',
                created_at: (rental.createdAt ? String(rental.createdAt) : new Date().toISOString()),
                listing_status: rental.status ?? 'PENDING',
                moderation_status: decision?.decision ?? deriveRentalModerationStatus(rental.status ?? 'PENDING'),
                last_moderated_at: decision?.moderated_at,
                last_note: decision?.note,
                images: rental.images,
                documents: (rental.documents ?? []) as RentalDocument[],
                owner_email: rental.owner?.email,
                owner_phone: rental.owner?.phone,
                rooms_count: rental.roomsCount,
            };
        });

        return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
        console.error('Failed to fetch rentals for moderation:', err);
        return [];
    }
}

export async function moderateRental(input: ModerateRentalInput) {
    await wait();
    const state = readState();
    const moderatedAt = new Date().toISOString();

    state.rental_decisions[input.rental_id] = {
        decision: input.decision,
        moderated_at: moderatedAt,
        note: input.note?.trim() || undefined,
    };

    state.history.unshift({
        history_id: createHistoryId(),
        target_type: 'rental',
        target_id: input.rental_id,
        action: input.decision === 'approved' ? 'approve_listing' : 'reject_listing',
        note: input.note?.trim() || undefined,
        moderator_id: input.moderator_id,
        created_at: moderatedAt,
    });

    writeState(state);

    try {
        await authFetch(`/moderator/rentals/${input.rental_id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: input.decision === 'approved' ? 'AVAILABLE' : 'HIDDEN' }),
        });
    } catch (err) {
        console.error('Failed to update rental status via API:', err);
    }
}

export async function listRoomPostModerationItems() {
    await wait();

    interface RoomApiItem {
        room_post_id: string;
        rental_id: string;
        title: string;
        price: number;
        area: number;
        max_occupants: number;
        status: string;
        created_at: string;
        moderation_status?: string;
        images?: string[];
        amenities?: Array<{ id: string; name: string }>;
        description?: string;
    }
    interface RentalApiItem {
        id: string;
        title: string;
        owner?: { fullName?: string; email?: string; phone?: string };
    }

    const fetchRooms = async (): Promise<RoomApiItem[]> => {
        const res = await authFetch('/moderator/rooms');
        const json = await res.json();
        return json.data || [];
    };
    const fetchRentals = async (): Promise<{ data: RentalApiItem[] }> => {
        const res = await authFetch('/moderator/rentals/moderation');
        const json = await res.json();
        return { data: json.data || [] };
    };

    const [posts, rentalsResponse] = await Promise.all([
        fetchRooms(),
        fetchRentals().catch(() => ({ data: [] as RentalApiItem[] })),
    ]);

    interface RentalInfo {
        title: string;
        owner_name?: string;
        owner_email?: string;
        owner_phone?: string;
    }
    const rentalMap = new Map<string, RentalInfo>();
    for (const r of rentalsResponse.data) {
        rentalMap.set(r.id, {
            title: r.title,
            owner_name: r.owner?.fullName ?? undefined,
            owner_email: r.owner?.email ?? undefined,
            owner_phone: r.owner?.phone ?? undefined,
        });
    }

    const state = readState();

    const deriveStatus = (roomStatus: string): ModerationDecision => {
        if (roomStatus === 'PENDING') return 'pending_review';
        if (roomStatus === 'MAINTENANCE') return 'rejected';
        return 'approved';
    };

    const result: RoomPostModerationItem[] = posts.map((post) => {
        const decision = state.room_post_decisions[post.room_post_id];
        const rentalInfo = rentalMap.get(post.rental_id);
        return {
            room_post_id: post.room_post_id,
            rental_id: post.rental_id,
            rental_title: rentalInfo?.title ?? post.rental_id,
            title: post.title,
            price: post.price,
            area: post.area,
            max_occupants: post.max_occupants,
            created_at: post.created_at,
            listing_status: post.status,
            moderation_status: decision?.decision ?? post.moderation_status ?? deriveStatus(post.status),
            last_moderated_at: decision?.moderated_at,
            last_note: decision?.note,
            images: post.images,
            amenities: post.amenities,
            description: post.description,
            owner_name: rentalInfo?.owner_name,
            owner_email: rentalInfo?.owner_email,
            owner_phone: rentalInfo?.owner_phone,
        };
    });

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function moderateRoomPost(input: ModerateRoomPostInput) {
    await wait();
    const state = readState();
    const moderatedAt = new Date().toISOString();

    state.room_post_decisions[input.room_post_id] = {
        decision: input.decision,
        moderated_at: moderatedAt,
        note: input.note?.trim() || undefined,
    };

    state.history.unshift({
        history_id: createHistoryId(),
        target_type: 'room_post',
        target_id: input.room_post_id,
        action: input.decision === 'approved' ? 'approve_room_post' : 'reject_room_post',
        note: input.note?.trim() || undefined,
        moderator_id: input.moderator_id,
        created_at: moderatedAt,
    });

    writeState(state);
    try {
        await authFetch(`/moderator/rooms/${input.room_post_id}/moderate`, {
            method: 'PUT',
            body: JSON.stringify({ decision: input.decision, note: input.note }),
        });
    } catch (err) {
        console.error('Failed to moderate room post via API:', err);
    }
}

export async function listViolationReports(): Promise<ViolationReport[]> {
    try {
        const res = await authFetch('/moderator/reports?limit=100');
        const response = await res.json();
        if (!res.ok) throw new Error(response?.message || 'Lỗi tải danh sách báo cáo');
        interface BackendReport {
            id: string;
            reporterId: string;
            targetType: string;
            targetId: string;
            reason: string;
            description: string | null;
            status: ReportStatusEnum;
            reviewedAt: string | null;
            createdAt: string;
            reporter?: { fullName: string; email: string; phone: string | null };
            targetUser?: { fullName: string; email: string; phone: string | null } | null;
        }

        return (response.data || []).map((r: BackendReport) => {
            let status: ViolationReport['status'] = 'open';
            if (r.status === 'APPROVED' || r.status === 'REJECTED') status = 'resolved';
            else if (r.status === 'DISMISSED') status = 'dismissed';

            let target_type: ViolationReport['target_type'] = 'user';
            if (r.targetType === 'ROOM') target_type = 'room_post';
            else if (r.targetType === 'REVIEW') target_type = 'review';
            else if (r.targetType === 'BOOKING') target_type = 'rental';

            let action_taken: ViolationReport['action_taken'] | undefined;
            if (r.status === 'APPROVED') action_taken = 'warning';
            else if (r.status === 'DISMISSED') action_taken = 'dismiss_report';
            else if (r.status === 'REJECTED') action_taken = 'remove_content';

            return {
                report_id: r.id,
                reporter_id: r.reporter?.fullName ?? r.reporterId,
                reporter_email: r.reporter?.email,
                reporter_phone: r.reporter?.phone ?? undefined,
                target_user_id: r.targetUser?.fullName ?? r.targetId,
                target_user_name: r.targetUser?.fullName,
                target_user_email: r.targetUser?.email,
                target_user_phone: r.targetUser?.phone ?? undefined,
                target_type,
                target_id: r.targetId,
                category: r.reason as ViolationReport['category'],
                details: r.description ?? '',
                status,
                action_taken,
                created_at: r.createdAt,
                resolved_at: r.reviewedAt ?? undefined,
            } satisfies ViolationReport;
        }).sort((a: ViolationReport, b: ViolationReport) => {
            if (a.status === b.status) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (a.status === 'open') return -1;
            if (b.status === 'open') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    } catch (err) {
        console.error('Failed to fetch reports from API, falling back to local:', err);
        await wait();
        const state = readState();
        return [...state.reports].sort((a, b) => {
            if (a.status === b.status) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (a.status === 'open') return -1;
            if (b.status === 'open') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }
}

export async function handleViolationReport(input: HandleReportInput) {
    // Map frontend action -> report_status_enum (BE)
    let backendStatus: Exclude<ReportStatusEnum, 'PENDING'>;
    if (input.action === 'dismiss_report') {
        backendStatus = 'DISMISSED';
    } else {
        // Any other corrective action implies the violation was verified
        backendStatus = 'APPROVED';
    }

    try {
        const res = await authFetch(`/moderator/reports/${encodeURIComponent(input.report_id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: backendStatus,
                actionTaken: input.action,
                moderatorNote: input.note?.trim() || undefined,
            }),
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.message || 'Xử lý báo cáo thất bại');
        }
    } catch (err) {
        console.error('Failed to handle report via API, falling back to local:', err);
        // Fallback to local storage if API fails
        await wait();
        const state = readState();
        const resolvedAt = new Date().toISOString();
        const status = input.action === 'dismiss_report' ? 'dismissed' : 'resolved';

        state.reports = state.reports.map((report) =>
            report.report_id === input.report_id
                ? {
                    ...report,
                    status,
                    action_taken: input.action,
                    resolved_at: resolvedAt,
                }
                : report
        );

        state.history.unshift({
            history_id: createHistoryId(),
            target_type: 'report',
            target_id: input.report_id,
            action: input.action,
            note: input.note?.trim() || undefined,
            moderator_id: input.moderator_id,
            created_at: resolvedAt,
        });

        writeState(state);
    }
}

export type FeedbackStatusEnum = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ModeratorReviewFilters {
    status?: FeedbackStatusEnum;
    roomId?: string;
    tenantId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export interface ModeratorReviewItem {
    id: string;
    review_id: string;
    reviewer_id: string;
    reviewer_name: string | null;
    reviewer_email: string | null;
    reviewer_avatar: string | null;
    target_type: string;
    target_id: string;
    room_name: string | null;
    room_address: string | null;
    room_image_url: string | null;
    rating: number;
    content: string | null;
    status: FeedbackStatusEnum;
    reviewed_by: string | null;
    reviewed_at: string | null;
    moderator_note: string | null;
    created_at: string;
}

export interface ModeratorReviewDetail {
    id: string;
    status: FeedbackStatusEnum;
    rating: number;
    comment: string | null;
    cleanlinessRating: number | null;
    locationRating: number | null;
    valueRating: number | null;
    landlordRating: number | null;
    created_at: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    moderator_note: string | null;
    moderator_name: string | null;
    tenant: {
        id: string;
        fullName: string;
        email: string;
        avatarUrl: string | null;
    } | null;
    room: {
        id: string;
        roomName: string;
        address: string;
        images: string[];
    } | null;
    contract: {
        startDate: string;
        endDate: string | null;
        actualPrice: number;
        daysRented: number | null;
    } | null;
}

export async function listModeratedReviews(
    filters?: ModeratorReviewFilters
): Promise<{ items: ModeratorReviewItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
        const params = new URLSearchParams();
        params.set('limit', String(filters?.limit ?? 100));
        if (filters?.status) params.set('status', filters.status);
        if (filters?.roomId) params.set('roomId', filters.roomId);
        if (filters?.tenantId) params.set('tenantId', filters.tenantId);
        if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters?.dateTo) params.set('dateTo', filters.dateTo);
        if (filters?.page) params.set('page', String(filters.page));

        const res = await authFetch(`/moderator/reviews?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Lỗi tải danh sách đánh giá');

        const data = (json.data || []) as Array<Record<string, unknown>>;
        const items: ModeratorReviewItem[] = data.map((r) => ({
            id: r.id as string,
            review_id: r.review_id as string,
            reviewer_id: r.reviewer_id as string,
            reviewer_name: (r.reviewer_name as string) ?? null,
            reviewer_email: (r.reviewer_email as string) ?? null,
            reviewer_avatar: (r.reviewer_avatar as string) ?? null,
            target_type: (r.target_type as string) ?? 'ROOM',
            target_id: r.target_id as string,
            room_name: (r.room_name as string) ?? null,
            room_address: (r.room_address as string) ?? null,
            room_image_url: (r.room_image_url as string) ?? null,
            rating: (r.rating as number) ?? 0,
            content: (r.content as string) ?? null,
            status: (r.status as FeedbackStatusEnum) ?? 'PENDING',
            reviewed_by: (r.reviewed_by as string) ?? null,
            reviewed_at: (r.reviewed_at as string) ?? null,
            moderator_note: (r.moderator_note as string) ?? null,
            created_at: (r.created_at as string) ?? new Date().toISOString(),
        }));

        return {
            items,
            pagination: json.pagination ?? { page: 1, limit: 100, total: items.length, totalPages: 1 },
        };
    } catch (err) {
        console.error('Failed to fetch reviews:', err);
        return { items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } };
    }
}

export async function getReviewDetail(
    reviewId: string
): Promise<ModeratorReviewDetail | null> {
    try {
        const res = await authFetch(`/moderator/reviews/${encodeURIComponent(reviewId)}`);
        const json = await res.json();
        if (!res.ok) return null;
        return json.data as ModeratorReviewDetail;
    } catch (err) {
        console.error('Failed to fetch review detail:', err);
        return null;
    }
}

export async function moderateReviewStatus(
    reviewId: string,
    status: 'APPROVED' | 'REJECTED',
    moderatorNote?: string
): Promise<void> {
    const res = await authFetch(`/moderator/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
            status,
            moderatorNote: moderatorNote?.trim() || undefined,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Xử lý đánh giá thất bại');
}

/** @deprecated Use moderateReviewStatus for new flow */
export async function moderateReview(input: ModerateReviewInput) {
    let status: 'APPROVED' | 'REJECTED';
    if (input.action === 'approve') status = 'APPROVED';
    else status = 'REJECTED';
    await moderateReviewStatus(input.review_id, status, input.note);
}

export async function listModeratorLogs(params?: {
    page?: number;
    limit?: number;
    targetType?: string;
    action?: string;
    moderatorId?: string;
}): Promise<{
    data: ModerationHistoryRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.targetType) searchParams.set('targetType', params.targetType);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.moderatorId) searchParams.set('moderatorId', params.moderatorId);

    const res = await authFetch(`/moderator/logs?${searchParams.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Lỗi tải lịch sử moderation');

    const rawItems = (json.data || []) as Array<{
        id: string;
        moderator_id: string;
        target_type: string;
        target_id: string;
        action: string;
        previous_status?: string;
        new_status?: string;
        note?: string | null;
        created_at: string;
        users?: { id: string; fullName: string } | null;
    }>;

    const targetTypeMap: Record<string, ModerationHistoryRecord['target_type']> = {
        RENTAL: 'rental',
        ROOM: 'room_post',
        REPORT: 'report',
        FEEDBACK: 'review',
        USER: 'user',
    };

    const data: ModerationHistoryRecord[] = rawItems.map((item) => ({
        history_id: item.id,
        target_type: targetTypeMap[item.target_type] ?? (item.target_type?.toLowerCase() as ModerationHistoryRecord['target_type']),
        target_id: item.target_id,
        action: item.action,
        note: item.note ?? undefined,
        moderator_id: item.users?.fullName ?? item.moderator_id,
        created_at: item.created_at,
    }));

    return {
        data,
        pagination: json.pagination ?? { page: 1, limit: 20, total: data.length, totalPages: 1 },
    };
}

export async function listModerationHistory(): Promise<ModerationHistoryRecord[]> {
    try {
        const result = await listModeratorLogs({ page: 1, limit: 50 });
        return result.data;
    } catch {
        const state = readState();
        return [...state.history].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
}

export interface ModerationQueueItem {
    id: string;
    target_type: string;
    target_id: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
    assigned_to: string | null;
    assigned_to_id: string | null;
    assigned_at: string | null;
}

export async function listModerationQueue(filters: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    sortBy?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}): Promise<{
    data: ModerationQueueItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.category) params.set('category', filters.category);
    if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);

    const res = await authFetch(`/moderator/queue?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Lỗi tải moderation queue');

    const rawItems = (json.data || []) as Array<{
        id: string;
        target_type: string;
        target_id: string;
        category: string;
        priority: string;
        status: string;
        created_at: string;
        resolved_at: string | null;
        assigned_to: string | null;
        assigned_at: string | null;
        users?: { id: string; fullName: string } | null;
    }>;

    const data: ModerationQueueItem[] = rawItems.map((item) => ({
        id: item.id,
        target_type: item.target_type,
        target_id: item.target_id,
        category: item.category,
        priority: item.priority,
        status: item.status,
        created_at: item.created_at,
        resolved_at: item.resolved_at ?? null,
        assigned_to: item.users?.fullName ?? item.assigned_to ?? null,
        assigned_to_id: item.users?.id ?? item.assigned_to ?? null,
        assigned_at: item.assigned_at ?? null,
    }));

    return {
        data,
        pagination: json.pagination ?? { page: 1, limit: 20, total: data.length, totalPages: 1 },
    };
}

export async function assignQueueItem(queueItemId: string, assignTo?: string): Promise<ModerationQueueItem> {
    const res = await authFetch(`/moderator/queue/${encodeURIComponent(queueItemId)}/assign`, {
        method: 'PATCH',
        body: JSON.stringify(assignTo ? { assignTo } : {}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Nhận task thất bại');
    const item = json.data as { users?: { id: string; fullName: string } | null };
    return {
        id: json.data.id,
        target_type: json.data.target_type,
        target_id: json.data.target_id,
        category: json.data.category,
        priority: json.data.priority,
        status: json.data.status,
        created_at: json.data.created_at,
        resolved_at: json.data.resolved_at ?? null,
        assigned_to: item.users?.fullName ?? json.data.assigned_to ?? null,
        assigned_to_id: item.users?.id ?? json.data.assigned_to ?? null,
        assigned_at: json.data.assigned_at ?? null,
    };
}

export interface QueueActivityItem {
    id: string;
    moderator_id: string;
    moderator_name: string;
    action: 'CLAIM' | 'RELEASE' | 'RESOLVE';
    queue_item_id: string;
    queue_target_type: string;
    queue_target_id: string;
    queue_category: string;
    previous_status: string;
    new_status: string;
    created_at: string;
}

export async function listQueueActivity(params?: {
    page?: number;
    limit?: number;
    action?: 'CLAIM' | 'RELEASE' | 'RESOLVE';
    moderatorId?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<{
    data: QueueActivityItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.action) searchParams.set('action', params.action);
    if (params?.moderatorId) searchParams.set('moderatorId', params.moderatorId);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);

    const res = await authFetch(`/moderator/queue/activity?${searchParams.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Lỗi tải lịch sử thao tác queue');

    const rawItems = (json.data || []) as Array<{
        id: string;
        moderator_id: string;
        action: string;
        target_id: string;
        previous_status: string | null;
        new_status: string | null;
        metadata?: { queue_target_type?: string; queue_target_id?: string; queue_category?: string } | null;
        created_at: string;
        users?: { id: string; fullName: string; email?: string } | null;
    }>;

    const data: QueueActivityItem[] = rawItems.map((item) => ({
        id: item.id,
        moderator_id: item.moderator_id,
        moderator_name: item.users?.fullName ?? item.moderator_id,
        action: item.action as 'CLAIM' | 'RELEASE' | 'RESOLVE',
        queue_item_id: item.target_id,
        queue_target_type: item.metadata?.queue_target_type ?? '—',
        queue_target_id: item.metadata?.queue_target_id ?? '—',
        queue_category: item.metadata?.queue_category ?? '—',
        previous_status: item.previous_status ?? '—',
        new_status: item.new_status ?? '—',
        created_at: item.created_at,
    }));

    return {
        data,
        pagination: json.pagination ?? { page: 1, limit: 20, total: data.length, totalPages: 1 },
    };
}

export interface ModeratorListItem {
    id: string;
    fullName: string;
    email: string;
}

export async function listModerators(): Promise<ModeratorListItem[]> {
    try {
        const res = await authFetch('/moderator/moderators');
        const json = await res.json();
        if (!res.ok) return [];
        return (json.data || []) as ModeratorListItem[];
    } catch {
        return [];
    }
}

export async function releaseQueueItem(id: string) {
    const res = await authFetch(`/moderator/queue/${id}/release`, {
        method: 'PATCH',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Không thể trả task');
    }
    return res.json();
}

export interface QueueLockStatus {
    hasQueue: boolean;
    queueId?: string;
    status?: 'OPEN' | 'IN_PROGRESS';
    assignedTo?: string | null;
    assignedToName?: string | null;
}

export async function checkQueueStatus(targetType: string, targetId: string): Promise<QueueLockStatus> {
    try {
        const res = await authFetch(
            `/moderator/queue/check?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`
        );
        const json = await res.json();
        if (!res.ok) return { hasQueue: false };
        return json.data as QueueLockStatus;
    } catch {
        return { hasQueue: false };
    }
}

export async function getModeratorOverview() {
    try {
        const res = await authFetch('/moderator/overview');
        const json = await res.json();
        if (res.ok && json.data) {
            return json.data;
        }
    } catch (err) {
        console.error('Failed to fetch moderator overview:', err);
    }
    
    // Fallback to zeros if API fails
    return {
        openQueueCount: 0,
        pendingRentalCount: 0,
        pendingRoomPostCount: 0,
        openReportCount: 0,
        flaggedReviewCount: 0,
        resolvedReportCount: 0,
        approvedRentalCount: 0,
        approvedRoomPostCount: 0,
        approvedReviewCount: 0,
        rejectedReviewCount: 0,
    };
}

export interface ModeratorKpiItem {
    moderatorId: string;
    moderatorName: string;
    totalActions: number;
    approvals: number;
    rejections: number;
    reportHandled: number;
    reviewHandled: number;
    avgPerDay: number;
    approvalRate: number | null;
}

export interface ModeratorKpiData {
    period: { days: number; since: string };
    moderators: ModeratorKpiItem[];
    trend: Array<{ date: string; count: number }>;
    actionBreakdown: Record<string, number>;
    totals: {
        totalActions: number;
        totalApprovals: number;
        totalRejections: number;
        totalReportsHandled: number;
        totalReviewsHandled: number;
    };
}

export async function getModeratorKpi(days = 30): Promise<ModeratorKpiData | null> {
    try {
        const res = await authFetch(`/moderator/kpi?days=${days}`);
        const json = await res.json();
        if (res.ok && json.data) return json.data as ModeratorKpiData;
    } catch (err) {
        console.error('Failed to fetch moderator KPI:', err);
    }
    return null;
}
