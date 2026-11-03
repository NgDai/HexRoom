import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../home/components';
import { useAuth } from '@/app/context/useAuth';
import {
    ShieldCheck, Calendar, Clock, MapPin, Phone, Eye, CheckCircle2,
    AlertCircle, Search, Filter, Camera, Zap, Droplets, Check, X,
    FileText, User, Building2, ExternalLink, ArrowRight, Sparkles, Award,
    Lock, CheckSquare, UploadCloud, ChevronRight, AlertTriangle, ShieldAlert
} from 'lucide-react';

export interface ChecklistCategory {
    id: string;
    title: string;
    desc: string;
    passed: boolean;
    photoUrl: string;
    notes: string;
    samplePhoto: string;
}

export interface InspectionTask {
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
    status: 'PENDING' | 'ACCEPTED' | 'CHECKED_IN' | 'VERIFIED' | 'REJECTED';
    
    // Step 2: Check-in
    checkinTime?: string;
    checkinPhoto?: string;
    checkinNotes?: string;

    // Step 3: Itemized Checklist & Meters
    categories?: ChecklistCategory[];
    currentElecKwh?: number;
    elecMeterPhoto?: string;
    currentWaterM3?: number;
    waterMeterPhoto?: string;
    findings?: string;
    inspectorNote?: string;

    // Step 4: Check-out
    checkoutTime?: string;
    checkoutPhoto?: string;

    // Locked status: "Một khi đã được kiểm tra thì không thể ghi biên bản nữa"
    isCompleted?: boolean;
    completedAt?: string;
}

const DEFAULT_CATEGORIES: ChecklistCategory[] = [
    {
        id: 'cat_space',
        title: '1. Hiện trạng phòng & Không gian (Tường, sàn, trần)',
        desc: 'Không gian sạch sẽ, cao ráo, tường và trần không ẩm mốc hay bong tróc, sàn phẳng phiu.',
        passed: true,
        photoUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        notes: 'Phòng sạch sẽ, sơn tường mới 100%, sàn gạch sáng bóng.',
        samplePhoto: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
    },
    {
        id: 'cat_ac',
        title: '2. Máy lạnh Inverter & Thiết bị điện máy',
        desc: 'Máy lạnh làm lạnh sâu và êm, tủ lạnh sạch sẽ, bình nóng lạnh hoạt động an toàn.',
        passed: true,
        photoUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
        notes: 'Điều hòa Daikin Inverter 1.5 HP hoạt động êm, mát nhanh, có remote đầy đủ.',
        samplePhoto: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800'
    },
    {
        id: 'cat_wc',
        title: '3. Nhà vệ sinh & Thiết bị cấp thoát nước',
        desc: 'Bồn cầu, lavabo, vòi sen gạch men sạch sẽ, hệ thống thoát nước thông suốt, áp lực nước mạnh.',
        passed: true,
        photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
        notes: 'Thiết bị vệ sinh Toto mới tinh, bình nóng lạnh Ariston chống giật an toàn.',
        samplePhoto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800'
    },
    {
        id: 'cat_meters',
        title: '4. Công tơ điện riêng & Đồng hồ nước',
        desc: 'Mỗi phòng có đồng hồ điện nước riêng biệt, có tem niêm phong kiểm định của cơ quan chức năng.',
        passed: true,
        photoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        notes: 'Công tơ điện riêng trước cửa phòng, số điện và số nước rõ ràng.',
        samplePhoto: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800'
    },
    {
        id: 'cat_security',
        title: '5. Hệ thống An ninh, Cửa khóa vân tay & PCCC',
        desc: 'Cổng khóa vân tay / thẻ từ an toàn, camera hành lang 24/7, có bình chữa cháy và lối thoát hiểm.',
        passed: true,
        photoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
        notes: 'Cửa ra vào khóa từ thông minh, hành lang có camera và tiêu lệnh PCCC chuẩn.',
        samplePhoto: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800'
    },
    {
        id: 'cat_pricing',
        title: '6. Quyền cho thuê & Minh bạch biểu phí 100%',
        desc: 'Chủ nhà có quyền cho thuê hợp pháp, giá phòng và các khoản phụ phí khớp 100% niêm yết.',
        passed: true,
        photoUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        notes: 'Hợp đồng mẫu rõ ràng, cam kết không phát sinh bất kỳ chi phí ẩn nào.',
        samplePhoto: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
    }
];

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
        isCompleted: true,
        completedAt: '2026-10-16T10:45:00.000Z',
        checkinTime: '08:45 16/10/2026',
        checkinPhoto: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800',
        checkinNotes: 'Đã gặp cô Hoa tại cổng, tiếp nhận chìa khóa phòng 302.',
        currentElecKwh: 142,
        elecMeterPhoto: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        currentWaterM3: 18,
        waterMeterPhoto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
        categories: DEFAULT_CATEGORIES,
        findings: 'Phòng thực tế 100% khớp ảnh chụp. Công tơ điện hoạt động chuẩn xác, có tem kiểm định. Điều hòa Daikin Inverter mát sâu, nhà vệ sinh sạch sẽ thiết bị mới.',
        inspectorNote: 'Đã cấp chứng nhận ĐÃ ĐỐI CHIẾU 100% cho căn phòng này.',
        checkoutTime: '10:30 16/10/2026',
        checkoutPhoto: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800'
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
        status: 'CHECKED_IN',
        isCompleted: false,
        checkinTime: '13:40 Hôm nay',
        checkinPhoto: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800',
        checkinNotes: 'Có mặt tại số 48 D5, chủ trọ dẫn lên tầng 2.',
        currentElecKwh: 89,
        elecMeterPhoto: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        currentWaterM3: 12,
        waterMeterPhoto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
        categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
        findings: 'Đã khảo sát phần gác lửng đúc cao 1m8, gạch men mới lát, cần chốt lại chỉ số nước.'
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
        isCompleted: false,
        categories: DEFAULT_CATEGORIES.map(c => ({ ...c }))
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
        isCompleted: false,
        categories: DEFAULT_CATEGORIES.map(c => ({ ...c }))
    }
];

