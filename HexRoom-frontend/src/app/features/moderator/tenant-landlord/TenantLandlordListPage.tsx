import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

interface UserItem {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    status: string;
    warningCount: number;
    createdAt: string;
}

interface UserDetail extends UserItem {
    updated_at: string | null;
    wallet: { id: string; balance: string; created_at: string } | null;
    rentals: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: string;
        rooms: { id: string }[];
    }>;
    preorders: Array<{
        id: string;
        status: string;
        payment_status: string;
        deposit_amount: string | null;
        createdAt: string;
    }>;
    stats: {
        totalRentals: number;
        totalFavorites: number;
        totalPreorders: number;
    };
    preference?: {
        budget_min: number | null;
        budget_max: number | null;
        preferredLocation: string | null;
        preferred_gender: string | null;
    } | null;
    lifestyleProfile?: {
        personalityType: string | null;
    } | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const roleBadge: Record<string, string> = {
    TENANT: 'bg-sky-100 text-sky-700',
    LANDLORD: 'bg-violet-100 text-violet-700',
    MODERATOR: 'bg-amber-100 text-amber-700',
    ADMIN: 'bg-rose-100 text-rose-700',
    GUEST: 'bg-slate-100 text-slate-600',
};

const roleLabel: Record<string, string> = {
    TENANT: 'Người thuê',
    LANDLORD: 'Chủ trọ',
    MODERATOR: 'Moderator',
    ADMIN: 'Admin',
    GUEST: 'Khách',
};

const statusBadge: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-slate-200 text-slate-600',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    BANNED: 'bg-rose-100 text-rose-700',
};

const statusLabel: Record<string, string> = {
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Ngừng hoạt động',
    SUSPENDED: 'Tạm khóa',
    BANNED: 'Bị cấm',
};

const rentalStatusMap: Record<string, { label: string; cls: string }> = {
    AVAILABLE: { label: 'Đang hiển thị', cls: 'bg-emerald-100 text-emerald-700' },
    UNAVAILABLE: { label: 'Tạm ngưng', cls: 'bg-blue-100 text-blue-700' },
    HIDDEN: { label: 'Đã ẩn', cls: 'bg-slate-200 text-slate-600' },
    VIOLATE: { label: 'Vi phạm', cls: 'bg-rose-100 text-rose-700' },
    PENDING: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
    SUSPEND: { label: 'Tạm khóa', cls: 'bg-slate-200 text-slate-600' },
};

function formatDate(dateString?: string | null) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatMoney(value: string | number | null | undefined) {
    if (value == null) return '--';
    return Number(value).toLocaleString('vi-VN') + ' đ';
}

const DEFAULT_AVATAR =
    'https://ui-avatars.com/api/?background=e2e8f0&color=475569&bold=true&size=40';

/* ═══════════════════════ Icons ═══════════════════════ */
function EyeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
}
function BanIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
    );
}
function UnlockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
    );
}
function CloseIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

/* ═══════════════════════ Toast ═══════════════════════ */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300
            ${type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
            {type === 'success' ? '✓' : '✗'} {message}
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
        </div>
    );
}

