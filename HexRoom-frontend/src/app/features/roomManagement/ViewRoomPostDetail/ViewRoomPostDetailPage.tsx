import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RoomStatus } from '@/lib/models/room.model';
import { getManagedRentalById } from '@/app/features/rentalManagement/shared/rental-storage';
import { getRoomPostById, deleteRoomPost, getRoomTenants, type RoomTenant, type RoomPreorder } from '../shared/room-post-storage';
import { CreateContractModal } from '../CreateContractModal';
import {
    ROOM_POST_STATUS_OPTIONS,
    type ManagedRoomPostItem,
} from '../shared/types';

const roomStatusClassName: Record<RoomStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    RENTED: 'bg-slate-200 text-slate-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
};

const EMPTY_TENANT_DATA: { rentals: RoomTenant[]; preorders: RoomPreorder[] } = {
    rentals: [],
    preorders: [],
};
const ROOM_POST_DETAIL_CACHE_PREFIX = 'ezroom:room-post-detail:v1:';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStatusLabel(status: RoomStatus) {
    return ROOM_POST_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function ViewRoomPostDetailPage() {
    const navigate = useNavigate();
    const { rentalId = '', roomPostId = '' } = useParams();
    const [rentalTitle, setRentalTitle] = useState('');
    const [roomPost, setRoomPost] = useState<ManagedRoomPostItem | null>(null);
    const [isLoading, setIsLoading] = useState(!!(rentalId && roomPostId));
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentTab, setCurrentTab] = useState<'details' | 'tenants'>('details');
    const [showCreateContract, setShowCreateContract] = useState(false);
    const [tenantData, setTenantData] = useState<{ rentals: RoomTenant[]; preorders: RoomPreorder[] }>(EMPTY_TENANT_DATA);
    const [isLoadingTenants, setIsLoadingTenants] = useState(false);
    const [hasLoadedTenants, setHasLoadedTenants] = useState(false);
    const detailCacheKey = `${ROOM_POST_DETAIL_CACHE_PREFIX}${roomPostId}`;

    const loadTenants = useCallback(async () => {
        if (!roomPostId) return null;
        if (hasLoadedTenants || isLoadingTenants) return tenantData;

        setIsLoadingTenants(true);
        try {
            const data = await getRoomTenants(roomPostId);
            setTenantData(data);
            setHasLoadedTenants(true);
            return data;
        } finally {
            setIsLoadingTenants(false);
        }
    }, [hasLoadedTenants, isLoadingTenants, roomPostId, tenantData]);

    useEffect(() => {
        let active = true;
        let hasCache = false;

        try {
            const cachedRaw = sessionStorage.getItem(detailCacheKey);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw) as { roomPost?: ManagedRoomPostItem; rentalTitle?: string };
                if (cached?.roomPost) {
                    setRoomPost(cached.roomPost);
                    setRentalTitle(cached.rentalTitle ?? '');
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
                setRentalTitle('');
            }
            setTenantData(EMPTY_TENANT_DATA);
            setHasLoadedTenants(false);

            try {
                const post = await getRoomPostById(rentalId, roomPostId);
                if (!active) return;
                setRoomPost(post);
                sessionStorage.setItem(
                    detailCacheKey,
                    JSON.stringify({ roomPost: post, rentalTitle: hasCache ? rentalTitle : '', updatedAt: Date.now() })
                );
            } finally {
                if (active && !hasCache) {
                    setIsLoading(false);
                }
            }

            void getManagedRentalById(rentalId)
                .then((rental) => {
                    if (!active) return;
                    const title = rental?.title ?? '';
                    setRentalTitle(title);
                })
                .catch(() => {
                    // Ignore title lookup failures because room detail data is already available.
                });
        };

        if (!rentalId || !roomPostId) {
            return;
        }

        void load();
        return () => {
            active = false;
        };
    }, [detailCacheKey, rentalId, roomPostId]);

    // Load tenants when tab changes to 'tenants'
    useEffect(() => {
        if (currentTab === 'tenants' && roomPostId && !hasLoadedTenants) {
            void loadTenants();
        }
    }, [currentTab, roomPostId, hasLoadedTenants, loadTenants]);

    const rentalLabel = useMemo(() => rentalTitle || rentalId, [rentalId, rentalTitle]);
    const activeTenantCount = tenantData.rentals.length;
    const maxOccupants = Math.max(1, Number(roomPost?.max_occupants || 1));
    const isRoomAtCapacity = hasLoadedTenants && activeTenantCount >= maxOccupants;

    const refetchRoomAndTenants = useCallback(async () => {
        if (!rentalId || !roomPostId) return;
        const [post, tenants] = await Promise.all([
            getRoomPostById(rentalId, roomPostId),
            getRoomTenants(roomPostId),
        ]);
        setRoomPost(post);
        setTenantData(tenants);
        setHasLoadedTenants(true);

        void getManagedRentalById(rentalId)
            .then((rental) => {
                setRentalTitle(rental?.title ?? '');
            })
            .catch(() => {
                // Ignore title lookup failures because room detail data is already available.
            });
    }, [rentalId, roomPostId]);

    const getImageArray = () => {
        if (!roomPost) return [];
        const images = roomPost.images && roomPost.images.length > 0 ? roomPost.images : [];
        if (images.length === 0 && roomPost.thumbnail_url) {
            return [roomPost.thumbnail_url];
        }
        return images;
    };

    const imageArray = getImageArray();

    if (isLoading) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-600">Loading room post detail...</p>
            </section>
        );
    }

    if (!roomPost || !rentalId) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h2 className="text-xl font-semibold text-slate-900">Room post not found</h2>
                <p className="mt-2 text-sm text-slate-600">
                    The room post does not exist in this rental.
                </p>
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals')}
                    className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    Back to rental list
                </button>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-5xl">
            {/* Page header */}
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-slate-900">Chi tiết phòng</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {rentalLabel}
                    {roomPost?.title ? ` › ${roomPost.title}` : ''}
                </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts`)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    ← Quay lại danh sách phòng
                </button>
                <div className="flex gap-2">
                    {(roomPost.status === 'AVAILABLE' || roomPost.status === 'RENTED') && (
                        <button
                            type="button"
                            onClick={async () => {
                                let latestTenantCount = activeTenantCount;
                                if (!hasLoadedTenants) {
                                    const latestData = await loadTenants();
                                    latestTenantCount = latestData?.rentals.length ?? 0;
                                }

                                if (latestTenantCount < maxOccupants) {
                                    setShowCreateContract(true);
                                }
                            }}
                            disabled={isLoadingTenants || isRoomAtCapacity}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                            {isLoadingTenants
                                ? ' Đang kiểm tra chỗ trống...'
                                : isRoomAtCapacity
                                    ? ` Đã đủ người (${activeTenantCount}/${maxOccupants})`
                                    : ' Thêm người ở'}
                        </button>
                    )}
                    {roomPost.status === 'PENDING' ? (
                        <span className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 cursor-not-allowed">
                            Đang chờ duyệt
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts/${roomPostId}/edit`)}
                            className="rounded-xl border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                            Sửa
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-xl border border-rose-500 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                        Xóa
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6">
                        <h3 className="text-lg font-semibold text-slate-900">Xác nhận xóa phòng</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Bạn có chắc muốn xóa phòng <strong>"{roomPost?.title}"</strong>?
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
                                    const success = await deleteRoomPost(roomPostId);
                                    setIsDeleting(false);
                                    if (success) {
                                        navigate(`/rental-management/rentals/${rentalId}/room-posts`);
                                    } else {
                                        alert('Xóa phòng thất bại');
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

            {showCreateContract && (
                <CreateContractModal
                    isOpen={showCreateContract}
                    onClose={() => setShowCreateContract(false)}
                    roomId={roomPostId}
                    roomTitle={roomPost.title || roomPost.room_post_id}
                    listedPrice={roomPost.price}
                    onSuccess={refetchRoomAndTenants}
                />
            )}

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* Main Image */}
                <img
                    src={
                        imageArray[selectedImageIndex] ??
                        'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'
                    }
                    alt={roomPost.title}
                    crossOrigin="anonymous"
                    className="h-64 w-full object-cover sm:h-80"
                />

                {/* Image Gallery Thumbnails */}
                {imageArray.length > 1 && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                        <div className="flex gap-2 overflow-x-auto">
                            {imageArray.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`flex-shrink-0 rounded-lg overflow-hidden w-20 h-20 border-2 transition-colors ${selectedImageIndex === index
                                        ? 'border-slate-900'
                                        : 'border-slate-300 hover:border-slate-400'
                                        }`}
                                >
                                    <img
                                        src={image}
                                        alt={`Thumbnail ${index + 1}`}
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                            {selectedImageIndex + 1} / {imageArray.length}
                        </p>
                    </div>
                )}

                <div className="space-y-5 p-5 sm:p-6">
                    <header className="space-y-2">
                        <p className="text-sm text-slate-500">Rental: {rentalLabel}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-semibold text-slate-900">{roomPost.title}</h2>
                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roomStatusClassName[roomPost.status]}`}
                            >
                                {getStatusLabel(roomPost.status)}
                            </span>
                        </div>
                    </header>

                    {roomPost.description ? (
                        <section>
                            <h3 className="mb-1 text-sm font-semibold text-slate-900">Description</h3>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                {roomPost.description}
                            </p>
                        </section>
                    ) : null}

                    {/* Tabs Navigation */}
                    <div className="border-b border-slate-200">
                        <div className="flex gap-6">
                            <button
                                onClick={() => setCurrentTab('details')}
                                className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'details'
                                    ? 'border-slate-900 text-slate-900'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Chi tiết phòng
                            </button>
                            <button
                                onClick={() => setCurrentTab('tenants')}
                                className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${currentTab === 'tenants'
                                    ? 'border-slate-900 text-slate-900'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Người thuê ({activeTenantCount})
                            </button>
                        </div>
                    </div>

                    {/* Details Tab */}
                    {currentTab === 'details' && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold text-slate-900">Room Post Information</h3>
                            <dl className="grid gap-2 text-sm sm:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Room post ID</dt>
                                    <dd className="font-medium text-slate-900">{roomPost.room_post_id}</dd>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Rental ID</dt>
                                    <dd className="font-medium text-slate-900">{roomPost.rental_id}</dd>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Price</dt>
                                    <dd className="font-medium text-slate-900">
                                        {formatCurrency(roomPost.price)}
                                    </dd>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Area</dt>
                                    <dd className="font-medium text-slate-900">{roomPost.area} m2</dd>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Max occupants</dt>
                                    <dd className="font-medium text-slate-900">{roomPost.max_occupants}</dd>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Images</dt>
                                    <dd className="font-medium text-slate-900">{imageArray.length} photo(s)</dd>
                                </div>
                                {roomPost.amenities && roomPost.amenities.length > 0 && (
                                    <div className="md:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
                                        <dt className="text-xs text-slate-500">Amenities</dt>
                                        <dd className="mt-2 flex flex-wrap gap-2">
                                            {roomPost.amenities.map((amenity) => (
                                                <span
                                                    key={amenity.id}
                                                    className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                                                >
                                                    {amenity.name}
                                                </span>
                                            ))}
                                        </dd>
                                    </div>
                                )}
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <dt className="text-xs text-slate-500">Created at</dt>
                                    <dd className="font-medium text-slate-900">
                                        {formatDateTime(roomPost.created_at)}
                                    </dd>
                                </div>
                            </dl>
                        </section>
                    )}

                    {/* Tenants Tab */}
                    {currentTab === 'tenants' && (
                        <section>
                            {isLoadingTenants ? (
                                <div className="py-8 text-center text-slate-600">
                                    <p>Đang tải dữ liệu...</p>
                                </div>
                            ) : tenantData.rentals.length === 0 && tenantData.preorders.length === 0 ? (
                                <div className="py-8 text-center text-slate-600">
                                    <p>Chưa có ai thuê phòng này</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Current Rentals */}
                                    {tenantData.rentals.length > 0 && (
                                        <div>
                                            <h4 className="mb-3 font-semibold text-slate-900">Người đang/đã thuê ({tenantData.rentals.length})</h4>
                                            <div className="space-y-3">
                                                {tenantData.rentals.map((rental) => (
                                                    <div key={rental.id} className="flex gap-4 rounded-xl border border-slate-200 p-4">
                                                        <div className="flex-1">
                                                            <h5 className="font-semibold text-slate-900">{rental.tenant.fullName}</h5>
                                                            <p className="text-sm text-slate-600">{rental.tenant.email}</p>
                                                            <p className="text-sm text-slate-600">{rental.tenant.phone}</p>
                                                            <div className="mt-2 flex gap-4 text-sm text-slate-600">
                                                                <span>Từ: {new Date(rental.startDate).toLocaleDateString('vi-VN')}</span>
                                                                <span>Đến: {rental.endDate ? new Date(rental.endDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}</span>
                                                            </div>
                                                            <div className="mt-2 flex gap-2">
                                                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                                                    Giá: {formatCurrency(rental.actualPrice)}
                                                                </span>
                                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${rental.status === 'ACTIVE'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-slate-100 text-slate-700'
                                                                    }`}>
                                                                    {rental.status === 'ACTIVE' ? 'Đang thuê' : 'Đã kết thúc'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending Preorders */}
                                    {tenantData.preorders.length > 0 && (
                                        <div>
                                            <h4 className="mb-3 font-semibold text-slate-900">Đơn đặt cọc ({tenantData.preorders.length})</h4>
                                            <div className="space-y-3">
                                                {tenantData.preorders.map((preorder) => (
                                                    <div key={preorder.id} className="flex gap-4 rounded-xl border border-slate-200 p-4">
                                                        <div className="flex-1">
                                                            <h5 className="font-semibold text-slate-900">{preorder.user.fullName}</h5>
                                                            <p className="text-sm text-slate-600">{preorder.user.email}</p>
                                                            <p className="text-sm text-slate-600">{preorder.user.phone}</p>
                                                            <div className="mt-2 flex gap-2">
                                                                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                                                    Cọc: {formatCurrency(preorder.depositAmount)}
                                                                </span>
                                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${preorder.paymentStatus === 'PAID'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                                    }`}>
                                                                    {preorder.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </article>
        </section>
    );
}
