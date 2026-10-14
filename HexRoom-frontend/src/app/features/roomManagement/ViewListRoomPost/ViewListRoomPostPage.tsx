import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RoomStatus } from '@/lib/models/room.model';
import { getManagedRentalById } from '@/app/features/rentalManagement/shared/rental-storage';
import { getRoomWishers, listRoomPostsByRentalId, type RoomWisher } from '../shared/room-post-storage';
import {
    ROOM_POST_STATUS_OPTIONS,
    type ManagedRoomPostItem,
} from '../shared/types';

const ROOM_POST_LIST_CACHE_PREFIX = 'ezroom:room-post-list:v1:';

const roomStatusClassName: Record<RoomStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    RENTED: 'bg-slate-200 text-slate-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('vi-VN', {
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

export function ViewListRoomPostPage() {
    const navigate = useNavigate();
    const { rentalId = '' } = useParams();
    const [rentalTitle, setRentalTitle] = useState('');
    const [roomPosts, setRoomPosts] = useState<ManagedRoomPostItem[]>([]);
    const [isLoading, setIsLoading] = useState(!!rentalId);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RoomStatus>('all');
    const [openedWishersRoomId, setOpenedWishersRoomId] = useState<string | null>(null);
    const [wishersByRoom, setWishersByRoom] = useState<Record<string, RoomWisher[]>>({});
    const [loadingWishersRoomId, setLoadingWishersRoomId] = useState<string | null>(null);
    const listCacheKey = `${ROOM_POST_LIST_CACHE_PREFIX}${rentalId}`;

    useEffect(() => {
        let active = true;
        let hasCache = false;

        try {
            const cachedRaw = sessionStorage.getItem(listCacheKey);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw) as {
                    rentalTitle?: string;
                    roomPosts?: ManagedRoomPostItem[];
                };
                if (Array.isArray(cached?.roomPosts)) {
                    setRoomPosts(cached.roomPosts);
                    setRentalTitle(cached.rentalTitle ?? '');
                    setIsLoading(false);
                    hasCache = true;
                }
            }
        } catch {
            // Ignore cache parse errors and continue with network fetch.
        }

        const postsRef = { current: [] as ManagedRoomPostItem[] };

        const loadWithRef = async () => {
            if (!hasCache) {
                setIsLoading(true);
            }

            try {
                const posts = await listRoomPostsByRentalId(rentalId);
                if (!active) return;

                postsRef.current = posts;
                setRoomPosts(posts);
                const previousTitle = hasCache ? rentalTitle : '';
                sessionStorage.setItem(
                    listCacheKey,
                    JSON.stringify({ rentalTitle: previousTitle, roomPosts: posts, updatedAt: Date.now() })
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
                    sessionStorage.setItem(
                        listCacheKey,
                        JSON.stringify({ rentalTitle: title, roomPosts: postsRef.current, updatedAt: Date.now() })
                    );
                })
                .catch(() => {
                    // Ignore title lookup failures because room posts data is already available.
                });
        };

        if (!rentalId) {
            return;
        }

        void loadWithRef();
        return () => {
            active = false;
        };
    }, [listCacheKey, rentalId]);

    const filteredPosts = useMemo(() => {
        const normalized = keyword.trim().toLowerCase();
        return roomPosts.filter((item) => {
            const matchesKeyword =
                normalized.length === 0 ||
                item.title.toLowerCase().includes(normalized) ||
                item.description?.toLowerCase().includes(normalized);
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesKeyword && matchesStatus;
        });
    }, [keyword, roomPosts, statusFilter]);

    const toggleWishers = async (roomId: string) => {
        if (openedWishersRoomId === roomId) {
            setOpenedWishersRoomId(null);
            return;
        }
        setOpenedWishersRoomId(roomId);

        if (wishersByRoom[roomId]) return;

        setLoadingWishersRoomId(roomId);
        const rows = await getRoomWishers(roomId);
        setWishersByRoom((prev) => ({ ...prev, [roomId]: rows }));
        setLoadingWishersRoomId(null);
    };

    if (!rentalId) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-slate-700">Thiếu mã khu trọ.</p>
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals')}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                    Quay lại danh sách khu trọ
                </button>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-7xl">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Danh sách phòng đăng</h2>
                    <p className="text-sm text-slate-500">
                        Khu trọ: {rentalTitle || rentalId}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(`/rental-management/rentals/${rentalId}`)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Chi tiết khu trọ
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts/create`)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Tạo phòng đăng
                    </button>
                </div>
            </header>

            <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_240px]">
                <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tìm phòng theo tiêu đề hoặc mô tả..."
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />

                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | RoomStatus)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                    <option value="all">Tất cả trạng thái</option>
                    {ROOM_POST_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                    Đang tải danh sách phòng...
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <p className="text-slate-700">Không tìm thấy phòng nào cho khu trọ này.</p>
                    <button
                        type="button"
                        onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts/create`)}
                        className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                        Tạo phòng đăng đầu tiên
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredPosts.map((post) => (
                        <article
                            key={post.room_post_id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
                                <img
                                    src={
                                        post.thumbnail_url ??
                                        'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80'
                                    }
                                    alt={post.title}
                                    crossOrigin="anonymous"
                                    className="h-40 w-full rounded-xl object-cover"
                                />

                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roomStatusClassName[post.status]}`}
                                        >
                                            {getStatusLabel(post.status)}
                                        </span>
                                    </div>

                                    {post.description ? (
                                        <p className="line-clamp-2 text-sm text-slate-600">{post.description}</p>
                                    ) : null}

                                    <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700 sm:grid-cols-4">
                                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                                            <dt className="text-xs text-slate-500">Giá thuê</dt>
                                            <dd className="font-medium">{formatCurrency(post.price)}</dd>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                                            <dt className="text-xs text-slate-500">Diện tích</dt>
                                            <dd className="font-medium">{post.area} m2</dd>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                                            <dt className="text-xs text-slate-500">Số người tối đa</dt>
                                            <dd className="font-medium">{post.max_occupants}</dd>
                                        </div>
                                        {post.amenities && post.amenities.length > 0 && (
                                            <div className="col-span-2 sm:col-span-4 rounded-lg bg-slate-50 px-3 py-2">
                                                <dt className="text-xs text-slate-500">Tiện nghi</dt>
                                                <dd className="mt-1 flex flex-wrap gap-1">
                                                    {post.amenities.slice(0, 3).map((amenity) => (
                                                        <span
                                                            key={amenity.id}
                                                            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                                                        >
                                                            {amenity.name}
                                                        </span>
                                                    ))}
                                                    {post.amenities.length > 3 && (
                                                        <span className="text-xs text-slate-500">
                                                            +{post.amenities.length - 3} tiện nghi
                                                        </span>
                                                    )}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs text-slate-500">
                                            Ngày tạo: {formatDateTime(post.created_at)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleWishers(post.room_post_id)}
                                                className="rounded-xl border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
                                            >
                                                Danh sách quan tâm
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigate(
                                                        `/rental-management/rentals/${rentalId}/room-posts/${post.room_post_id}`
                                                    )
                                                }
                                                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </div>
                                    </div>

                                    {openedWishersRoomId === post.room_post_id && (
                                        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
                                            <p className="mb-2 text-sm font-semibold text-purple-900">
                                                Ưu tiên: đã cọc trước chưa cọc, sau đó cọc cao hơn, rồi đặt cọc sớm hơn, rồi yêu thích sớm hơn
                                            </p>
                                            {loadingWishersRoomId === post.room_post_id ? (
                                                <p className="text-sm text-slate-600">Đang tải danh sách quan tâm...</p>
                                            ) : (wishersByRoom[post.room_post_id] || []).length === 0 ? (
                                                <p className="text-sm text-slate-600">Chưa có người dùng nào quan tâm.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead>
                                                            <tr className="border-b border-purple-200 text-xs uppercase text-slate-600">
                                                                <th className="py-2 pr-3">#</th>
                                                                <th className="py-2 pr-3">Người dùng</th>
                                                                <th className="py-2 pr-3">Liên hệ</th>
                                                                <th className="py-2 pr-3">Mức ưu tiên</th>
                                                                <th className="py-2 pr-3">Tiền cọc</th>
                                                                <th className="py-2 pr-3">Thời điểm yêu thích</th>
                                                                <th className="py-2 pr-3">Thao tác</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(wishersByRoom[post.room_post_id] || []).map((w, idx) => (
                                                                <tr key={w.userId} className="border-b border-purple-100 last:border-0">
                                                                    <td className="py-2 pr-3 font-medium text-slate-800">{idx + 1}</td>
                                                                    <td className="py-2 pr-3">
                                                                        <div className="font-medium text-slate-900">{w.user.fullName}</div>
                                                                        {w.preorder?.paymentStatus === 'PAID' && (
                                                                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                                                                Đã thanh toán cọc
                                                                            </span>
                                                                        )}
                                                                        {w.preorder?.paymentStatus === 'UNPAID' && (
                                                                            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                                                Chưa thanh toán đặt cọc
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 pr-3 text-slate-700">
                                                                        <div>{w.user.email}</div>
                                                                        {w.user.phone ? <div>{w.user.phone}</div> : null}
                                                                    </td>
                                                                    <td className="py-2 pr-3">
                                                                        {w.hasPriorityPreorder ? (
                                                                            <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                                                                Ưu tiên đặt cọc
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                                                Hàng đợi thường
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 pr-3 text-slate-700">
                                                                        {w.preorder && w.preorder.depositAmount > 0 ? (
                                                                            <span className="font-medium tabular-nums">
                                                                                {formatCurrency(w.preorder.depositAmount)}
                                                                            </span>
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 pr-3 text-slate-700">
                                                                        {w.favoritedAt ? formatDateTime(w.favoritedAt) : '-'}
                                                                    </td>
                                                                    <td className="py-2 pr-3">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => navigate(`/chat/${w.userId}`)}
                                                                                className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                                                            >
                                                                                Nhắn tin
                                                                            </button>
                                                                            {w.preorder?.id ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        navigate('/rental-management/requests', {
                                                                                            state: { preorderId: w.preorder?.id },
                                                                                        })
                                                                                    }
                                                                                    className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                                                                >
                                                                                    Xem đơn đặt cọc
                                                                                </button>
                                                                            ) : null}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