/* ═══════════════════════ Confirm Modal ═══════════════════════ */
function ConfirmModal({
    open, title, description, confirmLabel, confirmDanger, loading, onConfirm, onCancel,
}: {
    open: boolean; title: string; description: string; confirmLabel: string;
    confirmDanger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${confirmDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {loading ? 'Đang xử lý...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════ Detail Modal (centered) ═══════════════════════ */
function UserDetailModal({
    open, user, loading, onClose,
}: {
    open: boolean; user: UserDetail | null; loading: boolean; onClose: () => void;
}) {
    if (!open) return null;
    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            {/* Centered modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                    {/* Sticky header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
                        <h2 className="text-lg font-semibold text-slate-900">Chi tiết người dùng</h2>
                        <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 transition">
                            <CloseIcon />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-24 text-sm text-slate-500">Đang tải...</div>
                    ) : user ? (
                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="flex items-center gap-4">
                                <img
                                    src={user.avatarUrl || `${DEFAULT_AVATAR}&name=${encodeURIComponent(user.fullName)}`}
                                    alt={user.fullName}
                                    crossOrigin="anonymous"
                                    className="h-16 w-16 rounded-full object-cover bg-slate-100 ring-2 ring-slate-200"
                                />
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">{user.fullName}</h3>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                    <div className="mt-1.5 flex gap-2">
                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {roleLabel[user.role] ?? user.role}
                                        </span>
                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[user.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {statusLabel[user.status] ?? user.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Basic info */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        <tr><td className="px-4 py-2.5 font-medium text-slate-500 w-36">ID</td><td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{user.id}</td></tr>
                                        <tr><td className="px-4 py-2.5 font-medium text-slate-500">SĐT</td><td className="px-4 py-2.5 text-slate-700">{user.phone || '--'}</td></tr>
                                        <tr><td className="px-4 py-2.5 font-medium text-slate-500">Ngày tạo</td><td className="px-4 py-2.5 text-slate-700">{formatDate(user.createdAt)}</td></tr>
                                        <tr><td className="px-4 py-2.5 font-medium text-slate-500">Cập nhật</td><td className="px-4 py-2.5 text-slate-700">{formatDate(user.updated_at)}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Stats */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Thống kê</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                                        <div className="text-xl font-bold text-slate-900">{user.stats.totalRentals}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Bài đăng</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                                        <div className="text-xl font-bold text-slate-900">{user.stats.totalFavorites}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Yêu thích</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                                        <div className="text-xl font-bold text-slate-900">{user.stats.totalPreorders}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Đặt cọc</div>
                                    </div>
                                </div>
                            </div>

                            {/* Wallet */}
                            {user.wallet && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">💰 Ví</h4>
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <div className="text-2xl font-bold text-emerald-600">{formatMoney(user.wallet.balance)}</div>
                                        <div className="text-xs text-slate-500 mt-1">Tạo ngày {formatDate(user.wallet.created_at)}</div>
                                    </div>
                                </div>
                            )}

                            {/* Preferences */}
                            {user.preference && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">🔍 Sở thích tìm phòng</h4>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-4 py-2.5 font-medium text-slate-500 w-36">Ngân sách</td>
                                                    <td className="px-4 py-2.5 text-slate-700">
                                                        {user.preference.budget_min && user.preference.budget_max
                                                            ? `${formatMoney(user.preference.budget_min)} - ${formatMoney(user.preference.budget_max)}`
                                                            : '--'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2.5 font-medium text-slate-500">Khu vực</td>
                                                    <td className="px-4 py-2.5 text-slate-700">{user.preference.preferredLocation || '--'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Rentals (Landlord) */}
                            {user.role === 'LANDLORD' && user.rentals.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">🏠 Bài đăng ({user.rentals.length})</h4>
                                    <div className="space-y-2">
                                        {user.rentals.map((r) => {
                                            const st = rentalStatusMap[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
                                            return (
                                                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-900 text-sm">{r.title}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{r.rooms.length} phòng · {formatDate(r.createdAt)}</p>
                                                    </div>
                                                    <span className={`shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Preorders */}
                            {user.preorders.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">🛒 Đặt cọc gần đây</h4>
                                    <div className="space-y-2">
                                        {user.preorders.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                                <div className="flex gap-2">
                                                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{p.status}</span>
                                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {p.payment_status}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    {p.deposit_amount && <span className="text-sm font-medium text-slate-900">{formatMoney(p.deposit_amount)}</span>}
                                                    <p className="text-xs text-slate-500">{formatDate(p.createdAt)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Landlord warning */}
                            {user.role === 'LANDLORD' && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <p className="text-sm font-medium text-amber-800">
                                        ⚠️ Lưu ý: Dữ liệu chủ trọ có thể liên kết với nhiều bài đăng, phòng, đặt cọc và giao dịch.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-24 text-sm text-slate-500">Không tìm thấy thông tin.</div>
                    )}
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════ Main Page ═══════════════════════ */
export function TenantLandlordListPage() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Confirm modal
    const [confirm, setConfirm] = useState<{
        user: UserItem; action: 'BAN' | 'UNBAN';
    } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Detail modal
    const [modalOpen, setModalOpen] = useState(false);
    const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    const loadUsers = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '10');
            if (roleFilter !== 'all') params.set('role', roleFilter);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

            const res = await authFetch(`/moderator/users?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
                setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadUsers(1);
    }, [roleFilter, statusFilter, debouncedSearch]);

    const goToPage = (page: number) => {
        if (page < 1 || page > pagination.totalPages) return;
        void loadUsers(page);
    };

    /* ── Status toggle ── */
    const handleStatusToggle = async () => {
        if (!confirm) return;
        setConfirmLoading(true);
        try {
            const newStatus = confirm.action === 'BAN' ? 'BANNED' : 'ACTIVE';
            const res = await authFetch(`/moderator/users/${confirm.user.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ message: data.message || 'Cập nhật thành công', type: 'success' });
                void loadUsers(pagination.page);
            } else {
                setToast({ message: data.message || 'Có lỗi xảy ra', type: 'error' });
            }
        } catch {
            setToast({ message: 'Lỗi kết nối server', type: 'error' });
        } finally {
            setConfirmLoading(false);
            setConfirm(null);
        }
    };

    /* ── View detail ── */
    const handleViewDetail = async (user: UserItem) => {
        setModalOpen(true);
        setDetailLoading(true);
        setDetailUser(null);
        try {
            const res = await authFetch(`/moderator/users/${user.id}`);
            const data = await res.json();
            if (data.success) {
                setDetailUser(data.data);
            }
        } catch (err) {
            console.error('Failed to load user detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <section className="mx-auto w-full max-w-7xl py-6 px-4">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">Người thuê / Chủ trọ</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Xem danh sách người thuê và chủ trọ trên hệ thống.
                </p>
            </header>

            {/* ── Filters ── */}
            <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên, email, số điện thoại..."
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                    <option value="all">Tất cả vai trò</option>
                    <option value="TENANT">Người thuê</option>
                    <option value="LANDLORD">Chủ trọ</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                    <option value="SUSPENDED">Tạm khóa</option>
                    <option value="BANNED">Bị cấm</option>
                </select>
            </div>

            {/* ── Table ── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {isLoading ? (
                    <div className="p-6 text-sm text-slate-600">Đang tải danh sách...</div>
                ) : users.length === 0 ? (
                    <div className="p-6 text-sm text-slate-600">Không tìm thấy người dùng nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                    <th className="px-4 py-3 font-semibold text-slate-700">Người dùng</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Số điện thoại</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Vai trò</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Trạng thái</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 text-center">Cảnh cáo</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Ngày tham gia</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="transition hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatarUrl || `${DEFAULT_AVATAR}&name=${encodeURIComponent(user.fullName)}`}
                                                    alt={user.fullName}
                                                    crossOrigin="anonymous"
                                                    className="h-9 w-9 rounded-full object-cover bg-slate-100"
                                                />
                                                <span className="font-medium text-slate-900">{user.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                        <td className="px-4 py-3 text-slate-600">{user.phone || '--'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {roleLabel[user.role] ?? user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[user.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {statusLabel[user.status] ?? user.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.warningCount > 0 ? (
                                                <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                                    {user.warningCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* View detail */}
                                                <button
                                                    onClick={() => handleViewDetail(user)}
                                                    title="Xem chi tiết"
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                                                >
                                                    <EyeIcon />
                                                </button>
                                                {/* Ban / Unban */}
                                                {user.role !== 'ADMIN' && user.role !== 'MODERATOR' && (
                                                    user.status === 'ACTIVE' ? (
                                                        <button
                                                            onClick={() => setConfirm({ user, action: 'BAN' })}
                                                            title="Cấm người dùng"
                                                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                                                        >
                                                            <BanIcon />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirm({ user, action: 'UNBAN' })}
                                                            title="Mở khóa người dùng"
                                                            className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition"
                                                        >
                                                            <UnlockIcon />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Pagination ── */}
                {!isLoading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                        <p className="text-sm text-slate-600">
                            Hiển thị {(pagination.page - 1) * pagination.limit + 1}–
                            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} người dùng
                        </p>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => goToPage(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                ← Trước
                            </button>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                .filter((p) => {
                                    const dist = Math.abs(p - pagination.page);
                                    return dist <= 2 || p === 1 || p === pagination.totalPages;
                                })
                                .map((p, idx, arr) => {
                                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                                    return (
                                        <span key={p} className="flex items-center">
                                            {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                                            <button
                                                type="button"
                                                onClick={() => goToPage(p)}
                                                className={`min-w-[32px] rounded-lg px-2 py-1.5 text-sm font-medium transition ${p === pagination.page
                                                    ? 'bg-slate-900 text-white'
                                                    : 'text-slate-700 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </span>
                                    );
                                })}
                            <button
                                type="button"
                                onClick={() => goToPage(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Confirm Modal ── */}
            <ConfirmModal
                open={!!confirm}
                title={confirm?.action === 'BAN' ? 'Cấm người dùng?' : 'Mở khóa người dùng?'}
                description={
                    confirm?.action === 'BAN'
                        ? `Bạn có chắc muốn cấm "${confirm?.user.fullName}"? Người dùng sẽ không thể đăng nhập sau khi bị cấm.`
                        : `Bạn có chắc muốn mở khóa "${confirm?.user.fullName}"? Người dùng sẽ có thể đăng nhập lại bình thường.`
                }
                confirmLabel={confirm?.action === 'BAN' ? 'Cấm' : 'Mở khóa'}
                confirmDanger={confirm?.action === 'BAN'}
                loading={confirmLoading}
                onConfirm={handleStatusToggle}
                onCancel={() => setConfirm(null)}
            />

            {/* ── Detail Modal (centered) ── */}
            <UserDetailModal
                open={modalOpen}
                user={detailUser}
                loading={detailLoading}
                onClose={() => { setModalOpen(false); setDetailUser(null); }}
            />
        </section>
    );
}
