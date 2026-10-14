import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/context/useAuth';
import {
    assignQueueItem,
    listModerationQueue,
    listQueueActivity,
    listModerators,
    releaseQueueItem,
    type ModerationQueueItem,
    type QueueActivityItem,
    type ModeratorListItem,
} from '../shared/moderator-storage';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'OPEN', label: 'Mở (chưa ai nhận)' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'RESOLVED', label: 'Đã xử lý' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'URGENT', label: 'Khẩn cấp' },
    { value: 'HIGH', label: 'Cao' },
    { value: 'NORMAL', label: 'Bình thường' },
    { value: 'LOW', label: 'Thấp' },
];

const CATEGORY_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'NEW_LISTING', label: 'Bài đăng mới' },
    { value: 'DOCUMENT_REVIEW', label: 'Xác minh tài liệu' },
    { value: 'REPORTED_CONTENT', label: 'Nội dung bị báo cáo' },
    { value: 'FEEDBACK_REVIEW', label: 'Đánh giá cần duyệt' },
    { value: 'USER_COMPLAINT', label: 'Khiếu nại người dùng' },
    { value: 'FRAUD_SUSPICION', label: 'Nghi ngờ gian lận' },
    { value: 'POLICY_VIOLATION', label: 'Vi phạm chính sách' },
];

const TARGET_TYPE_LABELS: Record<string, string> = {
    RENTAL: 'Nhà cho thuê',
    ROOM: 'Phòng trọ',
    REPORT: 'Báo cáo',
    FEEDBACK: 'Đánh giá',
    USER: 'Người dùng',
};

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getNavigatePath(item: ModerationQueueItem): string {
    const hl = `?highlight=${encodeURIComponent(item.target_id)}`;
    switch (item.target_type) {
        case 'RENTAL':
            return `/moderator/rentals${hl}`;
        case 'ROOM':
            return `/moderator/room-posts${hl}`;
        case 'REPORT':
            return `/moderator/reports${hl}`;
        case 'FEEDBACK':
            return `/moderator/reviews${hl}`;
        case 'USER':
            return `/moderator/users${hl}`;
        default:
            return '/moderator';
    }
}

