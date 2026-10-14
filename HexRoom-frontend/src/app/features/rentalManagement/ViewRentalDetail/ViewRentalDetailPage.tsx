import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRentalByIdRequest, deleteRentalRequest, getRejectionInfoRequest } from '@/lib/api';
import { getSupabasePublicUrl, filterOutDocuments } from '@/lib/supabase-urls';
import { RENTAL_STATUS_OPTIONS } from '../shared/types';
import { LandlordDocumentsViewer } from '../EditRental/components/LandlordDocumentsViewer';

const RENTAL_DETAIL_CACHE_PREFIX = 'ezroom:rental-detail:v1:';

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStatusLabel(status: string) {
    return RENTAL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

interface RentalDetail {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    owner: { id: string; fullName: string; avatarUrl: string | null; email: string; phone: string | null } | null;
    location: { id: string; address: string; district: string | null; city: string | null } | null;
    rooms: Array<Record<string, unknown>>;
    images: string[];
}

interface RejectionInfo {
    hasRejection: boolean;
    reason?: string | null;
    moderatorName?: string | null;
    rejectedAt?: string;
}

export function ViewRentalDetailPage() {
    const navigate = useNavigate();
    const { rentalId = '' } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [rental, setRental] = useState<RentalDetail | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [rejectionInfo, setRejectionInfo] = useState<RejectionInfo | null>(null);
    const detailCacheKey = `${RENTAL_DETAIL_CACHE_PREFIX}${rentalId}`;

    useEffect(() => {
        let active = true;
        let hasCache = false;

        try {
            const cachedRaw = sessionStorage.getItem(detailCacheKey);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw) as { rental?: RentalDetail };
                if (cached?.rental) {
                    setRental(cached.rental);
                    setIsLoading(false);
                    hasCache = true;
                }
            }
        } catch {
            // Ignore cache parse errors and continue with network fetch.
        }

        const load = async () => {
            if (!hasCache) {
                setIsLoading(true);
                setLoadError(null);
            }
            try {
                const result = await getRentalByIdRequest(rentalId);
                if (!active) return;
                setRental(result.data);
                setRejectionInfo(null);
                sessionStorage.setItem(detailCacheKey, JSON.stringify({ rental: result.data, updatedAt: Date.now() }));

                // Nếu bài đăng bị từ chối (HIDDEN), lấy thông tin từ chối
                if (result.data.status === 'HIDDEN') {
                    void getRejectionInfoRequest('RENTAL', rentalId)
                        .then((rejInfo) => {
                            if (active && rejInfo.data?.hasRejection) {
                                setRejectionInfo(rejInfo.data);
                            }
                        })
                        .catch(() => {
                            // Không bắt buộc — nếu fail thì không hiển thị lý do.
                        });
                }
            } catch (err) {
                if (!active) return;
                if (!hasCache) {
                    setLoadError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
                }
            } finally {
                if (active && !hasCache) setIsLoading(false);
            }
        };

        if (!rentalId) {
            setRental(null);
            setIsLoading(false);
            return;
        }

        void load();
        return () => {
            active = false;
        };
    }, [detailCacheKey, rentalId]);

    if (isLoading) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-600">Đang tải chi tiết bài đăng...</p>
            </section>
        );
    }

    if (loadError) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
                <p className="text-rose-700 font-medium">Lỗi khi tải chi tiết</p>
                <p className="mt-1 text-sm text-rose-600">{loadError}</p>
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals')}
                    className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    Quay lại danh sách
                </button>
            </section>
        );
    }

    if (!rental) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h2 className="text-xl font-semibold text-slate-900">Không tìm thấy bài đăng</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Bài đăng này có thể đã bị xóa hoặc không tồn tại.
                </p>
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals')}
                    className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    Quay lại danh sách
                </button>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-5xl">
            {/* Page header */}
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-slate-900">Chi tiết bài đăng</h1>
                {rental?.title && (
                    <p className="mt-1 text-sm text-slate-500">{rental.title}</p>
                )}
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals')}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    ← Quay lại
                </button>
                <div className="flex gap-2">
                    {rental.status === 'PENDING' ? (
                        <span className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 cursor-not-allowed">
                            ⏳ Đang chờ duyệt
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate(`/rental-management/rentals/${rentalId}/edit`)}
                            className="rounded-xl border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                            ✏️ Sửa
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-xl border border-rose-500 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                        🗑️ Xóa
                    </button>
                </div>
            </div>

            {/* Rejection Banner */}
            {rental.status === 'HIDDEN' && rejectionInfo?.hasRejection && (
                <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-xl"></span>
                        <div className="flex-1">
                            <h3 className="font-semibold text-rose-800">Bài đăng bị từ chối bởi Moderator</h3>
                            {rejectionInfo.reason && (
                                <p className="mt-1 text-sm text-rose-700">
                                    <strong>Lý do:</strong> {rejectionInfo.reason}
                                </p>
                            )}
                            {rejectionInfo.rejectedAt && (
                                <p className="mt-1 text-xs text-rose-600">
                                    Từ chối lúc: {formatDateTime(rejectionInfo.rejectedAt)}
                                    {rejectionInfo.moderatorName && ` bởi ${rejectionInfo.moderatorName}`}
                                </p>
                            )}
                            <p className="mt-2 text-sm text-rose-700">
                                Vui lòng chỉnh sửa bài đăng và gửi lại để duyệt.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate(`/rental-management/rentals/${rentalId}/edit`)}
                                className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
                            >
                                Chỉnh sửa & Gửi lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6">
                        <h3 className="text-lg font-semibold text-slate-900">Xác nhận xóa</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Bạn có chắc muốn xóa bài đăng <strong>"{rental?.title}"</strong>?
                            Hành động này không thể hoàn tác.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        await deleteRentalRequest(rentalId);
                                        navigate('/rental-management/rentals');
                                    } catch (err) {
                                        alert(err instanceof Error ? err.message : 'Xóa thất bại');
                                    } finally {
                                        setIsDeleting(false);
                                        setShowDeleteConfirm(false);
                                    }
                                }}
                                disabled={isDeleting}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="p-6 md:p-8">
                    <h2 className="mb-6 text-xl font-semibold text-slate-900">Thông tin chi tiết nhà cho thuê</h2>

                    <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                        {/* Tiêu đề */}
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiêu đề *</label>
                            <input
                                value={rental.title || ''}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none"
                            />
                        </div>

                        {/* Phân loại & Trạng thái */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Loại bất động sản</label>
                            <select
                                value="boarding_house"
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none"
                            >
                                <option value="boarding_house">Boarding house</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Trạng thái duyệt</label>
                            <div className="flex h-[38px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                                <span className={`mr-2 h-2 w-2 rounded-full ${rental.status === 'AVAILABLE' ? 'bg-emerald-500' : rental.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                {getStatusLabel(rental.status)}
                            </div>
                        </div>

                        {/* Vị trí */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tỉnh / Thành phố *</label>
                            <input
                                value={rental.location?.city || 'Thành phố Hà Nội'}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phường / Xã *</label>
                            <input
                                value={rental.location?.district || ''}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Địa chỉ chi tiết (đường, số nhà) *</label>
                            <input
                                value={rental.location?.address || ''}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none"
                            />
                        </div>

                        {/* Thông tin phòng */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Số phòng trống *</label>
                            <input
                                value={rental.rooms?.length?.toString() || '1'}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none"
                            />
                        </div>

                        {/* Thông tin metadata cho View Only */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Mã bài đăng hệ thống</label>
                            <input
                                value={rental.id}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 font-mono pointer-events-none"
                            />
                        </div>

                        {/* Ảnh bài đăng */}
                        <div className="md:col-span-2 mt-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Ảnh bài đăng</label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                {(() => {
                                    const filteredImages = filterOutDocuments(rental.images || []);
                                    if (filteredImages.length === 0) {
                                        return (
                                            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                                                <span className="text-sm text-slate-400">Không có ảnh tải lên</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex flex-wrap gap-3">
                                            {filteredImages.map((url, idx) => (
                                                <a key={idx} href={getSupabasePublicUrl(url)} target="_blank" rel="noreferrer" className="block relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 hover:border-slate-400 group">
                                                    <img src={getSupabasePublicUrl(url)} alt="room" crossOrigin="anonymous" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                                </a>
                                            ))}
                                            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white">
                                                <span className="text-xs text-slate-400">{filteredImages.length}/10 ảnh</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Phần Giấy tờ */}
                        <div className="md:col-span-2 mt-2">
                            <LandlordDocumentsViewer rentalId={rental.id} />
                        </div>

                        {/* Mô tả */}
                        <div className="md:col-span-2 mt-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tóm tắt</label>
                            <textarea
                                value=""
                                disabled
                                placeholder="Chưa có tóm tắt ngắn..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none resize-none h-20"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả chi tiết</label>
                            <textarea
                                value={rental.description || ''}
                                disabled
                                placeholder="Chưa có mô tả chi tiết..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 pointer-events-none resize-none h-40"
                            />
                        </div>

                    </div>
                </div>
            </article>
        </section>
    );
}