export function InspectorPortalPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<InspectionTask[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'checked_in' | 'verified'>('all');
    const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [districtFilter, setDistrictFilter] = useState('ALL');

    // Modals
    const [checkinModalOpen, setCheckinModalOpen] = useState(false);
    const [inspectModalOpen, setInspectModalOpen] = useState(false);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

    // Step 2: Checkin Form
    const [checkinPhotoInput, setCheckinPhotoInput] = useState('');
    const [checkinNotesInput, setCheckinNotesInput] = useState('');

    // Step 3: Inspection Report Form
    const [verifyCategories, setVerifyCategories] = useState<ChecklistCategory[]>([]);
    const [verifyElec, setVerifyElec] = useState<number>(100);
    const [verifyElecPhoto, setVerifyElecPhoto] = useState('');
    const [verifyWater, setVerifyWater] = useState<number>(15);
    const [verifyWaterPhoto, setVerifyWaterPhoto] = useState('');
    const [verifyFindings, setVerifyFindings] = useState('');
    const [verifyResult, setVerifyResult] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');

    // Step 4: Checkout Form
    const [checkoutPhotoInput, setCheckoutPhotoInput] = useState('');

    // Hidden file input refs
    const fileInputCheckin = useRef<HTMLInputElement>(null);
    const fileInputCheckout = useRef<HTMLInputElement>(null);

    // Load tasks from storage or defaults
    useEffect(() => {
        try {
            const stored = localStorage.getItem('hexroom_inspector_tasks');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTasks(parsed);
                } else {
                    setTasks(DEFAULT_INSPECTION_TASKS);
                    localStorage.setItem('hexroom_inspector_tasks', JSON.stringify(DEFAULT_INSPECTION_TASKS));
                }
            } else {
                setTasks(DEFAULT_INSPECTION_TASKS);
                localStorage.setItem('hexroom_inspector_tasks', JSON.stringify(DEFAULT_INSPECTION_TASKS));
            }

            // Sync with landlord requests
            const landlordReqs = JSON.parse(localStorage.getItem('hexroom_inspection_requests') || '[]');
            if (landlordReqs.length > 0) {
                setTasks(prev => {
                    const existingIds = new Set(prev.map(t => t.roomId));
                    const newTasks: InspectionTask[] = landlordReqs
                        .filter((r: any) => !existingIds.has(r.roomId))
                        .map((r: any, idx: number) => ({
                            id: `INSP-REQ-${Date.now() + idx}`,
                            roomId: r.roomId,
                            roomName: r.roomName || 'Phòng trọ mới gửi yêu cầu',
                            propertyName: 'Khu trọ yêu cầu kiểm định',
                            address: 'TP. Hồ Chí Minh',
                            district: 'Quận Bình Thạnh',
                            landlordName: 'Chủ trọ',
                            landlordPhone: r.contactPhone || '0908 123 456',
                            requestedDate: r.preferredDate || new Date().toISOString().split('T')[0],
                            timeSlot: r.preferredTimeSlot || 'Sáng (8:30 - 11:30)',
                            scope: ['Hiện trạng & nội thất phòng', 'Xác thực hình ảnh & công tơ'],
                            notes: r.notes || '',
                            status: 'PENDING',
                            isCompleted: false,
                            categories: DEFAULT_CATEGORIES.map(c => ({ ...c }))
                        }));
                    return [...newTasks, ...prev];
                });
            }
        } catch {
            setTasks(DEFAULT_INSPECTION_TASKS);
        }
    }, []);

    const saveTasksToStorage = (updated: InspectionTask[]) => {
        setTasks(updated);
        try {
            localStorage.setItem('hexroom_inspector_tasks', JSON.stringify(updated));
        } catch {}
    };

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (activeTab === 'pending' && t.status !== 'PENDING') return false;
            if (activeTab === 'accepted' && t.status !== 'ACCEPTED') return false;
            if (activeTab === 'checked_in' && t.status !== 'CHECKED_IN') return false;
            if (activeTab === 'verified' && (t.status !== 'VERIFIED' && t.status !== 'REJECTED')) return false;

            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                const matchName = (t.roomName || '').toLowerCase().includes(kw);
                const matchProp = (t.propertyName || '').toLowerCase().includes(kw);
                const matchAddr = (t.address || '').toLowerCase().includes(kw);
                const matchLandlord = (t.landlordName || '').toLowerCase().includes(kw);
                if (!matchName && !matchProp && !matchAddr && !matchLandlord) return false;
            }

            if (districtFilter !== 'ALL' && t.district !== districtFilter) return false;

            return true;
        });
    }, [tasks, activeTab, searchKeyword, districtFilter]);

    // ── BƯỚC 1: TIẾP NHẬN CA ──
    const handleAcceptTask = (task: InspectionTask) => {
        const updated = tasks.map(t => {
            if (t.id === task.id) {
                return {
                    ...t,
                    status: 'ACCEPTED' as const
                };
            }
            return t;
        });
        saveTasksToStorage(updated);
        alert(`✅ Đã tiếp nhận ca khảo sát phòng: "${task.roomName}". Khi tới địa chỉ, hãy nhấn "Check-in" để bắt đầu quy trình!`);
    };

    // ── BƯỚC 2: MỞ MODAL CHECK-IN ──
    const handleOpenCheckin = (task: InspectionTask) => {
        setSelectedTask(task);
        setCheckinPhotoInput(task.checkinPhoto || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800');
        setCheckinNotesInput(task.checkinNotes || 'Đã có mặt tại địa chỉ khảo sát đúng giờ hẹn.');
        setCheckinModalOpen(true);
    };

    const handleConfirmCheckin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        if (!checkinPhotoInput.trim()) {
            alert('Vui lòng chụp hoặc tải ảnh Check-in tại cổng/cửa phòng trước khi tiếp tục!');
            return;
        }

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
        const updated = tasks.map(t => {
            if (t.id === selectedTask.id) {
                return {
                    ...t,
                    status: 'CHECKED_IN' as const,
                    checkinTime: t.checkinTime || nowStr,
                    checkinPhoto: checkinPhotoInput.trim(),
                    checkinNotes: checkinNotesInput.trim()
                };
            }
            return t;
        });
        saveTasksToStorage(updated);
        setCheckinModalOpen(false);
        setSelectedTask(null);
        alert(`📍 Check-in thành công lúc ${nowStr}! Bạn có thể bắt đầu ghi biên bản và kiểm tra từng hạng mục.`);
    };

    // ── BƯỚC 3: MỞ MODAL GHI BIÊN BẢN (HOẶC XEM BIÊN BẢN ĐÃ KHÓA) ──
    const handleOpenInspectModal = (task: InspectionTask) => {
        setSelectedTask(task);
        const cats = (task.categories && task.categories.length > 0)
            ? task.categories
            : DEFAULT_CATEGORIES.map(c => ({ ...c }));
        setVerifyCategories(cats);
        setVerifyElec(task.currentElecKwh ?? 120);
        setVerifyElecPhoto(task.elecMeterPhoto || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800');
        setVerifyWater(task.currentWaterM3 ?? 16);
        setVerifyWaterPhoto(task.waterMeterPhoto || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800');
        setVerifyFindings(task.findings || 'Hiện trạng phòng sạch sẽ, thiết bị điện máy hoạt động tốt, số công tơ điện và đồng hồ nước đã đối chiếu chuẩn xác.');
        setVerifyResult(task.status === 'REJECTED' ? 'REJECTED' : 'VERIFIED');
        setInspectModalOpen(true);
    };

    // Toggle category checkbox
    const handleToggleCategoryPassed = (catId: string, passed: boolean) => {
        if (selectedTask?.isCompleted) return; // Locked!
        setVerifyCategories(prev => prev.map(c => c.id === catId ? { ...c, passed } : c));
    };

    // Update category photo
    const handleUpdateCategoryPhoto = (catId: string, photoUrl: string) => {
        if (selectedTask?.isCompleted) return; // Locked!
        setVerifyCategories(prev => prev.map(c => c.id === catId ? { ...c, photoUrl } : c));
    };

    // Update category note
    const handleUpdateCategoryNotes = (catId: string, notes: string) => {
        if (selectedTask?.isCompleted) return; // Locked!
        setVerifyCategories(prev => prev.map(c => c.id === catId ? { ...c, notes } : c));
    };

    // From Report -> Proceed to Checkout (Step 4)
    const handleProceedToCheckout = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        if (selectedTask.isCompleted) {
            setInspectModalOpen(false);
            return;
        }

        // Close inspection modal, open checkout modal
        setInspectModalOpen(false);
        setCheckoutPhotoInput(selectedTask.checkoutPhoto || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800');
        setCheckoutModalOpen(true);
    };

    // ── BƯỚC 4: CHECKOUT & KHÓA BIÊN BẢN VĨNH VIỄN ──
    const handleConfirmCheckoutAndLock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        if (!checkoutPhotoInput.trim()) {
            alert('Vui lòng chụp hoặc tải ảnh Check-out (bàn giao / kết thúc ca) trước khi khóa biên bản!');
            return;
        }

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
        const updated = tasks.map(t => {
            if (t.id === selectedTask.id) {
                return {
                    ...t,
                    status: verifyResult,
                    isCompleted: true, // "Một khi đã được kiểm tra thì không thể ghi biên bản nữa"
                    completedAt: new Date().toISOString(),
                    categories: verifyCategories,
                    currentElecKwh: verifyElec,
                    elecMeterPhoto: verifyElecPhoto,
                    currentWaterM3: verifyWater,
                    waterMeterPhoto: verifyWaterPhoto,
                    findings: verifyFindings,
                    inspectorNote: `Kiểm định bởi Inspector: ${user?.fullName || 'Lê Trọng Đạt'} vào ngày ${new Date().toLocaleDateString('vi-VN')}`,
                    checkoutTime: nowStr,
                    checkoutPhoto: checkoutPhotoInput.trim()
                };
            }
            return t;
        });

        saveTasksToStorage(updated);

        // Update custom rooms if verified
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

        setCheckoutModalOpen(false);
        setSelectedTask(null);
        alert(`🔒 ĐÃ HOÀN TẤT & KHÓA BIÊN BẢN!\n\nCa khảo sát phòng "${selectedTask.roomName}" đã hoàn thành lúc ${nowStr}.\nBiên bản đã được niêm phong lưu trữ và không thể ghi lại.`);
    };

    // KPI counts
    const totalCount = tasks.length;
    const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
    const acceptedCount = tasks.filter(t => t.status === 'ACCEPTED').length;
    const checkedInCount = tasks.filter(t => t.status === 'CHECKED_IN').length;
    const completedCount = tasks.filter(t => t.isCompleted || t.status === 'VERIFIED').length;

    return (
        <div className="hx-page" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
            <Header />

            <main className="hx-container hx-section" style={{ paddingTop: 32, paddingBottom: 64 }}>
                {/* Title Header */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', fontSize: 11, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                        <ShieldCheck size={14} /> Cổng Nghiệp Vụ Kiểm Định Viên Tại Chỗ (HexRoom Inspector)
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: 30, fontWeight: 850, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                                Quy Trình Kiểm Định Tại Chỗ 4 Bước Chuẩn
                            </h1>
                            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 760, lineHeight: 1.6, margin: 0 }}>
                                <strong>1. Tiếp nhận</strong> ➔ <strong>2. Check-in (Ảnh hiện trường)</strong> ➔ <strong>3. Ghi biên bản checkbox & chụp ảnh từng hạng mục</strong> ➔ <strong>4. Check-out & Khóa niêm phong biên bản</strong>.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <Link
                                to="/how-it-works"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 12, color: '#334155', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                            >
                                <Award size={15} style={{ color: '#059669' }} /> Xem tiêu chuẩn 100% minh bạch ↗
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── KPI METRICS CARDS ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 28 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>TỔNG NHIỆM VỤ</span>
                            <Building2 size={16} style={{ color: '#059669' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#0F172A' }}>{totalCount}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Yêu cầu từ các chủ nhà</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #FDE68A', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400E', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>1. CHỜ TIẾP NHẬN</span>
                            <Clock size={16} style={{ color: '#D97706' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#D97706' }}>{pendingCount}</div>
                        <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>Cần bấm tiếp nhận ca</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #BFDBFE', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E40AF', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>2. ĐÃ TIẾP NHẬN / CHỜ CHECK-IN</span>
                            <MapPin size={16} style={{ color: '#2563EB' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#1E40AF' }}>{acceptedCount}</div>
                        <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4 }}>Chờ chụp ảnh check-in</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #DDD6FE', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6B21A8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>3. ĐANG KHẢO SÁT HIỆN TRƯỜNG</span>
                            <Camera size={16} style={{ color: '#8B5CF6' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#6B21A8' }}>{checkedInCount}</div>
                        <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 4 }}>Đã check-in, đang ghi biên bản</div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#065F46', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                            <span>4. ĐÃ KIỂM ĐỊNH & KHÓA</span>
                            <Lock size={16} style={{ color: '#059669' }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 850, color: '#059669' }}>{completedCount}</div>
                        <div style={{ fontSize: 11, color: '#047857', marginTop: 4 }}>Biên bản niêm phong vĩnh viễn</div>
                    </div>
                </div>

                {/* ── WORKSPACE TABS & CONTROLS ── */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #E2E8F0', overflowX: 'auto', paddingBottom: 2 }}>
                        {[
                            { key: 'all', label: 'Tất cả nhiệm vụ', count: totalCount },
                            { key: 'pending', label: '⏳ 1. Chờ tiếp nhận', count: pendingCount },
                            { key: 'accepted', label: '📋 2. Chờ check-in', count: acceptedCount },
                            { key: 'checked_in', label: '🛵 3. Đang ghi biên bản', count: checkedInCount },
                            { key: 'verified', label: '🔒 4. Đã kiểm tra (Đã khóa)', count: completedCount }
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
                                placeholder="Tìm theo tên phòng, tòa nhà, chủ trọ, địa chỉ..."
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
                                    <th style={{ padding: '14px 16px' }}>Lịch hẹn & Chủ trọ</th>
                                    <th style={{ padding: '14px 16px' }}>Tiến độ 4 bước</th>
                                    <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Thao tác Nghiệp vụ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((task) => {
                                    const isLocked = Boolean(task.isCompleted || task.status === 'VERIFIED' || task.status === 'REJECTED');

                                    return (
                                        <tr
                                            key={task.id}
                                            style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: 280 }}>
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
                                                <div style={{ fontSize: 12, fontWeight: 750, color: '#334155', marginTop: 6 }}>
                                                    Chủ trọ: {task.landlordName}
                                                </div>
                                                <a
                                                    href={`tel:${task.landlordPhone}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: 12, fontWeight: 700, marginTop: 2, textDecoration: 'none' }}
                                                >
                                                    <Phone size={12} /> {task.landlordPhone}
                                                </a>
                                            </td>

                                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: task.status !== 'PENDING' ? '#059669' : '#94A3B8' }}>
                                                        <CheckCircle2 size={13} style={{ color: task.status !== 'PENDING' ? '#059669' : '#CBD5E1' }} />
                                                        <span>1. Tiếp nhận ca</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: task.checkinPhoto ? '#059669' : '#94A3B8' }}>
                                                        <CheckCircle2 size={13} style={{ color: task.checkinPhoto ? '#059669' : '#CBD5E1' }} />
                                                        <span>2. Check-in {task.checkinTime ? `(${task.checkinTime})` : ''}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: task.isCompleted ? '#059669' : '#94A3B8' }}>
                                                        <CheckCircle2 size={13} style={{ color: task.isCompleted ? '#059669' : '#CBD5E1' }} />
                                                        <span>3. Ghi biên bản hạng mục</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: task.checkoutPhoto ? '#059669' : '#94A3B8' }}>
                                                        <CheckCircle2 size={13} style={{ color: task.checkoutPhoto ? '#059669' : '#CBD5E1' }} />
                                                        <span>4. Check-out & Khóa {task.checkoutTime ? `(${task.checkoutTime})` : ''}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                                {isLocked ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: task.status === 'VERIFIED' ? '#ECFDF5' : '#FFF1F2', border: `1px solid ${task.status === 'VERIFIED' ? '#A7F3D0' : '#FECDD3'}`, color: task.status === 'VERIFIED' ? '#065F46' : '#E11D48', fontSize: 11, fontWeight: 800 }}>
                                                            <Lock size={12} /> {task.status === 'VERIFIED' ? 'ĐÃ ĐỐI CHIẾU 100%' : 'TỪ CHỐI / CẦN SỬA'}
                                                        </span>
                                                        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 650 }}>
                                                            🔒 Đã khóa niêm phong
                                                        </span>
                                                    </div>
                                                ) : task.status === 'CHECKED_IN' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#6B21A8', fontSize: 11, fontWeight: 750 }}>
                                                        <Camera size={13} color="#8B5CF6" /> Đang khảo sát
                                                    </span>
                                                ) : task.status === 'ACCEPTED' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 11, fontWeight: 750 }}>
                                                        <Clock size={13} color="#2563EB" /> Chờ check-in
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 11, fontWeight: 750 }}>
                                                        ⏳ Chờ tiếp nhận
                                                    </span>
                                                )}
                                            </td>

                                            <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                                                    {/* Bước 1: Tiếp nhận */}
                                                    {task.status === 'PENDING' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAcceptTask(task)}
                                                            style={{ padding: '7px 14px', borderRadius: 8, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
                                                        >
                                                            📥 Tiếp nhận ca
                                                        </button>
                                                    )}

                                                    {/* Bước 2: Check-in */}
                                                    {task.status === 'ACCEPTED' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenCheckin(task)}
                                                            style={{ padding: '7px 14px', borderRadius: 8, background: '#8B5CF6', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(139,92,246,0.25)' }}
                                                        >
                                                            <MapPin size={13} /> Check-in tại phòng
                                                        </button>
                                                    )}

                                                    {/* Bước 3: Ghi biên bản */}
                                                    {task.status === 'CHECKED_IN' && !isLocked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenInspectModal(task)}
                                                            style={{ padding: '7px 14px', borderRadius: 8, background: '#10B981', color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
                                                        >
                                                            <FileText size={13} /> Ghi biên bản
                                                        </button>
                                                    )}

                                                    {/* Khi đã kiểm tra: KHÔNG ĐƯỢC GHI BIÊN BẢN NỮA, CHỈ XEM BẢN ĐÃ KHÓA */}
                                                    {isLocked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenInspectModal(task)}
                                                            style={{ padding: '7px 14px', borderRadius: 8, background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontSize: 12, fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                            title="Biên bản đã được khóa niêm phong"
                                                        >
                                                            <Lock size={13} style={{ color: '#059669' }} /> Xem biên bản (Đã khóa)
                                                        </button>
                                                    )}

                                                    <Link
                                                        to={`/room/${task.roomId}`}
                                                        style={{ padding: '7px 10px', borderRadius: 8, background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                        title="Xem bài đăng phòng"
                                                    >
                                                        <ExternalLink size={13} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* MODAL BƯỚC 2: CHECK-IN TẠI HIỆN TRƯỜNG & UPLOAD ẢNH CHECK-IN       */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {checkinModalOpen && selectedTask && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 12, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Bước 2: Check-in Hiện Trường Khảo Sát
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {selectedTask.roomName} · {selectedTask.address}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckinModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', color: '#64748B' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmCheckin} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div style={{ background: '#EFF6FF', padding: '12px 16px', borderRadius: 12, border: '1px solid #BFDBFE', fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
                                📍 <strong>Yêu cầu nghiệp vụ:</strong> Inspector cần chụp ảnh mặt tiền khu trọ hoặc cửa phòng khi tới nơi để xác thực vị trí và thời gian có mặt thực tế.
                            </div>

                            {/* Ảnh Check-in */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 750, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                                    Ảnh chụp Check-in tại hiện trường (*)
                                </label>
                                
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nhập URL ảnh chụp check-in hoặc chọn bên dưới..."
                                        value={checkinPhotoInput}
                                        onChange={e => setCheckinPhotoInput(e.target.value)}
                                        style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputCheckin.current?.click()}
                                        style={{ padding: '9px 14px', borderRadius: 10, background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <Camera size={14} /> Chụp / Tải ảnh
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputCheckin}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const url = URL.createObjectURL(file);
                                                setCheckinPhotoInput(url);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Preview */}
                                {checkinPhotoInput && (
                                    <div style={{ position: 'relative', width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                                        <img src={checkinPhotoInput} alt="Check-in preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={12} /> Thời gian hiện diện: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Ghi chú khi checkin */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 750, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                                    Ghi chú lúc check-in
                                </label>
                                <input
                                    type="text"
                                    value={checkinNotesInput}
                                    onChange={e => setCheckinNotesInput(e.target.value)}
                                    placeholder="Ví dụ: Đã gặp chủ nhà lúc 9h, tiếp nhận chìa khóa..."
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => setCheckinModalOpen(false)}
                                    style={{ padding: '9px 16px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#64748B', fontWeight: 650, fontSize: 13, cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '9px 20px', borderRadius: 10, background: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: 750, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}
                                >
                                    <CheckCircle2 size={15} /> Xác nhận Check-in & Khảo sát
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* MODAL BƯỚC 3: GHI BIÊN BẢN TỪNG HẠNG MỤC (HOẶC XEM BẢN ĐÃ KHÓA)     */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {inspectModalOpen && selectedTask && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ width: '100%', maxWidth: 860, maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: selectedTask.isCompleted ? '#F1F5F9' : '#ECFDF5', color: selectedTask.isCompleted ? '#475569' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {selectedTask.isCompleted ? <Lock size={22} /> : <ShieldCheck size={22} />}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        {selectedTask.isCompleted ? 'Biên bản Kiểm định Đã Niêm Phong (Chỉ Đọc)' : 'Bước 3: Ghi Biên Bản Thẩm Định Từng Hạng Mục & Chụp Ảnh'}
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

                        {/* Banner nếu đã hoàn thành (KHÔNG CHO PHÉP GHI BIÊN BẢN NỮA) */}
                        {selectedTask.isCompleted && (
                            <div style={{ background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Lock size={20} style={{ color: '#059669', flexShrink: 0 }} />
                                <div>
                                    <strong style={{ fontSize: 13, color: '#065F46', display: 'block' }}>
                                        🔒 BIÊN BẢN ĐÃ ĐƯỢC KIỂM ĐỊNH & KHÓA CHỨNG NHẬN VĨNH VIỄN
                                    </strong>
                                    <span style={{ fontSize: 12, color: '#047857' }}>
                                        Theo quy định, một khi phòng đã được kiểm định xong thì không thể ghi lại hay chỉnh sửa biên bản. Bạn chỉ có quyền xem lại toàn bộ hồ sơ minh chứng.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Modal Body */}
                        <form onSubmit={handleProceedToCheckout} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Hiển thị tóm tắt Check-in */}
                            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {selectedTask.checkinPhoto && (
                                        <img src={selectedTask.checkinPhoto} alt="Checkin" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid #CBD5E1' }} />
                                    )}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 750, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <CheckCircle2 size={14} /> ĐÃ CHECK-IN HIỆN TRƯỜNG LÚC: {selectedTask.checkinTime || 'Đúng giờ'}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                                            {selectedTask.checkinNotes || 'Inspector đã xác thực mặt tiền và phòng.'}
                                        </div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 11, background: '#ECFDF5', color: '#065F46', fontWeight: 700, padding: '4px 10px', borderRadius: 999, border: '1px solid #A7F3D0' }}>
                                    ✓ Đã đối chiếu vị trí GPS
                                </span>
                            </div>

                            {/* ── BƯỚC 3.1: DUYỆT TỪNG HẠNG MỤC CÓ CHECKBOX VÀ ẢNH MINH CHỨNG ── */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <div>
                                        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                                            Danh Sách Checkbox Hạng Mục & Ảnh Chụp Minh Chứng
                                        </h4>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>
                                            Mỗi hạng mục cần tích chọn kết quả đạt/không đạt và đính kèm ảnh thực tế tại phòng.
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 750, color: '#059669', background: '#ECFDF5', padding: '4px 10px', borderRadius: 8 }}>
                                        Đạt: {verifyCategories.filter(c => c.passed).length}/{verifyCategories.length} hạng mục
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {verifyCategories.map((cat, idx) => (
                                        <div
                                            key={cat.id}
                                            style={{
                                                background: cat.passed ? '#FFFFFF' : '#FFF1F2',
                                                border: cat.passed ? '1px solid #E2E8F0' : '1px solid #FECDD3',
                                                borderRadius: 16,
                                                padding: 18,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: selectedTask.isCompleted ? 'default' : 'pointer', flex: 1, minWidth: 260 }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={selectedTask.isCompleted}
                                                        checked={cat.passed}
                                                        onChange={e => handleToggleCategoryPassed(cat.id, e.target.checked)}
                                                        style={{ width: 18, height: 18, marginTop: 2, accentColor: '#10B981', cursor: selectedTask.isCompleted ? 'default' : 'pointer' }}
                                                    />
                                                    <div>
                                                        <strong style={{ fontSize: 14, color: cat.passed ? '#0F172A' : '#BE123C', display: 'block' }}>
                                                            {cat.title}
                                                        </strong>
                                                        <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4, display: 'block', marginTop: 2 }}>
                                                            {cat.desc}
                                                        </span>
                                                    </div>
                                                </label>

                                                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: cat.passed ? '#ECFDF5' : '#FFE4E6', color: cat.passed ? '#065F46' : '#E11D48', border: `1px solid ${cat.passed ? '#A7F3D0' : '#FECDD3'}` }}>
                                                    {cat.passed ? '✓ ĐẠT CHUẨN' : '✕ CẦN KHẮC PHỤC'}
                                                </span>
                                            </div>

                                            {/* Ảnh minh chứng cho hạng mục này */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 14, alignItems: 'center' }}>
                                                {/* Image preview & upload */}
                                                <div style={{ position: 'relative', height: 140, borderRadius: 10, overflow: 'hidden', border: '1px solid #CBD5E1', background: '#F1F5F9' }}>
                                                    {cat.photoUrl ? (
                                                        <img src={cat.photoUrl} alt={cat.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
                                                            <Camera size={24} style={{ marginBottom: 4 }} />
                                                            <span>Chưa có ảnh chụp</span>
                                                        </div>
                                                    )}
                                                    
                                                    {!selectedTask.isCompleted && (
                                                        <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4 }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateCategoryPhoto(cat.id, cat.samplePhoto)}
                                                                style={{ padding: '4px 8px', background: 'rgba(15,23,42,0.8)', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                                                                title="Dùng ảnh mẫu chuẩn"
                                                            >
                                                                Ảnh chuẩn
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Input URL & Ghi chú */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {!selectedTask.isCompleted && (
                                                        <div>
                                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                                                📷 URL ảnh chụp thực tế tại chỗ:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={cat.photoUrl}
                                                                disabled={selectedTask.isCompleted}
                                                                onChange={e => handleUpdateCategoryPhoto(cat.id, e.target.value)}
                                                                placeholder="Nhập URL ảnh chụp thực tế..."
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, outline: 'none' }}
                                                            />
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                                            📝 Ghi chú thẩm định hạng mục này:
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cat.notes}
                                                            disabled={selectedTask.isCompleted}
                                                            onChange={e => handleUpdateCategoryNotes(cat.id, e.target.value)}
                                                            placeholder="Nhập nhận xét cụ thể..."
                                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, outline: 'none' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── BƯỚC 3.2: CHỐT CHỈ SỐ CÔNG TƠ ĐIỆN VÀ NƯỚC ── */}
                            <div style={{ background: '#ECFDF5', padding: 18, borderRadius: 16, border: '1px solid #A7F3D0' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Zap size={16} /> 4. Chốt chỉ số công tơ điện nước ban đầu kèm ảnh chụp đồng hồ
                                </h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                                    {/* Điện */}
                                    <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #A7F3D0' }}>
                                        <label style={{ fontSize: 12, fontWeight: 750, color: '#065F46', display: 'block', marginBottom: 6 }}>
                                            Chỉ số công tơ điện (kWh) (*)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            disabled={selectedTask.isCompleted}
                                            value={verifyElec}
                                            onChange={e => setVerifyElec(Number(e.target.value))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 15, fontWeight: 800, color: '#0F172A', outline: 'none', marginBottom: 8 }}
                                        />
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
                                            Ảnh chụp mặt công tơ điện riêng:
                                        </div>
                                        <input
                                            type="text"
                                            disabled={selectedTask.isCompleted}
                                            value={verifyElecPhoto}
                                            onChange={e => setVerifyElecPhoto(e.target.value)}
                                            placeholder="URL ảnh chụp công tơ..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 11, outline: 'none', marginBottom: 6 }}
                                        />
                                        {verifyElecPhoto && (
                                            <img src={verifyElecPhoto} alt="Công tơ điện" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                                        )}
                                    </div>

                                    {/* Nước */}
                                    <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #A7F3D0' }}>
                                        <label style={{ fontSize: 12, fontWeight: 750, color: '#065F46', display: 'block', marginBottom: 6 }}>
                                            Chỉ số đồng hồ nước (m³) (*)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            disabled={selectedTask.isCompleted}
                                            value={verifyWater}
                                            onChange={e => setVerifyWater(Number(e.target.value))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 15, fontWeight: 800, color: '#0F172A', outline: 'none', marginBottom: 8 }}
                                        />
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
                                            Ảnh chụp mặt đồng hồ nước riêng:
                                        </div>
                                        <input
                                            type="text"
                                            disabled={selectedTask.isCompleted}
                                            value={verifyWaterPhoto}
                                            onChange={e => setVerifyWaterPhoto(e.target.value)}
                                            placeholder="URL ảnh chụp đồng hồ nước..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 11, outline: 'none', marginBottom: 6 }}
                                        />
                                        {verifyWaterPhoto && (
                                            <img src={verifyWaterPhoto} alt="Đồng hồ nước" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── BƯỚC 3.3: NHẬN XÉT TỔNG KẾT & KẾT LUẬN CỦA INSPECTOR ── */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 750, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                    Nhận xét tổng kết biên bản kiểm định (*)
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    disabled={selectedTask.isCompleted}
                                    value={verifyFindings}
                                    onChange={e => setVerifyFindings(e.target.value)}
                                    placeholder="Nhập ghi chú chi tiết về tình trạng căn phòng..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none', lineHeight: 1.5 }}
                                />
                            </div>

                            {/* Kết luận cấp chứng nhận */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'block' }}>
                                        Kết luận kiểm định:
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {verifyResult === 'VERIFIED' ? 'Cấp huy hiệu ĐÃ ĐỐI CHIẾU 100% trên toàn hệ thống.' : 'Yêu cầu chủ trọ khắc phục trước khi cho thuê.'}
                                    </span>
                                </div>

                                {!selectedTask.isCompleted ? (
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
                                ) : (
                                    <span style={{ padding: '6px 14px', borderRadius: 8, background: selectedTask.status === 'VERIFIED' ? '#ECFDF5' : '#FFE4E6', color: selectedTask.status === 'VERIFIED' ? '#065F46' : '#BE123C', fontWeight: 800, fontSize: 13, border: '1px solid #CBD5E1' }}>
                                        {selectedTask.status === 'VERIFIED' ? '✅ ĐÃ CẤP CHỨNG NHẬN 100%' : '❌ ĐÃ TỪ CHỐI KHẢO SÁT'}
                                    </span>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setInspectModalOpen(false)}
                                    style={{ padding: '10px 18px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 650, fontSize: 13, cursor: 'pointer' }}
                                >
                                    Đóng biên bản
                                </button>
                                
                                {!selectedTask.isCompleted && (
                                    <button
                                        type="submit"
                                        style={{ padding: '10px 24px', borderRadius: 10, background: '#10B981', color: '#FFFFFF', border: 'none', fontWeight: 750, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
                                    >
                                        Tiếp tục ➔ Bước 4: Check-out Hiện trường <ArrowRight size={15} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* MODAL BƯỚC 4: CHECK-OUT HIỆN TRƯỜNG & KHÓA BIÊN BẢN VĨNH VIỄN       */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {checkoutModalOpen && selectedTask && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ width: '100%', maxWidth: 580, background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Bước 4: Check-out Hiện Trường & Khóa Biên Bản
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        Hoàn tất ca kiểm định tại: {selectedTask.roomName}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckoutModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', color: '#64748B' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmCheckoutAndLock} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div style={{ background: '#FFFBEB', padding: '12px 16px', borderRadius: 12, border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                                ⚠️ <strong>Lưu ý quan trọng:</strong> Một khi bạn nhấn "Khóa & Cấp chứng nhận", biên bản kiểm định sẽ được niêm phong vĩnh viễn và <strong>không thể ghi lại hoặc chỉnh sửa nữa</strong>.
                            </div>

                            {/* Tóm tắt kết quả */}
                            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: '#64748B' }}>Số mục đạt chuẩn:</span>
                                    <strong style={{ color: '#059669' }}>{verifyCategories.filter(c => c.passed).length}/{verifyCategories.length} hạng mục</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: '#64748B' }}>Chỉ số chốt:</span>
                                    <strong style={{ color: '#0F172A' }}>Điện: {verifyElec} kWh | Nước: {verifyWater} m³</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748B' }}>Kết luận:</span>
                                    <strong style={{ color: verifyResult === 'VERIFIED' ? '#059669' : '#E11D48' }}>
                                        {verifyResult === 'VERIFIED' ? '✅ CẤP CHỨNG NHẬN 100%' : '❌ TỪ CHỐI / CẦN SỬA ĐỔI'}
                                    </strong>
                                </div>
                            </div>

                            {/* Upload ảnh Check-out */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 750, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                                    Ảnh chụp Check-out kết thúc ca (*)
                                </label>
                                
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nhập URL ảnh chụp check-out..."
                                        value={checkoutPhotoInput}
                                        onChange={e => setCheckoutPhotoInput(e.target.value)}
                                        style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, outline: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputCheckout.current?.click()}
                                        style={{ padding: '9px 14px', borderRadius: 10, background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <Camera size={14} /> Chụp / Tải ảnh
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputCheckout}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const url = URL.createObjectURL(file);
                                                setCheckoutPhotoInput(url);
                                            }
                                        }}
                                    />
                                </div>

                                {checkoutPhotoInput && (
                                    <div style={{ position: 'relative', width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                                        <img src={checkoutPhotoInput} alt="Check-out preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={12} /> Thời gian check-out: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCheckoutModalOpen(false);
                                        setInspectModalOpen(true);
                                    }}
                                    style={{ padding: '9px 16px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#64748B', fontWeight: 650, fontSize: 13, cursor: 'pointer' }}
                                >
                                    Quay lại bước 3
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 22px', borderRadius: 10, background: '#059669', color: '#FFFFFF', border: 'none', fontWeight: 750, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(5,150,105,0.25)' }}
                                >
                                    <Lock size={15} /> Hoàn tất ca & Khóa biên bản vĩnh viễn
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