/* ────────── Pagination Component ────────── */
function Pagination({
    page,
    totalPages,
    total,
    limit,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    // Generate page numbers to show
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        const start = Math.max(2, page - 1);
        const end = Math.min(totalPages - 1, page + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
                Hiển thị <span className="font-medium text-slate-700">{from}–{to}</span> trong{' '}
                <span className="font-medium text-slate-700">{total}</span> mục
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ‹ Trước
                </button>
                {pages.map((p, idx) =>
                    p === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 text-sm text-slate-400">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={`min-w-[36px] rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${
                                p === page
                                    ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Sau ›
                </button>
            </div>
        </div>
    );
}

/* ────────── Loading Skeleton ────────── */
function TableSkeleton({ rows = 5, cols = 9 }: { rows?: number; cols?: number }) {
    return (
        <div className="animate-pulse">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex gap-4">
                    {Array.from({ length: cols }).map((_, i) => (
                        <div key={i} className="h-4 flex-1 rounded bg-slate-200" />
                    ))}
                </div>
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 border-b border-slate-100 px-4 py-3">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="h-3.5 flex-1 rounded bg-slate-100" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function ModerationQueuePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [items, setItems] = useState<ModerationQueueItem[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('OPEN');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [myTasksOnly, setMyTasksOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'asc' | 'desc'>('desc');
    const [actingId, setActingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Queue activity (lịch sử claim/release/resolve)
    const [activityItems, setActivityItems] = useState<QueueActivityItem[]>([]);
    const [activityPagination, setActivityPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityExpanded, setActivityExpanded] = useState(false);
    const [activityActionFilter, setActivityActionFilter] = useState<'CLAIM' | 'RELEASE' | 'RESOLVE' | ''>('');
    const [activityPage, setActivityPage] = useState(1);
    const [activityDateFrom, setActivityDateFrom] = useState('');
    const [activityDateTo, setActivityDateTo] = useState('');
    const [activityModFilter, setActivityModFilter] = useState('');
    const [moderators, setModerators] = useState<ModeratorListItem[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<QueueActivityItem | null>(null);

    // Load moderator list for filter
    useEffect(() => {
        void listModerators().then(setModerators);
    }, []);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await listModerationQueue({
                status: statusFilter || undefined,
                priority: priorityFilter || undefined,
                category: categoryFilter || undefined,
                assignedTo: myTasksOnly && user?.id ? user.id : undefined,
                sortBy: sortBy,
                page: currentPage,
                limit: 10,
            });
            setItems(result.data);
            setPagination(result.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách');
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, priorityFilter, categoryFilter, myTasksOnly, sortBy, user?.id, currentPage]);

    useEffect(() => {
        void load();
    }, [load]);

    // Reset queue page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, priorityFilter, categoryFilter, myTasksOnly, sortBy]);

    const handleClaim = async (e: React.MouseEvent, item: ModerationQueueItem) => {
        e.stopPropagation();
        if (actingId) return;
        setActingId(item.id);
        try {
            const updated = await assignQueueItem(item.id);
            setItems((prev) =>
                prev.map((i) => (i.id === item.id ? updated : i))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nhận task thất bại');
        } finally {
            setActingId(null);
            loadActivity();
        }
    };

    const loadActivity = useCallback(async () => {
        setActivityLoading(true);
        try {
            const result = await listQueueActivity({
                page: activityPage,
                limit: 10,
                action: activityActionFilter || undefined,
                moderatorId: activityModFilter || undefined,
                dateFrom: activityDateFrom || undefined,
                dateTo: activityDateTo || undefined,
            });
            setActivityItems(result.data);
            setActivityPagination(result.pagination);
        } catch {
            setActivityItems([]);
        } finally {
            setActivityLoading(false);
        }
    }, [activityActionFilter, activityPage, activityModFilter, activityDateFrom, activityDateTo]);

    const handleRelease = async (e: React.MouseEvent, item: ModerationQueueItem) => {
        e.stopPropagation();
        if (actingId) return;
        setActingId(item.id);
        try {
            await releaseQueueItem(item.id);
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id
                        ? {
                            ...i,
                            status: 'OPEN',
                            assigned_to: null,
                            assigned_to_id: null,
                            assigned_at: null,
                        }
                        : i
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Trả task thất bại');
        } finally {
            setActingId(null);
            loadActivity();
        }
    };

    useEffect(() => {
        if (activityExpanded) void loadActivity();
    }, [activityExpanded, loadActivity]);

    // Reset activity page when activity filters change
    useEffect(() => {
        setActivityPage(1);
    }, [activityActionFilter, activityModFilter, activityDateFrom, activityDateTo]);

    const handleRowClick = (item: ModerationQueueItem) => {
        const path = getNavigatePath(item);
        navigate(path);
    };

    const isMyTask = (item: ModerationQueueItem) =>
        user?.id && item.assigned_to_id === user.id;

    return (
        <section className="mx-auto w-full max-w-7xl py-6">
            <header className="mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Moderation Queue
                    </h1>
                    {pagination.total > 0 && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {pagination.total} mục
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    Nội dung cần duyệt → vào Queue. Moderator nhận (claim) task → task bị
                    lock. Tránh trùng lặp khi nhiều người cùng duyệt.
                </p>
            </header>

            {error && (
                <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {error}
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-4">
                <div>
                    <label className="mr-2 text-sm text-slate-600">
                        Trạng thái:
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value || 'all'} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mr-2 text-sm text-slate-600">
                        Độ ưu tiên:
                    </label>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                        {PRIORITY_OPTIONS.map((opt) => (
                            <option key={opt.value || 'all'} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mr-2 text-sm text-slate-600">
                        Danh mục:
                    </label>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                        {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value || 'all'} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 mr-4">
                    <input
                        type="checkbox"
                        checked={myTasksOnly}
                        onChange={(e) => setMyTasksOnly(e.target.checked)}
                        className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">Chỉ task của tôi</span>
                </label>
                <div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'desc' | 'asc')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                        <option value="desc">Thời gian: Sớm nhất</option>
                        <option value="asc">Thời gian: Muộn nhất</option>
                    
                    </select>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {isLoading ? (
                    <TableSkeleton rows={5} cols={9} />
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <svg className="mb-3 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-sm font-medium text-slate-500">Không có mục nào trong queue</p>
                        <p className="text-xs text-slate-400">Thử thay đổi bộ lọc để xem thêm</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Loại
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            ID
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Danh mục
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Ưu tiên
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Trạng thái
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Giao cho
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Ngày tạo
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Ngày Resolve
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => handleRowClick(item)}
                                            className="cursor-pointer transition hover:bg-slate-50"
                                        >
                                            <td className="px-4 py-3 text-slate-800">
                                                {TARGET_TYPE_LABELS[item.target_type] ??
                                                    item.target_type}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                                {item.target_id.slice(0, 8)}...
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {CATEGORY_OPTIONS.find((o) => o.value === item.category)
                                                    ?.label ?? item.category}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                        item.priority === 'URGENT'
                                                            ? 'bg-red-100 text-red-700'
                                                            : item.priority === 'HIGH'
                                                              ? 'bg-amber-100 text-amber-700'
                                                              : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {item.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                        item.status === 'OPEN'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : item.status === 'IN_PROGRESS'
                                                              ? 'bg-blue-100 text-blue-700'
                                                              : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    {item.status === 'OPEN'
                                                        ? 'Mở'
                                                        : item.status === 'IN_PROGRESS'
                                                          ? 'Đang xử lý'
                                                          : item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {item.assigned_to ? (
                                                    <span
                                                        className={
                                                            isMyTask(item)
                                                                ? 'font-medium text-blue-600'
                                                                : ''
                                                        }
                                                    >
                                                        {item.assigned_to}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatDateTime(item.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {item.resolved_at
                                                    ? formatDateTime(item.resolved_at)
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                {item.status === 'OPEN' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleClaim(e, item)}
                                                        disabled={!!actingId}
                                                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        {actingId === item.id
                                                            ? 'Đang xử lý...'
                                                            : 'Nhận task'}
                                                    </button>
                                                )}
                                                {item.status === 'IN_PROGRESS' && isMyTask(item) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleRelease(e, item)}
                                                        disabled={!!actingId}
                                                        className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
                                                    >
                                                        {actingId === item.id
                                                            ? 'Đang xử lý...'
                                                            : 'Trả lại'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            total={pagination.total}
                            limit={pagination.limit}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* Lịch sử thao tác Queue */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                    type="button"
                    onClick={() => setActivityExpanded((v) => !v)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                            <svg
                                className="h-5 w-5 text-slate-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Lịch sử thao tác Queue
                            </h2>
                            <p className="text-sm text-slate-500">
                                Theo dõi ai nhận task, ai trả task, ai hoàn thành — minh bạch, tránh lạm dụng
                            </p>
                        </div>
                        {activityPagination.total > 0 && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                {activityPagination.total} bản ghi
                            </span>
                        )}
                    </div>
                    <svg
                        className={`h-5 w-5 text-slate-400 transition ${activityExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {activityExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-2">
                        {/* Filters row */}
                        <div className="mb-3 flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-slate-500">Hành động</label>
                                <select
                                    value={activityActionFilter}
                                    onChange={(e) =>
                                        setActivityActionFilter(
                                            e.target.value as 'CLAIM' | 'RELEASE' | 'RESOLVE' | ''
                                        )
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                                >
                                    <option value="">Tất cả hành động</option>
                                    <option value="CLAIM">Nhận task</option>
                                    <option value="RELEASE">Trả task</option>
                                    <option value="RESOLVE">Hoàn thành</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-500">Moderator</label>
                                <select
                                    value={activityModFilter}
                                    onChange={(e) => setActivityModFilter(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                                >
                                    <option value="">Tất cả moderator</option>
                                    {moderators.map((mod) => (
                                        <option key={mod.id} value={mod.id}>
                                            {mod.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
                                <input
                                    type="date"
                                    value={activityDateFrom}
                                    onChange={(e) => setActivityDateFrom(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
                                <input
                                    type="date"
                                    value={activityDateTo}
                                    onChange={(e) => setActivityDateTo(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActivityActionFilter('');
                                    setActivityModFilter('');
                                    setActivityDateFrom('');
                                    setActivityDateTo('');
                                }}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                            >
                                Xóa lọc
                            </button>
                            <button
                                type="button"
                                onClick={() => void loadActivity()}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                            >
                                Làm mới
                            </button>
                        </div>
                        {activityLoading ? (
                            <TableSkeleton rows={4} cols={5} />
                        ) : activityItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <svg className="mb-2 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-medium text-slate-500">Chưa có thao tác nào</p>
                                <p className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc khoảng thời gian</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-lg border border-slate-100">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-600">
                                                    Thời gian
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-600">
                                                    Người thao tác
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-600">
                                                    Hành động
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-600">
                                                    Nội dung
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-600">
                                                    Chi tiết
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {activityItems.map((act) => (
                                                <tr
                                                    key={act.id}
                                                    className="cursor-pointer transition hover:bg-slate-50"
                                                    onClick={() => setSelectedActivity(act)}
                                                >
                                                    <td className="px-4 py-2.5 text-slate-600">
                                                        {formatDateTime(act.created_at)}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-medium text-slate-800">
                                                        {act.moderator_name}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span
                                                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                                act.action === 'CLAIM'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : act.action === 'RESOLVE'
                                                                      ? 'bg-blue-100 text-blue-700'
                                                                      : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {act.action === 'CLAIM'
                                                                ? 'Nhận task'
                                                                : act.action === 'RESOLVE'
                                                                  ? 'Hoàn thành'
                                                                  : 'Trả task'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-600">
                                                        {TARGET_TYPE_LABELS[act.queue_target_type] ??
                                                            act.queue_target_type}{' '}
                                                        <span className="font-mono text-xs">
                                                            {act.queue_target_id?.slice(0, 8)}...
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-slate-400">
                                                            {act.previous_status} → {act.new_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    page={activityPagination.page}
                                    totalPages={activityPagination.totalPages}
                                    total={activityPagination.total}
                                    limit={activityPagination.limit}
                                    onPageChange={setActivityPage}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modal chi tiết thao tác */}
            {selectedActivity && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setSelectedActivity(null)}
                    role="dialog"
                    aria-modal
                >
                    <div
                        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">
                                Chi tiết thao tác
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedActivity(null)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-slate-500">Thời gian</dt>
                                <dd className="font-medium text-slate-900">
                                    {formatDateTime(selectedActivity.created_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Người thao tác</dt>
                                <dd className="font-medium text-slate-900">
                                    {selectedActivity.moderator_name}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Hành động</dt>
                                <dd>
                                    <span
                                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                            selectedActivity.action === 'CLAIM'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : selectedActivity.action === 'RESOLVE'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {selectedActivity.action === 'CLAIM'
                                            ? 'Nhận task'
                                            : selectedActivity.action === 'RESOLVE'
                                              ? 'Hoàn thành'
                                              : 'Trả task'}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Trạng thái</dt>
                                <dd className="text-slate-700">
                                    {selectedActivity.previous_status} →{' '}
                                    {selectedActivity.new_status}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Loại nội dung</dt>
                                <dd className="text-slate-700">
                                    {TARGET_TYPE_LABELS[selectedActivity.queue_target_type] ??
                                        selectedActivity.queue_target_type}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">ID nội dung</dt>
                                <dd className="font-mono text-xs text-slate-700">
                                    {selectedActivity.queue_target_id}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Danh mục</dt>
                                <dd className="text-slate-700">
                                    {CATEGORY_OPTIONS.find(
                                        (o) => o.value === selectedActivity.queue_category
                                    )?.label ?? selectedActivity.queue_category}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Queue item ID</dt>
                                <dd className="font-mono text-xs text-slate-500">
                                    {selectedActivity.queue_item_id}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            )}
        </section>
    );
}
