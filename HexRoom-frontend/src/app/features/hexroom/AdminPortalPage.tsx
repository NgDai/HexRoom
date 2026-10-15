import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../home/components';
import { useAuth } from '@/app/context/useAuth';
import { money } from '@/lib/hexroom-api';
import { MOCK_ROOMS_DATA } from '@/lib/mock-data';
import {
    ShieldCheck, Users, Building2, Banknote, AlertCircle, CheckCircle2,
    Search, Filter, Lock, Unlock, UserCheck, Trash2, Eye, ExternalLink,
    Crown, Settings, FileText, BarChart3, TrendingUp, Check, X, ShieldAlert
} from 'lucide-react';

interface ManagedUser {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: 'TENANT' | 'LANDLORD' | 'INSPECTOR' | 'ADMIN';
    status: 'ACTIVE' | 'BANNED';
    createdAt: string;
    verifiedRoomsCount?: number;
    propertiesCount?: number;
}

interface ViolationReport {
    id: string;
    roomName: string;
    roomId: string;
    reportedBy: string;
    reason: string;
    details: string;
    createdAt: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
}

const DEFAULT_USERS: ManagedUser[] = [
    {
        id: 'USR-ADMIN-01',
        fullName: 'Trần Ban Quản Trị',
        email: 'admin@hexroom.vn',
        phone: '0901 888 999',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-01-15'
    },
    {
        id: 'USR-INSP-01',
        fullName: 'Lê Văn Kiểm Định',
        email: 'inspector.le@hexroom.vn',
        phone: '0902 333 444',
        role: 'INSPECTOR',
        status: 'ACTIVE',
        createdAt: '2026-02-10',
        verifiedRoomsCount: 48
    },
    {
        id: 'USR-LANDLORD-01',
        fullName: 'Cô Nguyễn Thị Hoa',
        email: 'nguyenhoa.rental@gmail.com',
        phone: '0908 123 456',
        role: 'LANDLORD',
        status: 'ACTIVE',
        createdAt: '2026-03-01',
        propertiesCount: 3
    },
    {
        id: 'USR-LANDLORD-02',
        fullName: 'Anh Trần Văn Hùng',
        email: 'tranhung.phongtro@gmail.com',
        phone: '0912 345 678',
        role: 'LANDLORD',
        status: 'ACTIVE',
        createdAt: '2026-03-12',
        propertiesCount: 2
    },
    {
        id: 'USR-TENANT-01',
        fullName: 'Phạm Minh Tuấn (Sinh viên HUTECH)',
        email: 'tuan.pm2026@gmail.com',
        phone: '0938 111 222',
        role: 'TENANT',
        status: 'ACTIVE',
        createdAt: '2026-04-05'
    },
    {
        id: 'USR-TENANT-02',
        fullName: 'Hoàng Thùy Linh (Nhân viên VP)',
        email: 'thuylinh.hr@gmail.com',
        phone: '0977 444 555',
        role: 'TENANT',
        status: 'ACTIVE',
        createdAt: '2026-04-18'
    }
];

const DEFAULT_REPORTS: ViolationReport[] = [
    {
        id: 'RPT-101',
        roomName: 'Studio Ban Công Thoáng Mát — Full Nội Thất Cao Cấp',
        roomId: 'room-001',
        reportedBy: 'Phạm Minh Tuấn',
        reason: 'Giá điện nước thực tế có chênh lệch',
        details: 'Khách đến xem hỏi thì chủ nhà nói điện 4.000đ/kWh thay vì 3.800đ niêm yết trên web.',
        createdAt: '2026-10-14',
        status: 'PENDING'
    },
    {
        id: 'RPT-102',
        roomName: 'Căn Hộ Mini 1PN Riêng Biệt',
        roomId: 'room-003',
        reportedBy: 'Hoàng Thùy Linh',
        reason: 'Ảnh ban công không giống thực tế',
        details: 'Góc chụp ban công bị che chắn bởi nhà bên cạnh.',
        createdAt: '2026-10-12',
        status: 'RESOLVED'
    }
];

