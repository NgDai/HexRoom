import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/context/useAuth';
import {
    checkQueueStatus,
    getReviewDetail,
    listModeratedReviews,
    moderateReviewStatus,
    type FeedbackStatusEnum,
    type ModeratorReviewDetail,
    type ModeratorReviewItem,
    type QueueLockStatus,
} from '../shared/moderator-storage';

const TAB_ALL = 'all';
const TABS: { value: string; label: string; status?: FeedbackStatusEnum }[] = [
    { value: TAB_ALL, label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ duyệt', status: 'PENDING' },
    { value: 'APPROVED', label: 'Đã duyệt', status: 'APPROVED' },
    { value: 'REJECTED', label: 'Đã từ chối', status: 'REJECTED' },
];

const STATUS_BADGE: Record<FeedbackStatusEnum, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
};

const STATUS_LABEL: Record<FeedbackStatusEnum, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
};

function formatDateTime(dateString?: string | null) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDate(dateString?: string | null) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

export function ModerateReviewsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const highlightApplied = useRef(false);

    const [items, setItems] = useState<ModeratorReviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>(highlightId ? TAB_ALL : 'PENDING');
    const [selectedId, setSelectedId] = useState<string>(highlightId ?? '');
    const [detail, setDetail] = useState<ModeratorReviewDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [moderatorNote, setModeratorNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [queueLock, setQueueLock] = useState<QueueLockStatus>({ hasQueue: false });
    const { user } = useAuth();

    const statusFilter = activeTab === TAB_ALL ? undefined : (activeTab as FeedbackStatusEnum);
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;
    const detailCache = useRef<Record<string, ModeratorReviewDetail | null>>({});

    const loadList = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await listModeratedReviews({
                status: statusFilter,
                limit: 50,
            });
            setItems(res.items);
            const currentSelected = selectedIdRef.current;
            if (res.items.length > 0 && !res.items.some((i) => i.id === currentSelected)) {
                setSelectedId(res.items[0].id);
            } else if (res.items.length === 0) {
                setSelectedId('');
                setDetail(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải danh sách');
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        void loadList();
    }, [loadList]);

    // Auto-select highlighted item from queue navigation
    useEffect(() => {
        if (highlightId && !highlightApplied.current && items.length > 0) {
            const exists = items.some((item) => item.id === highlightId);
            if (exists) {
                setSelectedId(highlightId);
            }
            highlightApplied.current = true;
            setSearchParams({}, { replace: true });
        }
    }, [items, highlightId, setSearchParams]);

    useEffect(() => {
        detailCache.current = {};
    }, [statusFilter]);

    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        const cached = detailCache.current[selectedId];
        if (cached !== undefined) {
            setDetail(cached);
            return;
        }
        let cancelled = false;
        setDetailLoading(true);
        getReviewDetail(selectedId).then((d) => {
            if (!cancelled) {
                const value = d ?? null;
                detailCache.current[selectedId] = value;
                setDetail(value);
            }
            setDetailLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    // Check queue lock status when selection changes
    useEffect(() => {
        if (!selectedId) { setQueueLock({ hasQueue: false }); return; }
        checkQueueStatus('FEEDBACK', selectedId).then(setQueueLock);
    }, [selectedId]);

    const invalidateDetailCache = useCallback((id: string) => {
        delete detailCache.current[id];
    }, []);

    const refreshDetailForSelection = useCallback(async () => {
        if (!selectedId) return;
        const d = await getReviewDetail(selectedId);
        detailCache.current[selectedId] = d ?? null;
        setDetail(d ?? null);
    }, [selectedId]);

    const selectedItem = items.find((i) => i.id === selectedId) ?? null;

    const isLocked = queueLock.hasQueue && (queueLock.status === 'OPEN' || (queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id));

    const canApprove = selectedItem?.status === 'PENDING' && !isLocked;
    const canReject = selectedItem?.status === 'PENDING' && !isLocked;
    const alreadyProcessed = selectedItem?.status !== 'PENDING' && selectedItem?.status !== undefined;

    const handleApprove = async () => {
        if (!selectedId || !canApprove) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await moderateReviewStatus(selectedId, 'APPROVED', moderatorNote);
            setModeratorNote('');
            invalidateDetailCache(selectedId);
            await Promise.all([loadList(), refreshDetailForSelection()]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Duyệt thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedId || !canReject) return;
        const note = moderatorNote.trim();
        if (note.length < 10) {
            setError('Vui lòng nhập lý do từ chối (tối thiểu 10 ký tự)');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await moderateReviewStatus(selectedId, 'REJECTED', note);
            setModeratorNote('');
            invalidateDetailCache(selectedId);
            await Promise.all([loadList(), refreshDetailForSelection()]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Từ chối thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="mx-auto w-full max-w-7xl py-6">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">Quản lý đánh giá</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Duyệt, từ chối hoặc ẩn đánh giá phòng từ tenant.
                </p>
            </header>

            <div className="mb-4 flex flex-wrap gap-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                            if (tab.value !== activeTab) {
                                setIsLoading(true);
                                setActiveTab(tab.value);
                            }
                        }}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${activeTab === tab.value
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
                    Đang tải danh sách...
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white">
                        {items.length === 0 ? (
                            <div className="p-8 text-center text-slate-600">
                                Is loading...
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(item.id)}
                                            className={`w-full px-4 py-3 text-left transition ${selectedId === item.id ? 'bg-slate-50' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-900 truncate">
                                                        {item.room_name || item.target_id || 'Phòng'}
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                                                        {item.content || '(Không có nhận xét)'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {item.reviewer_name || item.reviewer_email || item.reviewer_id} •{' '}
                                                        {formatDateTime(item.created_at)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[item.status]}`}
                                                >
                                                    {STATUS_LABEL[item.status]}
                                                </span>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        {!selectedItem ? (
                            <p className="py-8 text-center text-slate-600">Chọn một đánh giá để xem chi tiết.</p>
                        ) : detailLoading ? (
                            <div className="py-8 text-center text-slate-600">Đang tải chi tiết...</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {detail?.room?.roomName || selectedItem.room_name || 'Phòng'}
                                    </h2>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[selectedItem.status]}`}
                                    >
                                        {STATUS_LABEL[selectedItem.status]}
                                    </span>
                                </div>

                                {detail?.room?.images?.[0] && (
                                    <img
                                        src={detail.room.images[0]}
                                        alt="Phòng"
                                        crossOrigin="anonymous"
                                        className="h-40 w-full rounded-xl object-cover"
                                    />
                                )}

                                <div>
                                    <h3 className="text-sm font-medium text-slate-700">Thông tin tenant</h3>
                                    <div className="mt-2 flex items-center gap-3">
                                        {detail?.tenant?.avatarUrl ? (
                                            <img
                                                src={detail.tenant.avatarUrl}
                                                alt=""
                                                crossOrigin="anonymous"
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-sm font-medium">
                                                {(detail?.tenant?.fullName || '?')[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {detail?.tenant?.fullName || selectedItem.reviewer_name || '--'}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {detail?.tenant?.email || selectedItem.reviewer_email || '--'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {detail?.contract && (
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700">Thông tin hợp đồng</h3>
                                        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <dt className="text-slate-500">Ngày bắt đầu</dt>
                                                <dd className="font-medium">{formatDate(detail.contract.startDate)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-slate-500">Ngày kết thúc</dt>
                                                <dd className="font-medium">{formatDate(detail.contract.endDate)}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-medium text-slate-700">Nội dung đánh giá</h3>
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-1">
                                            <span className="text-amber-500">★</span>
                                            <span className="font-medium">{detail?.rating ?? selectedItem.rating}/5</span>
                                        </div>
                                        {detail && (detail.cleanlinessRating ?? detail.locationRating ?? detail.valueRating ?? detail.landlordRating) && (
                                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                {detail.cleanlinessRating != null && (
                                                    <span>Sạch sẽ: {detail.cleanlinessRating}/5</span>
                                                )}
                                                {detail.locationRating != null && (
                                                    <span>Vị trí: {detail.locationRating}/5</span>
                                                )}
                                                {detail.valueRating != null && (
                                                    <span>Giá trị: {detail.valueRating}/5</span>
                                                )}
                                                {detail.landlordRating != null && (
                                                    <span>Chủ trọ: {detail.landlordRating}/5</span>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-sm text-slate-700">{detail?.comment || selectedItem.content || '(Không có nhận xét)'}</p>
                                    </div>
                                </div>

                                {detail?.moderator_note && (
                                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                        <dt className="text-slate-600">Ghi chú moderator</dt>
                                        <dd className="mt-1 text-slate-800">{detail.moderator_note}</dd>
                                    </div>
                                )}

                                {(canApprove || canReject || (selectedItem?.status === 'PENDING' && isLocked) || (selectedItem?.status === 'APPROVED' && isLocked)) && (
                                    <>
                                        {queueLock.hasQueue && queueLock.status === 'OPEN' && (
                                            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                                ⚠ Bạn cần nhận task từ <strong>Moderation Queue</strong> trước khi xử lý mục này.
                                            </div>
                                        )}
                                        {queueLock.hasQueue && queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id && (
                                            <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                                🔒 Task này đang được <strong>{queueLock.assignedToName || 'moderator khác'}</strong> xử lý.
                                            </div>
                                        )}
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Ghi chú {canReject ? '(bắt buộc khi từ chối)' : '(không bắt buộc)'}
                                            </label>
                                            <textarea
                                                value={moderatorNote}
                                                onChange={(e) => setModeratorNote(e.target.value)}
                                                rows={3}
                                                placeholder={
                                                    canReject
                                                        ? 'Nhập lý do (tối thiểu 10 ký tự)'
                                                        : 'Ghi chú tùy chọn'
                                                }
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {canApprove && (
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={handleApprove}
                                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
                                                >
                                                    Duyệt
                                                </button>
                                            )}
                                            {canReject && (
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={handleReject}
                                                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-70"
                                                >
                                                    Từ chối
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}

                                {alreadyProcessed && (
                                    <p className="text-sm text-slate-500">
                                        Đã xử lý bởi {detail?.moderator_name || 'moderator'} lúc{' '}
                                        {formatDateTime(detail?.reviewed_at || selectedItem.reviewed_at)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
