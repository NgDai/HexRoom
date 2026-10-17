import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../home/components';
import { useAuth } from '@/app/context/useAuth';
import { money, type ApiRoom } from '@/lib/hexroom-api';
import {
    ShieldCheck, Calendar, Clock, MapPin, Phone, Eye, CheckCircle2,
    AlertCircle, Search, Filter, Camera, Zap, Droplets, Check, X,
    FileText, User, Building2, ExternalLink, ArrowRight, Sparkles, Award
} from 'lucide-react';

interface InspectionTask {
    id: string;
    roomId: string;
    roomName: string;
    propertyName: string;
    address: string;
    district: string;
    landlordName: string;
    landlordPhone: string;
    requestedDate: string;
    timeSlot: string;
    scope: string[];
    notes: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED';
    currentElecKwh?: number;
    currentWaterM3?: number;
    findings?: string;
    inspectorNote?: string;
    images?: string[];
}

const DEFAULT_INSPECTION_TASKS: InspectionTask[] = [
    {
        id: 'INSP-REQ-201',
        roomId: 'room-001',
        roomName: 'Studio Ban Công Thoáng Mát — Full Nội Thất Cao Cấp',
        propertyName: 'Tòa nhà căn hộ dịch vụ HexHouse Bình Thạnh',
        address: '152/24 Nguyễn Gia Trí (D2 cũ), Phường 25',
        district: 'Quận Bình Thạnh',
        landlordName: 'Cô Nguyễn Thị Hoa',
        landlordPhone: '0908 123 456',
        requestedDate: '2026-10-16',
        timeSlot: 'Sáng (8:30 - 11:30)',
        scope: ['Hiện trạng & nội thất phòng', 'Giá thuê & các khoản phụ phí', 'Xác thực hình ảnh & công tơ'],
        notes: 'Chìa khóa gửi bảo vệ tại cổng chính, chủ trọ có mặt lúc 9:00 sáng.',
        status: 'VERIFIED',
        currentElecKwh: 142,
        currentWaterM3: 18,
        findings: 'Phòng thực tế 100% khớp ảnh chụp. Công tơ điện hoạt động chuẩn xác, có tem kiểm định. Điều hòa Daikin Inverter mát sâu, nhà vệ sinh sạch sẽ thiết bị mới.',
        inspectorNote: 'Đã cấp chứng nhận ĐÃ ĐỐI CHIẾU 100% cho căn phòng này.',
        images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800'
        ]
    },
    {
        id: 'INSP-REQ-202',
        roomId: 'room-002',
        roomName: 'Phòng Gác Lửng Đúc Hiện Đại — Gần ĐH Ngoại Thương & HUTECH',
        propertyName: 'Khu Trọ An Ninh D5 Bình Thạnh',
        address: '48 Đường D5, Phường 25',
        district: 'Quận Bình Thạnh',
        landlordName: 'Anh Trần Văn Hùng',
        landlordPhone: '0912 345 678',
        requestedDate: '2026-10-17',
        timeSlot: 'Chiều (13:30 - 17:00)',
        scope: ['Hiện trạng & nội thất phòng', 'Xác thực hình ảnh & công tơ'],
        notes: 'Chủ nhà trực tiếp dẫn lên kiểm tra công tơ điện và đối chiếu gác lửng.',
        status: 'IN_PROGRESS',
        currentElecKwh: 89,
        currentWaterM3: 12,
        findings: 'Đã khảo sát phần gác lửng đúc cao 1m8, gạch men mới lát, cần chốt lại chỉ số nước.',
        images: [
            'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800'
        ]
    },
    {
        id: 'INSP-REQ-203',
        roomId: 'room-003',
        roomName: 'Căn Hộ Mini 1PN Riêng Biệt — View Landmark 81',
        propertyName: 'Tòa Nhà Xanh Ung Văn Khiêm',
        address: '26 Ung Văn Khiêm, Phường 25',
        district: 'Quận Bình Thạnh',
        landlordName: 'Chị Mai Phương',
        landlordPhone: '0938 789 012',
        requestedDate: '2026-10-18',
        timeSlot: 'Sáng (8:30 - 11:30)',
        scope: ['Giá thuê & các khoản phụ phí', 'Xác thực hình ảnh & công tơ'],
        notes: 'Gọi trước 20 phút khi tới, bãi giữ xe rộng rãi dưới tầng hầm.',
        status: 'PENDING',
        images: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
        ]
    },
    {
        id: 'INSP-REQ-204',
        roomId: 'room-004',
        roomName: 'Phòng Trọ Tiện Nghi Ban Công View Landmark 81',
        propertyName: 'HexHouse Xô Viết Nghệ Tĩnh',
        address: '215 Xô Viết Nghệ Tĩnh, Phường 17',
        district: 'Quận Bình Thạnh',
        landlordName: 'Chú Hoàng Nam',
        landlordPhone: '0903 654 987',
        requestedDate: '2026-10-19',
        timeSlot: 'Cả ngày (Báo trước 30 phút)',
        scope: ['Hiện trạng & nội thất phòng', 'Giá thuê & các khoản phụ phí'],
        notes: 'Yêu cầu kiểm tra hệ thống điều hòa và ban công đón gió.',
        status: 'PENDING',
        images: [
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
        ]
    }
];