export function AdminPortalPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [reports, setReports] = useState<ViolationReport[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms' | 'reports'>('overview');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');

    useEffect(() => {
        try {
            const storedUsers = localStorage.getItem('hexroom_admin_users');
            if (storedUsers) {
                setUsers(JSON.parse(storedUsers));
            } else {
                setUsers(DEFAULT_USERS);
                localStorage.setItem('hexroom_admin_users', JSON.stringify(DEFAULT_USERS));
            }

            const storedReports = localStorage.getItem('hexroom_admin_reports');
            if (storedReports) {
                setReports(JSON.parse(storedReports));
            } else {
                setReports(DEFAULT_REPORTS);
                localStorage.setItem('hexroom_admin_reports', JSON.stringify(DEFAULT_REPORTS));
            }
        } catch {
            setUsers(DEFAULT_USERS);
            setReports(DEFAULT_REPORTS);
        }
    }, []);

    // Change user role
    const handleChangeRole = (userId: string, newRole: ManagedUser['role']) => {
        const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
        setUsers(updated);
        localStorage.setItem('hexroom_admin_users', JSON.stringify(updated));
        alert(`Đã cập nhật role của tài khoản sang: ${newRole}`);
    };

    // Toggle ban/active user
    const handleToggleStatus = (userId: string) => {
        const updated = users.map(u => {
            if (u.id === userId) {
                const nextStatus: ManagedUser['status'] = u.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
                return { ...u, status: nextStatus };
            }
            return u;
        });
        setUsers(updated);
        localStorage.setItem('hexroom_admin_users', JSON.stringify(updated));
    };

    // Resolve report
    const handleResolveReport = (reportId: string) => {
        const updated = reports.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' as const } : r);
        setReports(updated);
        localStorage.setItem('hexroom_admin_reports', JSON.stringify(updated));
        alert('Đã xử lý xong báo cáo vi phạm!');
    };

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                const matchName = u.fullName.toLowerCase().includes(kw);
                const matchEmail = u.email.toLowerCase().includes(kw);
                const matchPhone = u.phone.toLowerCase().includes(kw);
                if (!matchName && !matchEmail && !matchPhone) return false;
            }
            return true;
        });
    }, [users, roleFilter, searchKeyword]);

    const tenantCount = users.filter(u => u.role === 'TENANT').length;
    const landlordCount = users.filter(u => u.role === 'LANDLORD').length;
    const inspectorCount = users.filter(u => u.role === 'INSPECTOR').length;
    const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;

    return (
        <div className="hx-page" style={{ background: '#FFFFFF', minHeight: '100vh' }}>
            <Header />

            <main className="hx-container hx-section" style={{ paddingTop: 32, paddingBottom: 64 }}>
                {/* Title Header */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 11, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                        <Crown size={14} /> Trung Tâm Quản Trị Hệ Thống HexRoom (Admin Portal)
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                                Điều Hành Nền Tảng & Phân Quyền Tài Khoản
                            </h1>
                            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 740, lineHeight: 1.6, margin: 0 }}>
                                Giám sát toàn diện người dùng (Khách thuê, Chủ trọ, Inspector, Admin), điều phối duyệt phòng và giải quyết khiếu nại báo cáo.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <Link
                                to="/inspector"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, color: '#065F46', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                            >
                                <ShieldCheck size={15} /> Sang Cổng Inspector ↗
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── KPI METRICS CARDS ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>TỔNG NGƯỜI DÙNG</span>
                            <Users size={16} style={{ color: '#2563EB' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#0F172A' }}>{users.length}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                            {tenantCount} Khách thuê · {landlordCount} Chủ trọ
                        </div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#065F46', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>ĐỘI NGŨ INSPECTOR</span>
                            <ShieldCheck size={16} style={{ color: '#059669' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#059669' }}>{inspectorCount}</div>
                        <div style={{ fontSize: 11, color: '#047857', marginTop: 4 }}>Kiểm định viên đang hoạt động</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>PHÒNG TRỌ TOÀN SÀN</span>
                            <Building2 size={16} style={{ color: '#6366F1' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#0F172A' }}>{MOCK_ROOMS_DATA.length}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>100% minh bạch chi phí</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #FECDD3', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#E11D48', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>KHIẾU NẠI & BÁO CÁO</span>
                            <ShieldAlert size={16} style={{ color: '#E11D48' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#E11D48' }}>{pendingReportsCount}</div>
                        <div style={{ fontSize: 11, color: '#9F1239', marginTop: 4 }}>Cần ban quản trị xử lý</div>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #E2E8F0', overflowX: 'auto', paddingBottom: 2 }}>
                        {[
                            { key: 'overview', label: '📊 Tổng quan nền tảng' },
                            { key: 'users', label: `👥 Quản lý Người Dùng & Phân Quyền (${users.length})` },
                            { key: 'rooms', label: `🏠 Quản lý Phòng Trọ Toàn Sàn (${MOCK_ROOMS_DATA.length})` },
                            { key: 'reports', label: `🚨 Báo Cáo Vi Phạm (${reports.length})` }
                        ].map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setActiveTab(t.key as any)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 18px',
                                    borderBottom: activeTab === t.key ? '3px solid #10B981' : '3px solid transparent',
                                    color: activeTab === t.key ? '#059669' : '#64748B',
                                    fontWeight: activeTab === t.key ? 750 : 600,
                                    fontSize: 14,
                                    background: 'transparent',
                                    borderTop: 'none',
                                    borderLeft: 'none',
                                    borderRight: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginBottom: -2,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                                    🎯 Tình trạng Vận hành Nền tảng HexRoom
                                </h3>
                                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
                                    Hệ thống đang hoạt động ổn định với 100% dữ liệu phòng trọ được đối chiếu chỉ số công tơ điện nước. Đội ngũ Inspector sẵn sàng thẩm định tại hiện trường trong vòng 24h.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                    <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Tỷ lệ phòng đã kiểm định:</span>
                                        <div style={{ fontSize: 18, fontWeight: 850, color: '#059669' }}>92.4%</div>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Thời gian phản hồi Inspector TB:</span>
                                        <div style={{ fontSize: 18, fontWeight: 850, color: '#0F172A' }}>2.5 giờ</div>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Khách đặt lịch hẹn xem phòng:</span>
                                        <div style={{ fontSize: 18, fontWeight: 850, color: '#D97706' }}>128 lượt/tuần</div>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Đánh giá trung bình từ người thuê:</span>
                                        <div style={{ fontSize: 18, fontWeight: 850, color: '#2563EB' }}>4.85 / 5.0 ⭐</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: QUẢN LÝ NGƯỜI DÙNG & ROLE */}
                    {activeTab === 'users' && (
                        <div>
                            {/* Filter & Search */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    <input
                                        type="text"
                                        value={searchKeyword}
                                        onChange={e => setSearchKeyword(e.target.value)}
                                        placeholder="Tìm theo tên, email, số điện thoại..."
                                        style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' }}
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={e => setRoleFilter(e.target.value)}
                                    style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', outline: 'none' }}
                                >
                                    <option value="ALL">Tất cả vai trò (Role)</option>
                                    <option value="TENANT">Khách thuê (TENANT)</option>
                                    <option value="LANDLORD">Chủ nhà (LANDLORD)</option>
                                    <option value="INSPECTOR">Kiểm định viên (INSPECTOR)</option>
                                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                                </select>
                            </div>

                            {/* Users Table */}
                            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 14 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            <th style={{ padding: '14px 16px' }}>Người dùng</th>
                                            <th style={{ padding: '14px 16px' }}>Liên hệ</th>
                                            <th style={{ padding: '14px 16px' }}>Phân quyền Role</th>
                                            <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'right' }}>Thao tác Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(u => (
                                            <tr
                                                key={u.id}
                                                style={{ borderBottom: '1px solid #F1F5F9' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>{u.fullName}</div>
                                                    <div style={{ fontSize: 11, color: '#64748B' }}>Mã: {u.id} · Tham gia: {u.createdAt}</div>
                                                </td>

                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ color: '#334155' }}>{u.email}</div>
                                                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 650 }}>{u.phone}</div>
                                                </td>

                                                <td style={{ padding: '14px 16px' }}>
                                                    <select
                                                        value={u.role}
                                                        onChange={e => handleChangeRole(u.id, e.target.value as any)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 8,
                                                            fontSize: 12,
                                                            fontWeight: 750,
                                                            border: '1px solid #CBD5E1',
                                                            background: u.role === 'ADMIN' ? '#EFF6FF' : u.role === 'INSPECTOR' ? '#ECFDF5' : u.role === 'LANDLORD' ? '#FFFBEB' : '#F1F5F9',
                                                            color: u.role === 'ADMIN' ? '#1E40AF' : u.role === 'INSPECTOR' ? '#065F46' : u.role === 'LANDLORD' ? '#92400E' : '#334155',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="TENANT">Khách thuê (TENANT)</option>
                                                        <option value="LANDLORD">Chủ trọ (LANDLORD)</option>
                                                        <option value="INSPECTOR">Kiểm định viên (INSPECTOR)</option>
                                                        <option value="ADMIN">Quản trị viên (ADMIN)</option>
                                                    </select>
                                                </td>

                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: u.status === 'ACTIVE' ? '#ECFDF5' : '#FFF1F2', color: u.status === 'ACTIVE' ? '#065F46' : '#E11D48', border: `1px solid ${u.status === 'ACTIVE' ? '#A7F3D0' : '#FECDD3'}` }}>
                                                        {u.status === 'ACTIVE' ? '🟢 Hoạt động' : '🔴 Đã khóa'}
                                                    </span>
                                                </td>

                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(u.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 8,
                                                            background: u.status === 'ACTIVE' ? '#FFF1F2' : '#ECFDF5',
                                                            color: u.status === 'ACTIVE' ? '#E11D48' : '#059669',
                                                            border: 'none',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: QUẢN LÝ PHÒNG TRỌ TOÀN SÀN */}
                    {activeTab === 'rooms' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                                {MOCK_ROOMS_DATA.map((room) => (
                                    <div key={room.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                <img src={room.images[0]} alt={room.roomName} style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover' }} />
                                                <div>
                                                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>{room.roomName}</h4>
                                                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 650, marginTop: 2 }}>{room.rentalTitle}</div>
                                                    <div style={{ fontSize: 14, fontWeight: 850, color: '#0F172A', marginTop: 4 }}>{money(room.price)}/tháng</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 11, fontWeight: 750, color: '#065F46', background: '#ECFDF5', padding: '3px 8px', borderRadius: 6 }}>
                                                ✅ Đã kiểm định 100%
                                            </span>
                                            <Link
                                                to={`/room/${room.id}`}
                                                style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}
                                            >
                                                Xem công khai ↗
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: BÁO CÁO VI PHẠM */}
                    {activeTab === 'reports' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {reports.map((rpt) => (
                                <div key={rpt.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 750, color: '#E11D48', background: '#FFF1F2', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 6 }}>
                                                {rpt.reason}
                                            </span>
                                            <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                                {rpt.roomName}
                                            </h4>
                                            <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                                                <strong>Chi tiết phản ánh:</strong> {rpt.details}
                                            </p>
                                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                                                Người gửi: <strong>{rpt.reportedBy}</strong> · Ngày gửi: {rpt.createdAt}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {rpt.status === 'PENDING' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleResolveReport(rpt.id)}
                                                    style={{ padding: '8px 16px', borderRadius: 10, background: '#10B981', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 750, cursor: 'pointer' }}
                                                >
                                                    Đã xử lý & Hoàn tất
                                                </button>
                                            ) : (
                                                <span style={{ padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1E40AF', fontSize: 11, fontWeight: 750, border: '1px solid #BFDBFE' }}>
                                                    ✅ Đã giải quyết
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
