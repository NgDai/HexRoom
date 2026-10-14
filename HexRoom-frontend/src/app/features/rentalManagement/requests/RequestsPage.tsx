import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getLandlordRentalRequests, confirmRentalRequest, rejectRentalRequest, type RentalRequest } from './requests-storage';

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

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PENDING_PAID: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-slate-100 text-slate-700',
};

const statusLabels: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    PENDING_PAID: 'Đã thanh toán, chờ xác nhận',
    CONFIRMED: 'Đã duyệt',
    CANCELLED: 'Đã từ chối',
    EXPIRED: 'Hết hạn',
};

const paymentStatusLabels: Record<RentalRequest['paymentStatus'], string> = {
    UNPAID: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    REFUNDED: 'Đã hoàn tiền',
};

const paymentStatusColors: Record<RentalRequest['paymentStatus'], string> = {
    UNPAID: 'text-slate-500',
    PAID: 'text-green-600 font-semibold',
    REFUNDED: 'text-blue-600',
};

function getDisplayStatus(request: RentalRequest) {
    if (request.status === 'PENDING' && request.paymentStatus === 'PAID') {
        return 'PENDING_PAID';
    }
    return request.status;
}

interface GroupedRoom {
    roomId: string;
    roomName: string;
    roomPrice: number;
    requests: RentalRequest[];
}

interface GroupedRental {
    rentalId: string;
    rentalTitle: string;
    rooms: GroupedRoom[];
}

