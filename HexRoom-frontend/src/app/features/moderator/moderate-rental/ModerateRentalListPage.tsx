import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/context/useAuth';
import { checkQueueStatus, listRentalModerationItems, moderateRental, type QueueLockStatus } from '../shared/moderator-storage';
import type { ModerationDecision, RentalDocument, RentalModerationItem } from '../shared/types';

const moderationBadgeClass: Record<ModerationDecision, string> = {
    pending_review: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
};

const moderationLabel: Record<ModerationDecision, string> = {
    pending_review: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
};

const statusClassName: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    UNAVAILABLE: 'bg-slate-200 text-slate-600',
    HIDDEN: 'bg-orange-100 text-orange-700',
    VIOLATE: 'bg-rose-100 text-rose-700',
    PENDING: 'bg-amber-100 text-amber-700',
    SUSPEND: 'bg-red-100 text-red-700',
};

const statusLabel: Record<string, string> = {
    AVAILABLE: 'Đang hiển thị',
    UNAVAILABLE: 'Hết phòng',
    HIDDEN: 'Đang ẩn',
    VIOLATE: 'Vi phạm',
    PENDING: 'Chờ duyệt',
    SUSPEND: 'Tạm ngưng',
};

function formatDateTime(dateString?: string) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    CCCD: 'Căn cước công dân',
    SO_DO: 'Sổ đỏ / GCN quyền sử dụng đất',
    GPKD: 'Giấy phép kinh doanh',
    HOP_DONG: 'Hợp đồng thuê nhà',
    OTHER: 'Giấy tờ khác',
};

const DOCUMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Chờ xác minh', className: 'bg-amber-100 text-amber-700' },
    VERIFIED: { label: 'Đã xác minh', className: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: 'Từ chối', className: 'bg-rose-100 text-rose-700' },
};

function groupDocumentsByType(documents: RentalDocument[]): Record<string, RentalDocument[]> {
    const grouped: Record<string, RentalDocument[]> = {};
    for (const doc of documents) {
        if (!grouped[doc.documentType]) grouped[doc.documentType] = [];
        grouped[doc.documentType].push(doc);
    }
    return grouped;
}

const DEFAULT_THUMB =
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80';