export function InspectorPortalPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<InspectionTask[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'verified'>('all');
    const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
    const [inspectModalOpen, setInspectModalOpen] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [districtFilter, setDistrictFilter] = useState('ALL');

    // Verification Form State
    const [verifyElec, setVerifyElec] = useState<number>(100);
    const [verifyWater, setVerifyWater] = useState<number>(15);
    const [verifyFindings, setVerifyFindings] = useState('');
    const [verifyResult, setVerifyResult] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
    const [checklistItems, setChecklistItems] = useState<{ [key: string]: boolean }>({
        step1_condition: true,
        step1_ac_tested: true,
        step2_meter_verified: true,
        step2_transparent_pricing: true,
        step3_photos_verified: true,
        step4_safety_clean: true,
    });

    // Load tasks from storage or default
    useEffect(() => {
        try {
            const stored = localStorage.getItem('hexroom_inspector_tasks');
            if (stored) {
                setTasks(JSON.parse(stored));
            } else {
                setTasks(DEFAULT_INSPECTION_TASKS);
                localStorage.setItem('hexroom_inspector_tasks', JSON.stringify(DEFAULT_INSPECTION_TASKS));
            }

            // Sync with local inspection requests from landlords
            const landlordReqs = JSON.parse(localStorage.getItem('hexroom_inspection_requests') || '[]');
            if (landlordReqs.length > 0) {
                setTasks(prev => {
                    const existingIds = new Set(prev.map(t => t.roomId));
                    const newTasks: InspectionTask[] = landlordReqs
                        .filter((r: any) => !existingIds.has(r.roomId))
                        .map((r: any, idx: number) => ({
                            id: `INSP-REQ-${Date.now() + idx}`,
                            roomId: r.roomId,
                            roomName: r.roomName || 'Phòng trọ mới',
                            propertyName: 'Khu trọ yêu cầu kiểm định',
                            address: 'TP.HCM',
                            district: 'Quận Bình Thạnh',
                            landlordName: 'Chủ trọ',
                            landlordPhone: r.contactPhone || '0908 123 456',
                            requestedDate: r.preferredDate || new Date().toISOString().split('T')[0],
                            timeSlot: r.preferredTimeSlot || 'Sáng (8:30 - 11:30)',
                            scope: ['Hiện trạng & nội thất phòng', 'Xác thực hình ảnh & công tơ'],
                            notes: r.notes || '',
                            status: 'PENDING'
                        }));
                    return [...newTasks, ...prev];
                });
            }
        } catch {
            setTasks(DEFAULT_INSPECTION_TASKS);
        }
    }, []);

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (activeTab === 'pending' && t.status !== 'PENDING') return false;
            if (activeTab === 'in_progress' && t.status !== 'IN_PROGRESS') return false;
            if (activeTab === 'verified' && t.status !== 'VERIFIED') return false;

            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                const matchName = t.roomName.toLowerCase().includes(kw);
                const matchProp = t.propertyName.toLowerCase().includes(kw);
                const matchAddr = t.address.toLowerCase().includes(kw);
                const matchLandlord = t.landlordName.toLowerCase().includes(kw);
                if (!matchName && !matchProp && !matchAddr && !matchLandlord) return false;
            }

            if (districtFilter !== 'ALL' && t.district !== districtFilter) return false;

            return true;
        });
    }, [tasks, activeTab, searchKeyword, districtFilter]);

    // Handle open verify modal
    const handleOpenVerifyModal = (task: InspectionTask) => {
        setSelectedTask(task);
        setVerifyElec(task.currentElecKwh || 120);
        setVerifyWater(task.currentWaterM3 || 15);
        setVerifyFindings(task.findings || 'Hiện trạng phòng sạch sẽ, thiết bị hoạt động tốt. Số công tơ điện và đồng hồ nước đã được đối chiếu chính xác.');
        setVerifyResult('VERIFIED');
        setInspectModalOpen(true);
    };

    // Submit verification
    const handleSaveVerification = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;

        const updatedTasks = tasks.map(t => {
            if (t.id === selectedTask.id) {
                return {
                    ...t,
                    status: verifyResult,
                    currentElecKwh: verifyElec,
                    currentWaterM3: verifyWater,
                    findings: verifyFindings,
                    inspectorNote: `Kiểm định bởi Inspector: ${user?.fullName || 'Inspector HexRoom'} vào ngày ${new Date().toLocaleDateString('vi-VN')}`
                };
            }
            return t;
        });

        setTasks(updatedTasks);
        localStorage.setItem('hexroom_inspector_tasks', JSON.stringify(updatedTasks));

        // If verified, also update the room in custom rooms so it is verified everywhere
        if (verifyResult === 'VERIFIED') {
            try {
                const customRooms = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
                const nextCustom = customRooms.map((r: any) => {
                    if (r.id === selectedTask.roomId) {
                        return { ...r, availabilityConfirmedAt: new Date().toISOString() };
                    }
                    return r;
                });
                localStorage.setItem('hexroom_custom_rooms', JSON.stringify(nextCustom));
            } catch {}
        }

        setInspectModalOpen(false);
        setSelectedTask(null);
        alert(verifyResult === 'VERIFIED'
            ? `✅ Đã hoàn tất kiểm định và cấp chứng nhận "ĐÃ ĐỐI CHIẾU 100%" cho phòng "${selectedTask.roomName}"!`
            : `Đã ghi nhận biên bản từ chối / cần sửa đổi cho phòng "${selectedTask.roomName}".`
        );
    };

    // Quick status update for task
    const handleUpdateStatus = (taskId: string, newStatus: InspectionTask['status']) => {
        const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        setTasks(updated);
        localStorage.setItem('hexroom_inspector_tasks', JSON.stringify(updated));
    };

    // KPIs
    const totalCount = tasks.length;
    const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
    const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const verifiedCount = tasks.filter(t => t.status === 'VERIFIED').length;

    return (
        <div className="hx-page" style={{ background: '#FFFFFF', minHeight: '100vh' }}>
            <Header />

            <main className="hx-container hx-section" style={{ paddingTop: 32, paddingBottom: 64 }}>
                {/* Title Header */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', fontSize: 11, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                        <ShieldCheck size={14} /> Cổng Nghiệp Vụ Kiểm Định Viên Tại Chỗ (HexRoom Inspector)
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                                Quy trình Kiểm định Thực tế 4 Bước
                            </h1>
                            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 740, lineHeight: 1.6, margin: 0 }}>
                                Tiếp nhận yêu cầu từ chủ nhà, khảo sát hiện trạng tại chỗ, chốt số công tơ điện nước và cấp chứng nhận minh bạch 100% cho người thuê.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <Link
                                to="/how-it-works"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 12, color: '#334155', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                            >
                                <Award size={15} style={{ color: '#059669' }} /> Xem chuẩn kiểm định 4 bước ↗
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── KPI METRICS CARDS ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>TỔNG NHIỆM VỤ</span>
                            <Building2 size={16} style={{ color: '#059669' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#0F172A' }}>{totalCount}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Yêu cầu từ chủ nhà</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #FDE68A', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400E', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>CHỜ TIẾP NHẬN</span>
                            <Clock size={16} style={{ color: '#D97706' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#D97706' }}>{pendingCount}</div>
                        <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>Cần điều phối viên xử lý</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #BFDBFE', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E40AF', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>ĐANG KHẢO SÁT</span>
                            <MapPin size={16} style={{ color: '#2563EB' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#1E40AF' }}>{inProgressCount}</div>
                        <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4 }}>Đang đi thực tế hôm nay</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#065F46', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>ĐÃ CẤP CHỨNG NHẬN 100%</span>
                            <CheckCircle2 size={16} style={{ color: '#059669' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#059669' }}>{verifiedCount}</div>
                        <div style={{ fontSize: 11, color: '#047857', marginTop: 4 }}>Tỷ lệ đạt chuẩn: 95%</div>
                    </div>
                </div>

                {/* ── WORKSPACE TABS & CONTROLS ── */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #E2E8F0', overflowX: 'auto', paddingBottom: 2 }}>
                        {[
                            { key: 'all', label: 'Tất cả nhiệm vụ', count: totalCount },
                            { key: 'pending', label: '⏳ Chờ tiếp nhận', count: pendingCount },
                            { key: 'in_progress', label: '🛵 Đang đi khảo sát', count: inProgressCount },
                            { key: 'verified', label: '✅ Đã cấp chứng nhận 100%', count: verifiedCount }
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
                                {t.label} <span style={{ padding: '2px 8px', borderRadius: 999, background: activeTab === t.key ? '#ECFDF5' : '#F1F5F9', fontSize: 11, fontWeight: 750, color: activeTab === t.key ? '#065F46' : '#64748B' }}>{t.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filter bar */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={e => setSearchKeyword(e.target.value)}
                                placeholder="Tìm theo tên phòng, chủ nhà, địa chỉ..."
                                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' }}
                            />
                        </div>

                        <select
                            value={districtFilter}
                            onChange={e => setDistrictFilter(e.target.value)}
                            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', outline: 'none' }}
                        >
                            <option value="ALL">Tất cả quận/huyện</option>
                            <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                            <option value="TP. Thủ Đức">TP. Thủ Đức</option>
                            <option value="Quận 10">Quận 10</option>
                        </select>
                    </div>

                    {/* Tasks Table */}
                    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 14 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <th style={{ padding: '14px 16px' }}>Căn phòng & Địa chỉ khảo sát</th>
                                    <th style={{ padding: '14px 16px' }}>Lịch hẹn tiếp đón</th>
                                    <th style={{ padding: '14px 16px' }}>Chủ trọ liên hệ</th>
                                    <th style={{ padding: '14px 16px' }}>Phạm vi kiểm tra</th>
                                    <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Nghiệp vụ Inspector</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', lineHeight: 1.35 }}>
                                                {task.roomName}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#059669', fontWeight: 650, marginTop: 2 }}>
                                                {task.propertyName}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <MapPin size={12} style={{ color: '#94A3B8' }} />
                                                <span>{task.address}, {task.district}</span>
                                            </div>
                                            {task.notes && (
                                                <div style={{ fontSize: 11, color: '#B45309', background: '#FFFBEB', padding: '4px 8px', borderRadius: 6, marginTop: 6, display: 'inline-block' }}>
                                                    Ghi chú: {task.notes}
                                                </div>
                                            )}
                                        </td>

                                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0F172A' }}>
                                                <Calendar size={14} style={{ color: '#059669' }} /> {task.requestedDate}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#065F46', fontWeight: 650, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Clock size={13} /> {task.timeSlot}
                                            </div>
                                        </td>

                                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 750, color: '#0F172A' }}>{task.landlordName}</div>
                                            <a
                                                href={`tel:${task.landlordPhone}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: 12, fontWeight: 700, marginTop: 4, textDecoration: 'none' }}
                                            >
                                                <Phone size={12} /> {task.landlordPhone}
                                            </a>
                                        </td>

                                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {task.scope.map((s, idx) => (
                                                    <span key={idx} style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 600 }}>
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                            {task.currentElecKwh && (
                                                <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginTop: 6 }}>
                                                    ⚡ Chốt điện: {task.currentElecKwh} kWh | 💧 Nước: {task.currentWaterM3} m³
                                                </div>
                                            )}
                                        </td>

                                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                            {task.status === 'VERIFIED' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 11, fontWeight: 750 }}>
                                                    <CheckCircle2 size={13} color="#059669" /> ĐÃ ĐỐI CHIẾU 100%
                                                </span>
                                            ) : task.status === 'IN_PROGRESS' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 11, fontWeight: 750 }}>
                                                    🛵 Đang khảo sát
                                                </span>
                                            ) : task.status === 'REJECTED' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontSize: 11, fontWeight: 750 }}>
                                                    ❌ Cần khắc phục
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 11, fontWeight: 750 }}>
                                                    ⏳ Chờ tiếp nhận
                                                </span>
                                            )}
                                        </td>

                                        <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                                                {task.status === 'PENDING' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                                                        style={{ padding: '6px 12px', borderRadius: 8, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Tiếp nhận ca
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenVerifyModal(task)}
                                                    style={{ padding: '6px 14px', borderRadius: 8, background: '#10B981', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
                                                >
                                                    <ShieldCheck size={14} /> Ghi biên bản & Cấp chứng nhận
                                                </button>

                                                <Link
                                                    to={`/room/${task.roomId}`}
                                                    style={{ padding: '6px 8px', borderRadius: 8, background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                    title="Xem bài đăng phòng"
                                                >
                                                    <ExternalLink size={13} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ── MODAL: BIÊN BẢN KIỂM ĐỊNH THỰC TẾ & CẤP CHỨNG NHẬN 100% ── */}
            {inspectModalOpen && selectedTask && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Biên bản Thẩm định Hiện trường & Cấp Chứng nhận 100%
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        Phòng: <strong>{selectedTask.roomName}</strong> · {selectedTask.propertyName}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', color: '#64748B' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveVerification} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* BƯỚC 1: CHECKLIST THẨM ĐỊNH HIỆN TRƯỜNG */}
                            <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid #E2E8F0' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 750, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={15} style={{ color: '#059669' }} /> 1. Đối chiếu hiện trạng & Độ an toàn thực tế
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                                    {[
                                        ['step1_condition', 'Không gian phòng sạch sẽ, tường không ẩm mốc'],
                                        ['step1_ac_tested', 'Máy lạnh Inverter & bình nóng lạnh hoạt động tốt'],
                                        ['step2_meter_verified', 'Công tơ điện & đồng hồ nước có tem kiểm định riêng'],
                                        ['step2_transparent_pricing', 'Biểu phí điện/nước khớp 100% giá thỏa thuận'],
                                        ['step3_photos_verified', '5 góc ảnh thật không chỉnh sửa bóp méo góc rộng'],
                                        ['step4_safety_clean', 'Lối thoát hiểm, an ninh thẻ từ & PCCC đạt chuẩn']
                                    ].map(([k, label]) => (
                                        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={checklistItems[k] ?? false}
                                                onChange={e => setChecklistItems({ ...checklistItems, [k]: e.target.checked })}
                                                style={{ width: 16, height: 16, accentColor: '#10B981' }}
                                            />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* BƯỚC 2: CHỐT SỐ CÔNG TƠ ĐIỆN NƯỚC BAN ĐẦU */}
                            <div style={{ background: '#ECFDF5', padding: 18, borderRadius: 16, border: '1px solid #A7F3D0' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 750, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Zap size={15} /> 2. Chốt chỉ số công tơ điện nước ban đầu
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: '#065F46', display: 'block', marginBottom: 6 }}>
                                            Chỉ số công tơ điện (kWh) (*)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={verifyElec}
                                            onChange={e => setVerifyElec(Number(e.target.value))}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #A7F3D0', fontSize: 15, fontWeight: 800, color: '#0F172A', outline: 'none' }}
                                        />
                                        <span style={{ fontSize: 11, color: '#065F46', marginTop: 4, display: 'block' }}>
                                            Đối chiếu trực tiếp mặt đồng hồ điện
                                        </span>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: '#065F46', display: 'block', marginBottom: 6 }}>
                                            Chỉ số đồng hồ nước (m³) (*)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={verifyWater}
                                            onChange={e => setVerifyWater(Number(e.target.value))}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #A7F3D0', fontSize: 15, fontWeight: 800, color: '#0F172A', outline: 'none' }}
                                        />
                                        <span style={{ fontSize: 11, color: '#065F46', marginTop: 4, display: 'block' }}>
                                            Chốt số để người thuê không bị tính bù
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* BƯỚC 3: KẾT QUẢ & GHI CHÚ INSPECTOR */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 750, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                    3. Kết quả thẩm định & Nhận xét của Inspector (*)
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={verifyFindings}
                                    onChange={e => setVerifyFindings(e.target.value)}
                                    placeholder="Nhập ghi chú chi tiết về tình trạng phòng, thiết bị hoặc các khuyến cáo..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none', lineHeight: 1.5 }}
                                />
                            </div>

                            {/* BƯỚC 4: KẾT LUẬN CẤP CHỨNG NHẬN */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'block' }}>
                                        Kết luận kiểm định:
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        Phòng đạt chuẩn sẽ lập tức được gắn huy hiệu ĐÃ ĐỐI CHIẾU 100% trên toàn website.
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setVerifyResult('VERIFIED')}
                                        style={{ padding: '8px 16px', borderRadius: 10, border: verifyResult === 'VERIFIED' ? '2px solid #10B981' : '1px solid #CBD5E1', background: verifyResult === 'VERIFIED' ? '#ECFDF5' : '#FFFFFF', color: verifyResult === 'VERIFIED' ? '#065F46' : '#64748B', fontWeight: 750, fontSize: 12, cursor: 'pointer' }}
                                    >
                                        ✅ ĐẠT CHUẨN 100%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVerifyResult('REJECTED')}
                                        style={{ padding: '8px 16px', borderRadius: 10, border: verifyResult === 'REJECTED' ? '2px solid #E11D48' : '1px solid #CBD5E1', background: verifyResult === 'REJECTED' ? '#FFF1F2' : '#FFFFFF', color: verifyResult === 'REJECTED' ? '#E11D48' : '#64748B', fontWeight: 750, fontSize: 12, cursor: 'pointer' }}
                                    >
                                        ❌ CẦN SỬA ĐỔI / TỪ CHỐI
                                    </button>
                                </div>
                            </div>

                            {/* Modal Submit Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setInspectModalOpen(false)}
                                    style={{ padding: '10px 18px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 650, fontSize: 13, cursor: 'pointer' }}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 24px', borderRadius: 10, background: verifyResult === 'VERIFIED' ? '#10B981' : '#E11D48', color: '#FFFFFF', border: 'none', fontWeight: 750, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                >
                                    <ShieldCheck size={16} /> {verifyResult === 'VERIFIED' ? 'Xác nhận & Cấp Chứng nhận 100%' : 'Lưu biên bản từ chối'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