export function RequestsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<RentalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RentalRequest['status']>('all');
    const [actioningId, setActioningId] = useState<string | null>(null);
    const preorderIdFromNav = (location.state as { preorderId?: string } | null)?.preorderId || null;

    useEffect(() => {
        const loadRequests = async () => {
            setIsLoading(true);
            const data = await getLandlordRentalRequests(
                statusFilter === 'all' ? undefined : statusFilter,
                keyword || undefined,
                1,
                200
            );
            setRequests(data);
            setIsLoading(false);
        };

        const debounceTimer = setTimeout(loadRequests, 300);
        return () => clearTimeout(debounceTimer);
    }, [statusFilter, keyword]);

    useEffect(() => {
        if (!preorderIdFromNav || requests.length === 0) return;
        const target = document.getElementById(`preorder-${preorderIdFromNav}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [preorderIdFromNav, requests]);

    // Statistics
    const stats = useMemo(() => ({
        total: requests.length,
        pending: requests.filter(r => r.status === 'PENDING').length,
        confirmed: requests.filter(r => r.status === 'CONFIRMED').length,
        paidPending: requests.filter(r => r.status === 'PENDING' && r.paymentStatus === 'PAID').length,
    }), [requests]);

    // Group by rental → room
    const grouped = useMemo((): GroupedRental[] => {
        const rentalMap = new Map<string, { rentalId: string; rentalTitle: string; rooms: Map<string, GroupedRoom> }>();

        for (const req of requests) {
            const rentalId = req.rental.id;
            const roomId = req.room.id;

            if (!rentalMap.has(rentalId)) {
                rentalMap.set(rentalId, {
                    rentalId,
                    rentalTitle: req.rental.title,
                    rooms: new Map(),
                });
            }

            const rentalGroup = rentalMap.get(rentalId)!;
            if (!rentalGroup.rooms.has(roomId)) {
                rentalGroup.rooms.set(roomId, {
                    roomId,
                    roomName: req.room.room_name || roomId,
                    roomPrice: req.room.price,
                    requests: [],
                });
            }

            rentalGroup.rooms.get(roomId)!.requests.push(req);
        }

        return Array.from(rentalMap.values()).map(rental => ({
            ...rental,
            rooms: Array.from(rental.rooms.values()),
        }));
    }, [requests]);

    const handleConfirm = async (preorderId: string) => {
        setActioningId(preorderId);
        const success = await confirmRentalRequest(preorderId);
        if (success) {
            setRequests(prev => prev.map(r => r.id === preorderId ? { ...r, status: 'CONFIRMED' } : r));
        }
        setActioningId(null);
    };

    const handleReject = async (preorderId: string) => {
        setActioningId(preorderId);
        const success = await rejectRentalRequest(preorderId);
        if (success) {
            setRequests(prev => prev.map(r => r.id === preorderId ? { ...r, status: 'CANCELLED' } : r));
        }
        setActioningId(null);
    };

    const handleGoToContract = (request: RentalRequest) => {
        navigate(`/rental-management/rentals/${request.rental.id}/room-posts/${request.room.id}`);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Yêu cầu đặt cọc</h1>
                <p className="mt-1 text-sm text-slate-500">Quản lý các yêu cầu đặt cọc từ tenant cho tất cả phòng của bạn</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
                    <div className="text-sm text-muted-foreground">Tổng yêu cầu</div>
                    <div className="text-3xl font-bold">{stats.total}</div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
                    <div className="text-sm text-muted-foreground">Chờ xác nhận</div>
                    <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
                    <div className="text-sm text-muted-foreground">Đã đặt cọc</div>
                    <div className="text-3xl font-bold text-blue-600">{stats.paidPending}</div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
                    <div className="text-sm text-muted-foreground">Đã duyệt</div>
                    <div className="text-3xl font-bold text-green-600">{stats.confirmed}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-col sm:flex-row">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email, phòng..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <select
                    value={statusFilter}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ xác nhận</option>
                    <option value="CONFIRMED">Đã duyệt</option>
                    <option value="CANCELLED">Đã từ chối</option>
                </select>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center items-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
                </div>
            ) : grouped.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border bg-white py-16 text-center text-muted-foreground">
                    Không có yêu cầu nào
                </div>
            ) : (
                <div className="space-y-8">
                    {grouped.map((rental) => (
                        <div key={rental.rentalId} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            {/* Rental header */}
                            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nhà cho thuê</span>
                                <span className="font-semibold text-slate-800">{rental.rentalTitle}</span>
                            </div>

                            {/* Rooms */}
                            <div className="divide-y divide-slate-100">
                                {rental.rooms.map((room) => {
                                    const pendingCount = room.requests.filter(r => r.status === 'PENDING').length;
                                    return (
                                        <div key={room.roomId} className="px-5 py-4">
                                            {/* Room header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-900">{room.roomName}</span>
                                                        <span className="ml-2 text-sm text-slate-500">{formatCurrency(room.roomPrice)}/tháng</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {pendingCount > 0 && (
                                                        <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                                                            {pendingCount} chờ duyệt
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-400">{room.requests.length} yêu cầu</span>
                                                </div>
                                            </div>

                                            {/* Bidders list */}
                                            <div className="space-y-3 pl-11">
                                                {room.requests.map((request) => {
                                                    const displayStatus = getDisplayStatus(request);
                                                    const isPending = request.status === 'PENDING';
                                                    const isConfirmed = request.status === 'CONFIRMED';
                                                    const isFavoriteOnly = (request.sourceType || 'PREORDER') === 'FAVORITE' && request.paymentStatus === 'UNPAID';

                                                    return (
                                                        <div
                                                            key={request.id}
                                                            id={`preorder-${request.id}`}
                                                            className={`rounded-xl border p-4 transition-shadow ${isPending ? 'border-yellow-200 bg-yellow-50/40' : isConfirmed ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-white'}`}
                                                        >
                                                            <div className="flex flex-col gap-3">
                                                                {/* Bidder info + status */}
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                                                                            {request.user.fullName?.charAt(0)?.toUpperCase() || '?'}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-semibold text-slate-900 truncate">{request.user.fullName}</p>
                                                                            <p className="text-xs text-slate-500 truncate">{request.user.email}</p>
                                                                            {request.user.phone && (
                                                                                <p className="text-xs text-slate-500">{request.user.phone}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${statusColors[displayStatus]}`}>
                                                                        {statusLabels[displayStatus]}
                                                                    </span>
                                                                </div>

                                                                {/* Bid details */}
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                                                    <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                                                                        <p className="text-xs text-slate-400 mb-0.5">Số tiền đặt cọc</p>
                                                                        <p className="font-bold text-primary">
                                                                            {request.depositAmount > 0 ? formatCurrency(request.depositAmount) : '—'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                                                                        <p className="text-xs text-slate-400 mb-0.5">Thanh toán</p>
                                                                        <p className={`font-medium ${paymentStatusColors[request.paymentStatus]}`}>
                                                                            {paymentStatusLabels[request.paymentStatus]}
                                                                        </p>
                                                                    </div>
                                                                    <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                                                                        <p className="text-xs text-slate-400 mb-0.5">Ngày yêu cầu</p>
                                                                        <p className="font-medium text-slate-700">{formatDateTime(request.createdAt)}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Favorite-only notice */}
                                                                {isPending && isFavoriteOnly && (
                                                                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                                                        Tenant chưa đặt cọc (từ wishlist), nhưng bạn vẫn có thể duyệt cho thuê trực tiếp.
                                                                    </div>
                                                                )}

                                                                {/* Actions */}
                                                                {isPending && (
                                                                    <div className="flex gap-2 pt-1">
                                                                        <button
                                                                            onClick={() => handleConfirm(request.id)}
                                                                            disabled={actioningId === request.id}
                                                                            className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
                                                                        >
                                                                            {actioningId === request.id ? 'Đang xử lý...' : '✓ Chấp nhận'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleReject(request.id)}
                                                                            disabled={actioningId === request.id}
                                                                            className="flex-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-red-600 transition-colors"
                                                                        >
                                                                            {actioningId === request.id ? 'Đang xử lý...' : '✕ Từ chối'}
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* After accepted → go to create contract */}
                                                                {isConfirmed && (
                                                                    <div className="flex items-center gap-3 pt-1">
                                                                        <div className="flex-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                                                                            Đã chấp nhận. Bấm nút bên phải để tạo hợp đồng với tenant này.
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleGoToContract(request)}
                                                                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors whitespace-nowrap"
                                                                        >
                                                                            Tạo hợp đồng →
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