export function ModerateRentalListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const highlightApplied = useRef(false);

    const [items, setItems] = useState<RentalModerationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ModerationDecision>('all');
    const [selectedId, setSelectedId] = useState<string>(highlightId ?? '');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [queueLock, setQueueLock] = useState<QueueLockStatus>({ hasQueue: false });
    const { user } = useAuth();

    const loadData = async () => {
        setIsLoading(true);
        const data = await listRentalModerationItems();
        setItems(data);
        setSelectedId((current) => current || data[0]?.rental_id || '');
        setIsLoading(false);
    };

    useEffect(() => {
        void loadData();
    }, []);

    // Auto-select highlighted item from queue navigation
    useEffect(() => {
        if (highlightId && !highlightApplied.current && items.length > 0) {
            const exists = items.some((item) => item.rental_id === highlightId);
            if (exists) {
                setSelectedId(highlightId);
                setStatusFilter('all');
            }
            highlightApplied.current = true;
            setSearchParams({}, { replace: true });
        }
    }, [items, highlightId, setSearchParams]);

    const filteredItems = useMemo(() => {
        const normalized = keyword.trim().toLowerCase();
        return items.filter((item) => {
            const matchesKeyword =
                normalized.length === 0 ||
                item.title.toLowerCase().includes(normalized) ||
                item.address.toLowerCase().includes(normalized) ||
                item.city.toLowerCase().includes(normalized) ||
                item.district.toLowerCase().includes(normalized);
            const matchesStatus = statusFilter === 'all' || item.moderation_status === statusFilter;
            return matchesKeyword && matchesStatus;
        });
    }, [items, keyword, statusFilter]);

    useEffect(() => {
        if (filteredItems.length === 0) {
            setSelectedId('');
            return;
        }
        const exists = filteredItems.some((item) => item.rental_id === selectedId);
        if (!exists) {
            setSelectedId(filteredItems[0].rental_id);
        }
    }, [filteredItems, selectedId]);

    const selectedItem = filteredItems.find((item) => item.rental_id === selectedId) ?? null;

    // Reset active image when selection changes
    useEffect(() => {
        setActiveImageIdx(0);
    }, [selectedId]);

    // Check queue lock status when selection changes
    useEffect(() => {
        if (!selectedId) { setQueueLock({ hasQueue: false }); return; }
        checkQueueStatus('RENTAL', selectedId).then(setQueueLock);
    }, [selectedId]);

    const handleDecision = async (decision: 'approved' | 'rejected') => {
        if (!selectedItem) return;
        setIsSubmitting(true);
        try {
            await moderateRental({
                rental_id: selectedItem.rental_id,
                decision,
                moderator_id: 'moderator-demo',
                note,
            });
            setNote('');
            await loadData();
            setQueueLock({ hasQueue: false });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Thao tác thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedImages = selectedItem?.images ?? [];

    return (
        <section className="mx-auto w-full max-w-7xl py-6 px-4">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">Duyệt nhà cho thuê</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Xem xét và duyệt các bài đăng nhà cho thuê trước khi công khai.
                </p>
            </header>

            <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tìm theo tiêu đề, thành phố, quận, địa chỉ..."
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | ModerationDecision)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending_review">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Từ chối</option>
                </select>
            </div>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                    Đang tải danh sách bài đăng...
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_1.6fr]">
                    {/* ─── Left: Rental list ─── */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                        {filteredItems.length === 0 ? (
                            <p className="p-4 text-sm text-slate-600">Không tìm thấy bài đăng nào.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                    <li key={item.rental_id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(item.rental_id)}
                                            className={`w-full px-4 py-3 text-left transition rounded-xl ${selectedId === item.rental_id
                                                ? 'bg-slate-100 border-l-4 border-l-slate-900'
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-medium text-slate-900 truncate">{item.title}</p>
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${moderationBadgeClass[item.moderation_status]}`}
                                                >
                                                    {moderationLabel[item.moderation_status]}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-600 truncate">
                                                {item.address}, {item.district}, {item.city}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Ngày tạo: {formatDateTime(item.created_at)}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* ─── Right: Detail panel ─── */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto">
                        {!selectedItem ? (
                            <p className="p-6 text-sm text-slate-600">Chọn một bài đăng để xem chi tiết.</p>
                        ) : (
                            <div>
                                {/* ── Image gallery ── */}
                                <div className="bg-slate-100">
                                    {selectedImages.length > 0 ? (
                                        <div>
                                            <img
                                                src={selectedImages[activeImageIdx] || selectedImages[0]}
                                                alt={selectedItem.title}
                                                crossOrigin="anonymous"
                                                className="h-56 w-full object-cover sm:h-72"
                                            />
                                            {selectedImages.length > 1 && (
                                                <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50">
                                                    {selectedImages.map((url, i) => (
                                                        <button
                                                            key={url}
                                                            type="button"
                                                            onClick={() => setActiveImageIdx(i)}
                                                            className={`h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${i === activeImageIdx
                                                                ? 'border-slate-900'
                                                                : 'border-transparent hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <img
                                                                src={url}
                                                                alt={`Ảnh ${i + 1}`}
                                                                crossOrigin="anonymous"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <img
                                            src={DEFAULT_THUMB}
                                            alt={selectedItem.title}
                                            crossOrigin="anonymous"
                                            className="h-56 w-full object-cover sm:h-72 opacity-50"
                                        />
                                    )}
                                </div>

                                <div className="p-5 space-y-5">
                                    {/* ── Header ── */}
                                    <header>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-xl font-semibold text-slate-900">{selectedItem.title}</h2>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[selectedItem.listing_status] ?? 'bg-slate-100 text-slate-600'
                                                    }`}
                                            >
                                                {statusLabel[selectedItem.listing_status] ?? selectedItem.listing_status}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">
                                            📍 {selectedItem.address}, {selectedItem.district}, {selectedItem.city}
                                        </p>
                                    </header>

                                    {/* ── Description ── */}
                                    {selectedItem.description && (
                                        <section>
                                            <h3 className="mb-1.5 text-sm font-semibold text-slate-900">Mô tả</h3>
                                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-3">
                                                {selectedItem.description}
                                            </p>
                                        </section>
                                    )}

                                    {/* ── Rental info grid ── */}
                                    <section>
                                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Thông tin bài đăng</h3>
                                        <dl className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Mã bài đăng</dt>
                                                <dd className="font-medium text-slate-900 break-all text-xs mt-0.5">
                                                    {selectedItem.rental_id}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Ngày tạo</dt>
                                                <dd className="font-medium text-slate-900 mt-0.5">
                                                    {formatDateTime(selectedItem.created_at)}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Số phòng</dt>
                                                <dd className="font-medium text-slate-900 mt-0.5">
                                                    {selectedItem.rooms_count ?? 0}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Số ảnh</dt>
                                                <dd className="font-medium text-slate-900 mt-0.5">
                                                    {selectedImages.length}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>

                                    {/* ── Owner info ── */}
                                    <section>
                                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Thông tin chủ trọ</h3>
                                        <dl className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Họ tên</dt>
                                                <dd className="font-medium text-slate-900 mt-0.5">
                                                    {selectedItem.user_id}
                                                </dd>
                                            </div>
                                            {selectedItem.owner_email && (
                                                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                    <dt className="text-xs text-slate-500">Email</dt>
                                                    <dd className="font-medium text-slate-900 mt-0.5 break-all">
                                                        {selectedItem.owner_email}
                                                    </dd>
                                                </div>
                                            )}
                                            {selectedItem.owner_phone && (
                                                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                    <dt className="text-xs text-slate-500">Số điện thoại</dt>
                                                    <dd className="font-medium text-slate-900 mt-0.5">
                                                        {selectedItem.owner_phone}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </section>

                                    {/* ── Verification documents ── */}
                                    {selectedItem.documents && selectedItem.documents.length > 0 && (
                                        <section>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                                                    Giấy tờ xác minh
                                                </h3>
                                                <p className="text-xs text-slate-500 mb-4">
                                                    Giấy tờ do chủ trọ cung cấp để xác minh quyền sở hữu hợp pháp.
                                                </p>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {Object.entries(groupDocumentsByType(selectedItem.documents)).map(
                                                        ([type, docs]) => (
                                                            <div
                                                                key={type}
                                                                className="bg-white rounded-lg p-3 border border-slate-200"
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-sm font-medium text-slate-800">
                                                                        {DOCUMENT_TYPE_LABELS[type] ?? type}
                                                                    </p>
                                                                    <span className="text-xs text-slate-500">
                                                                        {docs.length} ảnh
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {docs.map((doc) => (
                                                                        <div key={doc.id} className="relative group">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setLightboxUrl(doc.imageUrl)
                                                                                }
                                                                                className="block h-20 w-20 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition"
                                                                            >
                                                                                <img
                                                                                    src={doc.imageUrl}
                                                                                    alt={
                                                                                        DOCUMENT_TYPE_LABELS[
                                                                                        doc.documentType
                                                                                        ] ?? doc.documentType
                                                                                    }
                                                                                    crossOrigin="anonymous"
                                                                                    className="h-full w-full object-cover"
                                                                                />
                                                                            </button>
                                                                            <span
                                                                                className={`absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${DOCUMENT_STATUS_LABELS[doc.status]
                                                                                        ?.className ??
                                                                                    'bg-slate-100 text-slate-600'
                                                                                    }`}
                                                                            >
                                                                                {DOCUMENT_STATUS_LABELS[doc.status]
                                                                                    ?.label ?? doc.status}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {docs.some((d) => d.note) && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {docs
                                                                            .filter((d) => d.note)
                                                                            .map((d) => (
                                                                                <p
                                                                                    key={d.id}
                                                                                    className="text-xs text-slate-500 italic"
                                                                                >
                                                                                    Ghi chú: {d.note}
                                                                                </p>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {(!selectedItem.documents || selectedItem.documents.length === 0) && (
                                        <section>
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                                                    Giấy tờ xác minh
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Chủ trọ chưa cung cấp giấy tờ xác minh cho bài đăng này.
                                                </p>
                                            </div>
                                        </section>
                                    )}

                                    {/* ── Moderation status ── */}
                                    <section>
                                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Trạng thái duyệt</h3>
                                        <dl className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Trạng thái hiện tại</dt>
                                                <dd className="mt-0.5">
                                                    <span
                                                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${moderationBadgeClass[selectedItem.moderation_status]}`}
                                                    >
                                                        {moderationLabel[selectedItem.moderation_status]}
                                                    </span>
                                                </dd>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                <dt className="text-xs text-slate-500">Duyệt lần cuối</dt>
                                                <dd className="font-medium text-slate-900 mt-0.5">
                                                    {formatDateTime(selectedItem.last_moderated_at)}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>

                                    {/* ── Last moderation note ── */}
                                    {selectedItem.last_note && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs font-medium text-slate-500">Ghi chú duyệt trước</p>
                                            <p className="mt-1 text-sm text-slate-700">{selectedItem.last_note}</p>
                                        </div>
                                    )}

                                    {/* ── Moderator action ── */}
                                    <section className="border-t border-slate-200 pt-4">
                                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Hành động</h3>

                                        {queueLock.hasQueue && queueLock.status === 'OPEN' && (
                                            <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                                ⚠ Bạn cần nhận task từ <strong>Moderation Queue</strong> trước khi xử lý mục này.
                                            </div>
                                        )}
                                        {queueLock.hasQueue && queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id && (
                                            <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                                🔒 Task này đang được <strong>{queueLock.assignedToName || 'moderator khác'}</strong> xử lý.
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="mb-1.5 block text-sm text-slate-700">
                                                    Ghi chú của Moderator
                                                </label>
                                                <textarea
                                                    value={note}
                                                    onChange={(event) => setNote(event.target.value)}
                                                    rows={3}
                                                    placeholder="Lý do duyệt hoặc từ chối (không bắt buộc)"
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting || (queueLock.hasQueue && (queueLock.status === 'OPEN' || (queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id)))}
                                                    onClick={() => handleDecision('approved')}
                                                    className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70 transition"
                                                >
                                                    ✓ Duyệt bài đăng
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting || (queueLock.hasQueue && (queueLock.status === 'OPEN' || (queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id)))}
                                                    onClick={() => handleDecision('rejected')}
                                                    className="flex-1 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-70 transition"
                                                >
                                                    ✗ Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Lightbox overlay ── */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={lightboxUrl}
                            alt="Document preview"
                            crossOrigin="anonymous"
                            className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        />
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg hover:bg-slate-100 transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
