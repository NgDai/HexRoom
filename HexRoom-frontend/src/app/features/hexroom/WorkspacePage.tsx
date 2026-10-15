import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Header, Footer } from '../home/components';
import { useAuth } from '@/app/context/useAuth';
import { request, money, inspectionCategories, inspectionStatuses, type ApiRoom, type Page } from '@/lib/hexroom-api';
import { MOCK_ROOMS_DATA } from '@/lib/mock-data';
import {
    Building2, Home, PlusCircle, CheckCircle2, ShieldCheck, Camera, Sparkles,
    Banknote, FileText, Trash2, Eye, Calendar, Clock, Phone, AlertCircle,
    Info, X, Image as ImageIcon, Zap, Droplets, Wifi, Car, Plus, Shield,
    Search, Filter, ArrowUpDown, LayoutGrid, Table, Check, ExternalLink,
    RefreshCw, ChevronRight, User, Users, MapPin, Tag, ArrowRight, Edit3, KeyRound
} from 'lucide-react';

type Rental = { id: string; title: string; status: string; address?: string; district?: string; city?: string };

// 5 Core Inspection photo slots with specific suggestions
const INSPECTION_SLOTS = [
    {
        key: 'photoMain',
        title: 'Góc 1: Toàn cảnh phòng ngủ & Giường',
        required: true,
        desc: 'Chụp góc rộng từ cửa ra vào, bật sáng đèn, bao quát giường và không gian chính.',
        sampleUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        tip: 'Góc chụp quan trọng nhất để thu hút người thuê.'
    },
    {
        key: 'photoKitchen',
        title: 'Góc 2: Bếp & Bàn làm việc / Ăn uống',
        required: false,
        desc: 'Chụp rõ tủ bếp, bồn rửa, bàn làm việc hoặc bàn ăn tiện ích.',
        sampleUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
        tip: 'Lau sạch bề mặt bếp trước khi chụp để tạo cảm giác tinh tươm.'
    },
    {
        key: 'photoBathroom',
        title: 'Góc 3: Nhà vệ sinh & Thiết bị phòng tắm',
        required: true,
        desc: 'Chụp đầy đủ bồn cầu, lavabo, vòi sen và bình nóng lạnh để kiểm định thiết bị.',
        sampleUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        tip: 'Khách thuê rất quan tâm đến độ sạch sẽ và gạch ốp của nhà vệ sinh.'
    },
    {
        key: 'photoBalcony',
        title: 'Góc 4: Ban công & Cửa sổ đón nắng',
        required: false,
        desc: 'Chụp hướng ra cửa sổ hoặc ban công để kiểm tra độ thông thoáng và ánh sáng.',
        sampleUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        tip: 'Mở rèm cửa sang hai bên để lấy trọn ánh sáng tự nhiên ban ngày.'
    },
    {
        key: 'photoMeters',
        title: 'Góc 5: Công tơ điện & Đồng hồ nước',
        required: true,
        desc: 'Chụp cận cảnh mặt đồng hồ công tơ riêng của phòng, thấy rõ chỉ số số kWh/m³ ban đầu.',
        sampleUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
        tip: 'Bằng chứng then chốt để Inspector cấp chứng nhận Minh bạch chi phí 100%.'
    }
] as const;

// Quick sample sets for landlords
const QUICK_SAMPLE_SETS = [
    {
        name: 'Bộ ảnh mẫu: Căn hộ Studio cao cấp (Bình Thạnh)',
        urls: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80'
        ]
    },
    {
        name: 'Bộ ảnh mẫu: Phòng trọ khép kín hiện đại (Cầu Giấy)',
        urls: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80'
        ]
    }
];

const POPULAR_AMENITIES = [
    'Máy lạnh', 'Tủ lạnh', 'Máy giặt riêng', 'Gác lửng',
    'Ban công', 'Thang máy', 'Khóa vân tay', 'Bếp riêng',
    'Bãi giữ xe', 'Wifi tốc độ cao', 'Bảo vệ 24/7', 'Bình nóng lạnh',
    'Giường nệm', 'Tủ quần áo', 'Bàn làm việc', 'Không chung chủ'
];

interface LocalBookingItem {
    id: string;
    roomId?: string;
    roomName?: string;
    propertyName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    landlordName?: string;
    landlordPhone?: string;
    status?: string;
    price?: number;
    notes?: string;
}

export function WorkspacePage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const paramMode = searchParams.get('mode') as 'list' | 'rental' | 'room' | 'inspection' | null;
    const staff = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
    const owner = user?.role === 'LANDLORD' || user?.role === 'ADMIN';
    const authorized = staff || owner;

    const [rooms, setRooms] = useState<ApiRoom[]>([]);
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [selected, setSelected] = useState<ApiRoom | null>(null);
    const [detailModalRoom, setDetailModalRoom] = useState<ApiRoom | null>(null);
    const [detailImageIndex, setDetailImageIndex] = useState(0);

    const [mode, setMode] = useState<'list' | 'rental' | 'room' | 'inspection'>(() => {
        if (paramMode && ['list', 'rental', 'room', 'inspection'].includes(paramMode)) {
            return paramMode;
        }
        return 'list';
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [version, setVersion] = useState(0);

    // Filter and search state
    const [searchKeyword, setSearchKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'RENTED' | 'PENDING' | 'MAINTENANCE'>('ALL');
    const [inspectionFilter, setInspectionFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
    const [rentalFilter, setRentalFilter] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'AREA_DESC'>('DEFAULT');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Local bookings state
    const [localBookings, setLocalBookings] = useState<LocalBookingItem[]>([]);

    // Sync mode if query param changes
    useEffect(() => {
        if (paramMode && ['list', 'rental', 'room', 'inspection'].includes(paramMode)) {
            setMode(paramMode);
        }
    }, [paramMode]);

    // Modal state for requesting inspector on a room from the list
    const [inspectionTargetRoom, setInspectionTargetRoom] = useState<ApiRoom | null>(null);
    const [inspectDate, setInspectDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [inspectTimeSlot, setInspectTimeSlot] = useState('Sáng (8:30 - 11:30)');
    const [inspectPhone, setInspectPhone] = useState(user?.phone || '');
    const [inspectNotes, setInspectNotes] = useState('');
    const [inspectScope, setInspectScope] = useState<string[]>(['CONDITION', 'PRICE_AND_FEES', 'IMAGES']);

    // State for create/edit room form
    const [formPrice, setFormPrice] = useState<number | string>('');
    const [formDeposit, setFormDeposit] = useState<number | string>('');
    const [formAmenities, setFormAmenities] = useState<string[]>([]);
    const [slotPhotos, setSlotPhotos] = useState<{ [key: string]: string }>({
        photoMain: '',
        photoKitchen: '',
        photoBathroom: '',
        photoBalcony: '',
        photoMeters: ''
    });
    const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
    const [requestInspectorOnCreate, setRequestInspectorOnCreate] = useState(true);
    const [sampleModalImage, setSampleModalImage] = useState<{ title: string; url: string; tip: string } | null>(null);

    // Load local appointments
    useEffect(() => {
        try {
            const raw = localStorage.getItem('hexroom_local_bookings');
            if (raw) {
                setLocalBookings(JSON.parse(raw));
            }
        } catch {
            // ignore
        }
    }, [version]);

    useEffect(() => {
        if (!authorized) return;
        let active = true;

        // Merge local custom rooms with mock/api data
        let localCustomRooms: ApiRoom[] = [];
        try {
            localCustomRooms = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
        } catch {
            localCustomRooms = [];
        }

        Promise.all([
            request<Page<ApiRoom>>(`/rooms/manage?page=${page}`).catch(() => ({ items: MOCK_ROOMS_DATA, totalPages: 1 })),
            owner ? request<Page<Rental>>('/rentals/mine').catch(() => null) : Promise.resolve(null)
        ])
            .then(([data, rentalData]) => {
                if (active) {
                    const baseItems = data?.items && data.items.length > 0 ? data.items : MOCK_ROOMS_DATA;
                    // Combine custom rooms
                    const map = new Map<string, ApiRoom>();
                    localCustomRooms.forEach(r => map.set(r.id, r));
                    baseItems.forEach(r => {
                        if (!map.has(r.id)) map.set(r.id, r);
                    });
                    setRooms(Array.from(map.values()));
                    setPages(data?.totalPages || 1);

                    const list = rentalData?.items ?? [];
                    if (list.length === 0) {
                        setRentals([
                            { id: 'rental-001', title: 'Tòa nhà Căn hộ Dịch vụ HexHouse Bình Thạnh', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' },
                            { id: 'rental-002', title: 'Khu Trọ An Ninh D5 Bình Thạnh', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' },
                            { id: 'rental-003', title: 'Tòa Nhà Xanh Ung Văn Khiêm', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' },
                            { id: 'rental-004', title: 'HexHouse Xô Viết Nghệ Tĩnh', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' },
                        ]);
                    } else {
                        setRentals(list);
                    }
                }
            })
            .catch(() => {
                if (active) {
                    setRooms(MOCK_ROOMS_DATA);
                    setRentals([
                        { id: 'rental-001', title: 'Tòa nhà Căn hộ Dịch vụ HexHouse Bình Thạnh', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' },
                        { id: 'rental-002', title: 'Khu Trọ An Ninh D5 Bình Thạnh', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' },
                    ]);
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [authorized, owner, page, version]);

    // Populate form when editing a room
    useEffect(() => {
        if (selected && mode === 'room') {
            setFormPrice(selected.price || '');
            setFormDeposit(selected.costs?.deposit || '');
            setFormAmenities(selected.amenities || []);
            const imgs = selected.images || [];
            setSlotPhotos({
                photoMain: imgs[0] || '',
                photoKitchen: imgs[1] || '',
                photoBathroom: imgs[2] || '',
                photoBalcony: imgs[3] || '',
                photoMeters: imgs[4] || ''
            });
            setExtraPhotos(imgs.slice(5));
        } else if (!selected && mode === 'room') {
            setFormPrice('');
            setFormDeposit('');
            setFormAmenities(['Máy lạnh', 'Tủ lạnh', 'Khóa vân tay', 'Wifi tốc độ cao']);
            setSlotPhotos({
                photoMain: '',
                photoKitchen: '',
                photoBathroom: '',
                photoBalcony: '',
                photoMeters: ''
            });
            setExtraPhotos([]);
        }
    }, [selected, mode]);

    const action = async (fn: () => Promise<unknown>, text: string) => {
        setBusy(true); setError(''); setSuccess('');
        try {
            await fn();
            setSuccess(text);
            setMode('list');
            setSelected(null);
            setInspectionTargetRoom(null);
            setVersion(v => v + 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể lưu dữ liệu');
        } finally {
            setBusy(false);
        }
    };

    const createRental = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const newRental: Rental = {
            id: `rental-${Date.now()}`,
            title: String(data.get('title') || 'Nhà trọ mới'),
            address: String(data.get('address') || ''),
            district: String(data.get('district') || ''),
            city: String(data.get('city') || ''),
            status: 'ACTIVE'
        };
        setRentals(prev => [newRental, ...prev]);
        setSuccess('Đã tạo Nhà trọ / Khu trọ thành công! Bây giờ bạn có thể thêm phòng vào nhà trọ này.');
        setMode('list');
    };

    const handleSaveRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const num = (k: string) => data.get(k) === '' ? null : Number(data.get(k));

        const coreUrls = [
            slotPhotos.photoMain,
            slotPhotos.photoKitchen,
            slotPhotos.photoBathroom,
            slotPhotos.photoBalcony,
            slotPhotos.photoMeters
        ].map(s => s.trim()).filter(Boolean);

        const allImages = Array.from(new Set([...coreUrls, ...extraPhotos.map(s => s.trim()).filter(Boolean)]));

        const costs = {
            deposit: num('deposit') ?? Number(formPrice) ?? 0,
            electricityPerKwh: num('electricityPerKwh') ?? 3500,
            waterPerM3: num('waterPerM3') ?? 20000,
            internetMonthly: num('internetMonthly') ?? 100000,
            parkingMonthly: num('parkingMonthly') ?? 120000,
            serviceMonthly: num('serviceMonthly') ?? 100000,
            paymentCycleMonths: num('paymentCycleMonths') || 1,
            houseRules: data.get('houseRules') ? String(data.get('houseRules')) : 'Giữ gìn vệ sinh chung, không làm ồn sau 23h.',
            feeNotes: data.get('feeNotes') ? String(data.get('feeNotes')) : 'Điện nước tính theo chỉ số đồng hồ riêng từng phòng.'
        };

        const targetRentalId = (selected?.rentalId ?? data.get('rentalId') ?? rentals[0]?.id ?? 'rental-001') as string;
        const targetRentalObj = rentals.find(r => r.id === targetRentalId);

        const savedRoom: ApiRoom = {
            id: selected?.id || `room-${Date.now()}`,
            rentalId: targetRentalId,
            roomName: (data.get('roomName') as string) || 'Phòng trọ mới đăng',
            rentalTitle: targetRentalObj?.title || 'Tòa nhà căn hộ HexHouse',
            description: (data.get('description') as string) || 'Phòng trọ khép kín đầy đủ tiện nghi, an ninh 24/7.',
            price: Number(formPrice) || num('price') || 4000000,
            sizeM2: num('sizeM2') || 28,
            maxPeople: num('maxPeople') || 2,
            roomType: (data.get('roomType') as string) || 'STUDIO',
            status: selected?.status || 'AVAILABLE',
            address: targetRentalObj?.address || '152/24 Nguyễn Gia Trí, Phường 25',
            district: targetRentalObj?.district || 'Quận Bình Thạnh',
            city: targetRentalObj?.city || 'Hồ Chí Minh',
            images: allImages.length ? allImages : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000'],
            amenities: formAmenities.length ? formAmenities : ['Máy lạnh', 'Tủ lạnh', 'Khóa vân tay', 'Wifi tốc độ cao'],
            costs,
            availabilityConfirmedAt: selected?.availabilityConfirmedAt || new Date().toISOString(),
            createdAt: selected?.createdAt || new Date().toISOString()
        };

        // Save to state and localStorage
        setRooms(prev => [savedRoom, ...prev.filter(r => r.id !== savedRoom.id)]);
        try {
            const prevCustom = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
            const nextCustom = [savedRoom, ...prevCustom.filter((r: any) => r.id !== savedRoom.id)];
            localStorage.setItem('hexroom_custom_rooms', JSON.stringify(nextCustom));
        } catch {
            // ignore
        }

        // If requested inspector
        if (requestInspectorOnCreate) {
            try {
                const reqObj = {
                    roomId: savedRoom.id,
                    roomName: savedRoom.roomName,
                    preferredDate: inspectDate,
                    preferredTimeSlot: inspectTimeSlot,
                    contactPhone: inspectPhone || user?.phone || 'Chưa cung cấp',
                    notes: inspectNotes || 'Yêu cầu kiểm định phòng mới tạo',
                    createdAt: new Date().toISOString()
                };
                const prevReqs = JSON.parse(localStorage.getItem('hexroom_inspection_requests') || '[]');
                localStorage.setItem('hexroom_inspection_requests', JSON.stringify([reqObj, ...prevReqs.filter((r: any) => r.roomId !== savedRoom.id)]));
            } catch {
                // ignore
            }
        }

        setSuccess(selected ? 'Đã cập nhật thông tin phòng thành công.' : 'Đã đăng phòng trọ mới thành công! Yêu cầu kiểm định tại chỗ đã được tiếp nhận.');
        setMode('list');
        setSelected(null);
    };

    const submitInspectionRequest = (e: FormEvent) => {
        e.preventDefault();
        if (!inspectionTargetRoom) return;

        try {
            const reqObj = {
                roomId: inspectionTargetRoom.id,
                roomName: inspectionTargetRoom.roomName,
                preferredDate: inspectDate,
                preferredTimeSlot: inspectTimeSlot,
                contactPhone: inspectPhone,
                notes: `Phạm vi: ${inspectScope.join(', ')} | Ghi chú: ${inspectNotes}`,
                createdAt: new Date().toISOString()
            };
            const prevReqs = JSON.parse(localStorage.getItem('hexroom_inspection_requests') || '[]');
            localStorage.setItem('hexroom_inspection_requests', JSON.stringify([reqObj, ...prevReqs.filter((r: any) => r.roomId !== inspectionTargetRoom.id)]));
        } catch {
            // ignore
        }

        setSuccess(`Đã gửi yêu cầu kiểm định cho phòng "${inspectionTargetRoom.roomName}". Inspector của HexRoom sẽ liên hệ bạn sớm nhất!`);
        setInspectionTargetRoom(null);
    };

    const toggleAmenity = (name: string) => {
        setFormAmenities(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        );
    };

    const applySampleSet = (urls: string[]) => {
        setSlotPhotos({
            photoMain: urls[0] || '',
            photoKitchen: urls[1] || '',
            photoBathroom: urls[2] || '',
            photoBalcony: urls[3] || '',
            photoMeters: urls[4] || ''
        });
    };

    // Quick status toggle
    const handleQuickStatusChange = (roomId: string, newStatus: string) => {
        const updated = rooms.map(r => r.id === roomId ? { ...r, status: newStatus as any } : r);
        setRooms(updated);
        try {
            const customRooms = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
            const nextCustom = customRooms.map((r: any) => r.id === roomId ? { ...r, status: newStatus } : r);
            localStorage.setItem('hexroom_custom_rooms', JSON.stringify(nextCustom));
        } catch {
            // ignore
        }
        if (detailModalRoom && detailModalRoom.id === roomId) {
            setDetailModalRoom(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
    };

    // Delete room
    const handleDeleteRoom = (room: ApiRoom) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa phòng "${room.roomName}" khỏi danh sách quản lý?`);
        if (!confirmed) return;
        const updated = rooms.filter(r => r.id !== room.id);
        setRooms(updated);
        try {
            const customRooms = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
            const nextCustom = customRooms.filter((r: any) => r.id !== room.id);
            localStorage.setItem('hexroom_custom_rooms', JSON.stringify(nextCustom));
        } catch {
            // ignore
        }
        if (detailModalRoom?.id === room.id) {
            setDetailModalRoom(null);
        }
        setSuccess(`Đã xóa phòng "${room.roomName}".`);
    };

    // Get bookings associated with a room
    const getBookingsForRoom = (room: ApiRoom) => {
        return localBookings.filter(b => b.roomId === room.id || (b.roomName && room.roomName && b.roomName.toLowerCase() === room.roomName.toLowerCase()));
    };

    // KPI Metrics
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
    const rentedRooms = rooms.filter(r => r.status === 'RENTED').length;
    const pendingRooms = rooms.filter(r => r.status === 'PENDING').length;
    const verifiedRooms = rooms.filter(r => Boolean(r.availabilityConfirmedAt)).length;
    const totalRevenue = rooms.reduce((acc, r) => acc + (Number(r.price) || 0), 0);
    const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

    // Filtered rooms
    const filteredRooms = useMemo(() => {
        return rooms.filter(r => {
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                const matchName = (r.roomName || '').toLowerCase().includes(kw);
                const matchRental = (r.rentalTitle || '').toLowerCase().includes(kw);
                const matchAddress = (r.address || '').toLowerCase().includes(kw);
                const matchDistrict = (r.district || '').toLowerCase().includes(kw);
                const matchId = (r.id || '').toLowerCase().includes(kw);
                if (!matchName && !matchRental && !matchAddress && !matchDistrict && !matchId) {
                    return false;
                }
            }
            if (statusFilter !== 'ALL' && r.status !== statusFilter) {
                return false;
            }
            if (inspectionFilter === 'VERIFIED' && !r.availabilityConfirmedAt) {
                return false;
            }
            if (inspectionFilter === 'UNVERIFIED' && r.availabilityConfirmedAt) {
                return false;
            }
            if (rentalFilter !== 'ALL' && r.rentalId !== rentalFilter) {
                return false;
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === 'PRICE_ASC') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'PRICE_DESC') return (b.price || 0) - (a.price || 0);
            if (sortBy === 'AREA_DESC') return (b.sizeM2 || 0) - (a.sizeM2 || 0);
            return 0;
        });
    }, [rooms, searchKeyword, statusFilter, inspectionFilter, rentalFilter, sortBy]);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return { label: '🟢 Đang cho thuê', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
            case 'RENTED':
                return { label: '🔵 Đã có người thuê', bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
            case 'MAINTENANCE':
                return { label: '🟠 Đang bảo trì', bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
            case 'PENDING':
                return { label: '⏳ Chờ phê duyệt', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' };
            default:
                return { label: status, bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
        }
    };

    return (
        <div className="hx-page" style={{ background: '#FFFFFF', minHeight: '100vh' }}>
            <Header />

            <main className="hx-container hx-section" style={{ paddingTop: 32, paddingBottom: 64 }}>
                {/* Header Title */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#059669', fontSize: 11, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                        <Building2 size={13} /> Không gian quản lý phòng trọ & kiểm định
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                                {staff ? 'Kiểm duyệt & Hồ sơ kiểm định phòng trọ' : 'Quản lý phòng trọ & Khu trọ của bạn'}
                            </h1>
                            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 740, lineHeight: 1.6, margin: 0 }}>
                                Theo dõi chi tiết từng phòng trọ, quản lý biểu phí minh bạch, lịch hẹn đón khách xem phòng và chứng nhận kiểm định thực tế 4 bước.
                            </p>
                        </div>

                        {owner && (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => { setMode('room'); setSelected(null); }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 20px',
                                        background: '#10B981',
                                        color: '#FFFFFF',
                                        fontWeight: 750,
                                        fontSize: 14,
                                        borderRadius: 12,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <Plus size={16} /> Đăng thêm phòng mới
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('rental'); setSelected(null); }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 18px',
                                        background: '#FFFFFF',
                                        color: '#334155',
                                        fontWeight: 650,
                                        fontSize: 14,
                                        borderRadius: 12,
                                        border: '1px solid #CBD5E1',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <Home size={16} /> Thêm Nhà trọ / Khu trọ
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {!authorized ? (
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FEF2F2', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#DC2626' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                            Khu vực dành riêng cho chủ trọ & nhân viên kiểm duyệt
                        </h3>
                        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 460, margin: '0 auto 24px' }}>
                            Vui lòng đăng nhập với tài khoản Chủ nhà (Landlord) hoặc Quản trị viên để quản lý danh mục phòng trọ.
                        </p>
                        <Link
                            to="/login"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: '#0F172A', color: '#FFFFFF', borderRadius: 12, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                        >
                            Đăng nhập ngay
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECDD3', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                                <AlertCircle size={18} />
                                <span style={{ flex: 1 }}>{error}</span>
                                <button type="button" onClick={() => { setError(''); setVersion(v => v + 1); }} style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Tải lại
                                </button>
                            </div>
                        )}

                        {success && (
                            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}>
                                <CheckCircle2 size={18} color="#059669" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* ── KPI METRICS CARDS (TỔNG QUAN CHI TIẾT) ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                    <span>TỔNG SỐ PHÒNG</span>
                                    <Building2 size={16} style={{ color: '#059669' }} />
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 850, color: '#0F172A' }}>{totalRooms}</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                    Thuộc {rentals.length} khu trọ / tòa nhà
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#065F46', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                    <span>ĐANG CHO THUÊ</span>
                                    <span style={{ padding: '2px 8px', borderRadius: 999, background: '#ECFDF5', fontSize: 11, fontWeight: 800, color: '#059669' }}>
                                        {totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0}%
                                    </span>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 850, color: '#059669' }}>{availableRooms}</div>
                                <div style={{ fontSize: 11, color: '#047857', marginTop: 4 }}>
                                    Sẵn sàng đón khách mới
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                    <span>ĐÃ CHO THUÊ</span>
                                    <Users size={16} style={{ color: '#2563EB' }} />
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 850, color: '#1E40AF' }}>{rentedRooms}</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                    Tỷ lệ lấp đầy: {occupancyRate}%
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                    <span>ĐÃ KIỂM ĐỊNH 100%</span>
                                    <ShieldCheck size={16} style={{ color: '#10B981' }} />
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 850, color: '#0F172A' }}>{verifiedRooms}</div>
                                <div style={{ fontSize: 11, color: '#059669', fontWeight: 650, marginTop: 4 }}>
                                    ✅ Đạt chuẩn đối chiếu tại chỗ
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                    <span>LỊCH HẸN XEM PHÒNG</span>
                                    <Calendar size={16} style={{ color: '#F59E0B' }} />
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 850, color: '#D97706' }}>{localBookings.length}</div>
                                <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>
                                    Khách hẹn xem sắp tới
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                    <span>TỔNG DOANH THU/THÁNG</span>
                                    <Banknote size={16} style={{ color: '#059669' }} />
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 850, color: '#0F172A' }}>{money(totalRevenue)}</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                    Khi lấp đầy 100% phòng
                                </div>
                            </div>
                        </div>

                        {/* ── MODERN TAB BAR ── */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #E2E8F0', overflowX: 'auto', paddingBottom: 2 }}>
                            <button
                                type="button"
                                onClick={() => { setMode('list'); setSelected(null); }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 18px',
                                    borderBottom: mode === 'list' ? '3px solid #10B981' : '3px solid transparent',
                                    color: mode === 'list' ? '#059669' : '#64748B',
                                    fontWeight: mode === 'list' ? 750 : 600,
                                    fontSize: 14,
                                    background: 'transparent',
                                    borderTop: 'none',
                                    borderLeft: 'none',
                                    borderRight: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    marginBottom: -2,
                                }}
                            >
                                <Building2 size={16} /> Danh sách phòng trọ <span style={{ padding: '2px 8px', borderRadius: 999, background: mode === 'list' ? '#ECFDF5' : '#F1F5F9', fontSize: 11, fontWeight: 750, color: mode === 'list' ? '#065F46' : '#64748B' }}>{rooms.length}</span>
                            </button>

                            {owner && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { setMode('rental'); setSelected(null); }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '10px 18px',
                                            borderBottom: mode === 'rental' ? '3px solid #10B981' : '3px solid transparent',
                                            color: mode === 'rental' ? '#059669' : '#64748B',
                                            fontWeight: mode === 'rental' ? 750 : 600,
                                            fontSize: 14,
                                            background: 'transparent',
                                            borderTop: 'none',
                                            borderLeft: 'none',
                                            borderRight: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap',
                                            marginBottom: -2,
                                        }}
                                    >
                                        <Home size={16} /> Quản lý Nhà trọ / Khu trọ <span style={{ padding: '2px 8px', borderRadius: 999, background: mode === 'rental' ? '#ECFDF5' : '#F1F5F9', fontSize: 11, fontWeight: 750, color: mode === 'rental' ? '#065F46' : '#64748B' }}>{rentals.length}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setMode('room'); setSelected(null); }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '10px 18px',
                                            borderBottom: mode === 'room' ? '3px solid #10B981' : '3px solid transparent',
                                            color: mode === 'room' ? '#059669' : '#64748B',
                                            fontWeight: mode === 'room' ? 750 : 600,
                                            fontSize: 14,
                                            background: 'transparent',
                                            borderTop: 'none',
                                            borderLeft: 'none',
                                            borderRight: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap',
                                            marginBottom: -2,
                                        }}
                                    >
                                        <PlusCircle size={16} /> {selected ? `Cập nhật: ${selected.roomName}` : 'Đăng phòng mới'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* ── TAB 1: DANH SÁCH PHÒNG CHI TIẾT ── */}
                        {mode === 'list' && (
                            <section style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                                {/* Filter & Search Toolbar */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                                Danh sách phòng trọ chi tiết ({filteredRooms.length}/{rooms.length})
                                            </h2>
                                            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                                                Nhấp vào "Xem chi tiết" để xem đầy đủ hồ sơ kiểm định 5 góc ảnh, bảng giá & lịch hẹn của người thuê.
                                            </p>
                                        </div>

                                        {/* View mode toggle */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', padding: 4, borderRadius: 12 }}>
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('table')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 12px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                                                    color: viewMode === 'table' ? '#0F172A' : '#64748B',
                                                    cursor: 'pointer',
                                                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                }}
                                            >
                                                <Table size={14} /> Dạng bảng
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('grid')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 12px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                                                    color: viewMode === 'grid' ? '#0F172A' : '#64748B',
                                                    cursor: 'pointer',
                                                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                }}
                                            >
                                                <LayoutGrid size={14} /> Dạng thẻ
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search & Filter Controls */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, background: '#F8FAFC', padding: 14, borderRadius: 14, border: '1px solid #E2E8F0' }}>
                                        {/* Search */}
                                        <div style={{ position: 'relative' }}>
                                            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                            <input
                                                type="text"
                                                value={searchKeyword}
                                                onChange={e => setSearchKeyword(e.target.value)}
                                                placeholder="Tìm theo tên phòng, tòa nhà, địa chỉ..."
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px 9px 36px',
                                                    borderRadius: 10,
                                                    border: '1px solid #CBD5E1',
                                                    background: '#FFFFFF',
                                                    fontSize: 13,
                                                    color: '#0F172A',
                                                    outline: 'none',
                                                }}
                                            />
                                        </div>

                                        {/* Status Filter */}
                                        <div>
                                            <select
                                                value={statusFilter}
                                                onChange={e => setStatusFilter(e.target.value as any)}
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    borderRadius: 10,
                                                    border: '1px solid #CBD5E1',
                                                    background: '#FFFFFF',
                                                    fontSize: 13,
                                                    color: '#0F172A',
                                                    outline: 'none',
                                                }}
                                            >
                                                <option value="ALL">Tất cả trạng thái tin</option>
                                                <option value="AVAILABLE">🟢 Đang cho thuê (Còn phòng)</option>
                                                <option value="RENTED">🔵 Đã có người thuê</option>
                                                <option value="MAINTENANCE">🟠 Đang bảo trì</option>
                                                <option value="PENDING">🟡 Chờ phê duyệt</option>
                                            </select>
                                        </div>

                                        {/* Inspection Filter */}
                                        <div>
                                            <select
                                                value={inspectionFilter}
                                                onChange={e => setInspectionFilter(e.target.value as any)}
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    borderRadius: 10,
                                                    border: '1px solid #CBD5E1',
                                                    background: '#FFFFFF',
                                                    fontSize: 13,
                                                    color: '#0F172A',
                                                    outline: 'none',
                                                }}
                                            >
                                                <option value="ALL">Tất cả hồ sơ kiểm định</option>
                                                <option value="VERIFIED">✅ Đã kiểm định 100%</option>
                                                <option value="UNVERIFIED">⏳ Chờ Inspector thẩm định</option>
                                            </select>
                                        </div>

                                        {/* Sort By */}
                                        <div>
                                            <select
                                                value={sortBy}
                                                onChange={e => setSortBy(e.target.value as any)}
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    borderRadius: 10,
                                                    border: '1px solid #CBD5E1',
                                                    background: '#FFFFFF',
                                                    fontSize: 13,
                                                    color: '#0F172A',
                                                    outline: 'none',
                                                }}
                                            >
                                                <option value="DEFAULT">Sắp xếp mặc định</option>
                                                <option value="PRICE_ASC">Giá thuê: Thấp đến cao</option>
                                                <option value="PRICE_DESC">Giá thuê: Cao đến thấp</option>
                                                <option value="AREA_DESC">Diện tích: Lớn nhất trước</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* CONTENT: TABLE VIEW */}
                                {viewMode === 'table' ? (
                                    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 14 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                            <thead>
                                                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                    <th style={{ padding: '14px 16px' }}>Căn phòng & Khu trọ</th>
                                                    <th style={{ padding: '14px 16px' }}>Thông số</th>
                                                    <th style={{ padding: '14px 16px' }}>Bảng giá & Chi phí</th>
                                                    <th style={{ padding: '14px 16px' }}>Trạng thái phòng</th>
                                                    <th style={{ padding: '14px 16px' }}>Kiểm định Inspector</th>
                                                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRooms.map((room) => {
                                                    const hasVerified = Boolean(room.availabilityConfirmedAt);
                                                    const roomBookings = getBookingsForRoom(room);
                                                    const statusCfg = getStatusConfig(room.status);

                                                    return (
                                                        <tr
                                                            key={room.id}
                                                            style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            {/* Room & Property info */}
                                                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                                    <div
                                                                        style={{
                                                                            width: 72,
                                                                            height: 72,
                                                                            borderRadius: 12,
                                                                            overflow: 'hidden',
                                                                            background: '#F1F5F9',
                                                                            flexShrink: 0,
                                                                            cursor: 'pointer',
                                                                            position: 'relative'
                                                                        }}
                                                                        onClick={() => { setDetailModalRoom(room); setDetailImageIndex(0); }}
                                                                    >
                                                                        {room.images && room.images[0] ? (
                                                                            <img
                                                                                src={room.images[0]}
                                                                                alt={room.roomName}
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                            />
                                                                        ) : (
                                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                                                                <Home size={24} />
                                                                            </div>
                                                                        )}
                                                                        {room.images && room.images.length > 1 && (
                                                                            <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                                                                +{room.images.length}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ minWidth: 0 }}>
                                                                        <div
                                                                            style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', cursor: 'pointer', lineHeight: 1.35 }}
                                                                            onClick={() => { setDetailModalRoom(room); setDetailImageIndex(0); }}
                                                                        >
                                                                            {room.roomName}
                                                                        </div>
                                                                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 650, marginTop: 2 }}>
                                                                            {room.rentalTitle}
                                                                        </div>
                                                                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <MapPin size={12} style={{ color: '#94A3B8' }} />
                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                                                                {room.address || 'Quận Bình Thạnh, TP.HCM'}
                                                                            </span>
                                                                        </div>
                                                                        {roomBookings.length > 0 && (
                                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, fontWeight: 750, color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: 6, border: '1px solid #FDE68A' }}>
                                                                                <Calendar size={11} /> {roomBookings.length} lịch hẹn xem phòng
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Specs */}
                                                            <td style={{ padding: '14px 16px', verticalAlign: 'top', color: '#334155' }}>
                                                                <div style={{ fontWeight: 700, fontSize: 13 }}>
                                                                    {room.sizeM2 ?? 30} m²
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                                                    Tối đa: {room.maxPeople ?? 2} người
                                                                </div>
                                                                <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', fontSize: 11, fontWeight: 650, color: '#475569' }}>
                                                                    {room.roomType === 'STUDIO' ? 'Studio khép kín' : room.roomType === 'PRIVATE' ? 'Phòng riêng' : room.roomType === 'SHARED' ? 'Ở ghép Coliving' : 'Căn hộ mini'}
                                                                </span>
                                                            </td>

                                                            {/* Price & Costs */}
                                                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                                                <div style={{ fontSize: 15, fontWeight: 850, color: '#059669' }}>
                                                                    {money(room.price)}
                                                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}> /tháng</span>
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                                                                    Cọc: {money(room.costs?.deposit || room.price)}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                                                                    ⚡ Điện: {room.costs?.electricityPerKwh ? `${money(room.costs.electricityPerKwh)}/kWh` : '3.500 đ/kWh'}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                                                    💧 Nước: {room.costs?.waterPerM3 ? `${money(room.costs.waterPerM3)}/m³` : '20.000 đ/m³'}
                                                                </div>
                                                            </td>

                                                            {/* Status */}
                                                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                                                <select
                                                                    value={room.status}
                                                                    onChange={e => handleQuickStatusChange(room.id, e.target.value)}
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderRadius: 8,
                                                                        fontSize: 12,
                                                                        fontWeight: 750,
                                                                        background: statusCfg.bg,
                                                                        color: statusCfg.text,
                                                                        border: `1px solid ${statusCfg.border}`,
                                                                        cursor: 'pointer',
                                                                        outline: 'none',
                                                                    }}
                                                                >
                                                                    <option value="AVAILABLE">🟢 Cho thuê</option>
                                                                    <option value="RENTED">🔵 Đã thuê</option>
                                                                    <option value="MAINTENANCE">🟠 Bảo trì</option>
                                                                    <option value="PENDING">🟡 Chờ duyệt</option>
                                                                </select>
                                                            </td>

                                                            {/* Inspector */}
                                                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                                                {hasVerified ? (
                                                                    <div>
                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 11, fontWeight: 750 }}>
                                                                            <CheckCircle2 size={13} color="#059669" /> Đã kiểm định 100%
                                                                        </span>
                                                                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                                                                            Đã xác thực chỉ số & ảnh thật
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 11, fontWeight: 700 }}>
                                                                            <Clock size={13} color="#D97706" /> Chờ kiểm định
                                                                        </span>
                                                                        {owner && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setInspectionTargetRoom(room);
                                                                                    setInspectPhone(user?.phone || '');
                                                                                }}
                                                                                style={{
                                                                                    display: 'block',
                                                                                    marginTop: 6,
                                                                                    fontSize: 11,
                                                                                    fontWeight: 700,
                                                                                    color: '#059669',
                                                                                    background: 'transparent',
                                                                                    border: 'none',
                                                                                    cursor: 'pointer',
                                                                                    padding: 0,
                                                                                    textDecoration: 'underline'
                                                                                }}
                                                                            >
                                                                                ＋ Gửi yêu cầu Inspector
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Actions */}
                                                            <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setDetailModalRoom(room); setDetailImageIndex(0); }}
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            borderRadius: 8,
                                                                            background: '#0F172A',
                                                                            color: '#FFFFFF',
                                                                            border: 'none',
                                                                            fontSize: 12,
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4
                                                                        }}
                                                                    >
                                                                        <Eye size={13} /> Chi tiết
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setSelected(room); setMode('room'); }}
                                                                        style={{
                                                                            padding: '6px 10px',
                                                                            borderRadius: 8,
                                                                            background: '#FFFFFF',
                                                                            color: '#334155',
                                                                            border: '1px solid #CBD5E1',
                                                                            fontSize: 12,
                                                                            fontWeight: 650,
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4
                                                                        }}
                                                                    >
                                                                        <Edit3 size={12} /> Sửa
                                                                    </button>

                                                                    <Link
                                                                        to={`/room/${room.id}`}
                                                                        style={{
                                                                            padding: '6px 8px',
                                                                            borderRadius: 8,
                                                                            background: '#F1F5F9',
                                                                            color: '#475569',
                                                                            border: '1px solid #E2E8F0',
                                                                            fontSize: 12,
                                                                            textDecoration: 'none',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                        }}
                                                                        title="Xem trang hiển thị công khai của phòng này"
                                                                    >
                                                                        <ExternalLink size={13} />
                                                                    </Link>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteRoom(room)}
                                                                        style={{
                                                                            padding: '6px 8px',
                                                                            borderRadius: 8,
                                                                            background: '#FFF1F2',
                                                                            color: '#E11D48',
                                                                            border: '1px solid #FECDD3',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                        }}
                                                                        title="Xóa phòng này"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    /* CONTENT: GRID CARDS VIEW */
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                                        {filteredRooms.map((room) => {
                                            const hasVerified = Boolean(room.availabilityConfirmedAt);
                                            const roomBookings = getBookingsForRoom(room);
                                            const statusCfg = getStatusConfig(room.status);

                                            return (
                                                <div
                                                    key={room.id}
                                                    style={{
                                                        background: '#FFFFFF',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: 18,
                                                        overflow: 'hidden',
                                                        boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    {/* Card Image */}
                                                    <div style={{ position: 'relative', height: 180, background: '#F1F5F9', overflow: 'hidden' }}>
                                                        <img
                                                            src={room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'}
                                                            alt={room.roomName}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        {/* Status badge */}
                                                        <div style={{ position: 'absolute', top: 10, left: 10 }}>
                                                            <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                                {statusCfg.label}
                                                            </span>
                                                        </div>

                                                        {/* Verified badge */}
                                                        {hasVerified && (
                                                            <div style={{ position: 'absolute', top: 10, right: 10 }}>
                                                                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                                    <CheckCircle2 size={12} color="#059669" /> Đã kiểm định
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Card Body */}
                                                    <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
                                                                    {room.roomName}
                                                                </h3>
                                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                    <span style={{ fontSize: 17, fontWeight: 850, color: '#059669' }}>
                                                                        {money(room.price)}
                                                                    </span>
                                                                    <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>/tháng</span>
                                                                </div>
                                                            </div>

                                                            <p style={{ fontSize: 12, fontWeight: 650, color: '#059669', margin: '0 0 6px' }}>
                                                                {room.rentalTitle}
                                                            </p>

                                                            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <MapPin size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {room.address}
                                                                </span>
                                                            </p>

                                                            {/* Specs row */}
                                                            <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 12, fontSize: 12 }}>
                                                                <div>📐 <strong>{room.sizeM2 ?? 30} m²</strong></div>
                                                                <div>👥 <strong>Tối đa {room.maxPeople ?? 2} người</strong></div>
                                                            </div>

                                                            {/* Costs quick breakdown */}
                                                            <div style={{ fontSize: 11, color: '#475569', display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderTop: '1px dashed #E2E8F0', paddingTop: 8 }}>
                                                                <span>⚡ Điện: {room.costs?.electricityPerKwh ? `${money(room.costs.electricityPerKwh)}/kWh` : '3.500 đ'}</span>
                                                                <span>💧 Nước: {room.costs?.waterPerM3 ? `${money(room.costs.waterPerM3)}/m³` : '20.000 đ'}</span>
                                                                <span>🔒 Cọc: {money(room.costs?.deposit || room.price)}</span>
                                                            </div>

                                                            {/* Bookings alert */}
                                                            {roomBookings.length > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                                                                    <Calendar size={13} /> Có {roomBookings.length} lịch hẹn xem phòng sắp tới
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setDetailModalRoom(room); setDetailImageIndex(0); }}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '8px 12px',
                                                                    borderRadius: 10,
                                                                    background: '#0F172A',
                                                                    color: '#FFFFFF',
                                                                    border: 'none',
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: 6,
                                                                }}
                                                            >
                                                                <Eye size={13} /> Chi tiết
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => { setSelected(room); setMode('room'); }}
                                                                style={{
                                                                    padding: '8px 14px',
                                                                    borderRadius: 10,
                                                                    background: '#FFFFFF',
                                                                    color: '#334155',
                                                                    border: '1px solid #CBD5E1',
                                                                    fontSize: 12,
                                                                    fontWeight: 650,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                Sửa
                                                            </button>

                                                            <Link
                                                                to={`/room/${room.id}`}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    borderRadius: 10,
                                                                    background: '#F1F5F9',
                                                                    color: '#475569',
                                                                    border: '1px solid #E2E8F0',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    textDecoration: 'none'
                                                                }}
                                                                title="Xem trang công khai"
                                                            >
                                                                <ExternalLink size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {filteredRooms.length === 0 && !loading && (
                                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748B' }}>
                                        <Home size={38} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                                            Không tìm thấy phòng nào phù hợp bộ lọc
                                        </h3>
                                        <p style={{ fontSize: 13, margin: '0 0 16px' }}>
                                            Thử xóa từ khóa tìm kiếm hoặc đặt lại các bộ lọc trạng thái.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => { setSearchKeyword(''); setStatusFilter('ALL'); setInspectionFilter('ALL'); setRentalFilter('ALL'); }}
                                            style={{ padding: '8px 16px', borderRadius: 10, background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 650, fontSize: 12, cursor: 'pointer' }}
                                        >
                                            Đặt lại bộ lọc
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ── TAB 2: THÊM / QUẢN LÝ NHÀ TRỌ ── */}
                        {mode === 'rental' && (
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {/* Danh sách các nhà trọ hiện có */}
                                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                                        Danh sách các Nhà trọ / Khu trọ đang quản lý ({rentals.length})
                                    </h2>
                                    <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 18px' }}>
                                        Mỗi nhà trọ là địa điểm chứa các phòng trọ của bạn.
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                                        {rentals.map((r) => {
                                            const roomCount = rooms.filter(room => room.rentalId === r.id).length;
                                            return (
                                                <div key={r.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                                        <div>
                                                            <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                                                {r.title}
                                                            </h4>
                                                            <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <MapPin size={12} style={{ color: '#94A3B8' }} />
                                                                {r.address || 'Địa chỉ đang cập nhật'}, {r.district || 'Bình Thạnh'}, {r.city || 'TP.HCM'}
                                                            </p>
                                                        </div>
                                                        <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                                                            {roomCount} phòng
                                                        </span>
                                                    </div>

                                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setRentalFilter(r.id);
                                                                setMode('list');
                                                            }}
                                                            style={{ padding: '6px 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#059669', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            Xem các phòng thuộc khu trọ này ↗
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Form tạo nhà trọ mới */}
                                <form onSubmit={createRental} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                                    <div style={{ marginBottom: 20 }}>
                                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                            ＋ Thêm Nhà trọ / Tòa nhà mới
                                        </h2>
                                        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                                            Khai báo địa chỉ và tên tòa nhà để phân loại danh mục các phòng trọ của bạn.
                                        </p>
                                    </div>

                                    <div className="hx-grid-2">
                                        <div className="hx-field-group">
                                            <label htmlFor="rental-title">Tên nhà trọ / Tòa nhà (*)</label>
                                            <input id="rental-title" name="title" required maxLength={255} placeholder="VD: Tòa nhà Căn hộ Dịch vụ HexHouse D2" />
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="rental-address">Địa chỉ cụ thể (*)</label>
                                            <input id="rental-address" name="address" required placeholder="VD: 152/24 Nguyễn Gia Trí (D2 cũ)" />
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="rental-district">Quận / Huyện (*)</label>
                                            <input id="rental-district" name="district" required placeholder="VD: Quận Bình Thạnh" />
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="rental-city">Tỉnh / Thành phố (*)</label>
                                            <input id="rental-city" name="city" required placeholder="VD: Hồ Chí Minh" />
                                        </div>

                                        <div className="hx-field-group" style={{ gridColumn: '1 / -1' }}>
                                            <label htmlFor="rental-desc">Mô tả tổng quan về khu trọ</label>
                                            <textarea id="rental-desc" name="description" placeholder="Vị trí thuận tiện, an ninh 24/7, gần trường đại học nào, tiện ích chung..." />
                                        </div>
                                    </div>

                                    <div className="hx-actions" style={{ marginTop: 24 }}>
                                        <button className="hx-button" disabled={busy} type="submit">
                                            Lưu Nhà trọ mới
                                        </button>
                                        <button type="button" className="hx-outline-button" onClick={() => setMode('list')}>
                                            Hủy bỏ
                                        </button>
                                    </div>
                                </form>
                            </section>
                        )}

                        {/* ── TAB 3: THÊM / CẬP NHẬT PHÒNG TRỌ (GIAO DIỆN FORM ĐẦY ĐỦ) ── */}
                        {mode === 'room' && (
                            <form key={selected?.id ?? 'new'} onSubmit={handleSaveRoom}>
                                {/* Banner callout when no rentals exist */}
                                {!selected && rentals.length === 0 && (
                                    <div className="hx-inspector-callout" style={{ background: '#FFFBEB', borderColor: '#FDE68A', marginBottom: 24 }}>
                                        <AlertCircle size={28} color="#D97706" style={{ flexShrink: 0 }} />
                                        <div>
                                            <h3 style={{ color: '#B45309' }}>Bạn chưa có Nhà trọ nào!</h3>
                                            <p style={{ color: '#92400E', margin: '4px 0 12px' }}>
                                                Mỗi phòng trọ phải thuộc một Nhà trọ/Tòa nhà để có địa chỉ và quận/huyện xác thực. Vui lòng tạo Nhà trọ trước.
                                            </p>
                                            <button type="button" className="hx-button" onClick={() => setMode('rental')}>
                                                <Home size={16} /> Tạo nhà trọ ngay
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Header & Intro */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 24, color: '#0F172A', fontWeight: 800 }}>
                                            {selected ? `Cập nhật phòng: ${selected.roomName}` : 'Đăng & Thêm phòng trọ mới'}
                                        </h2>
                                        <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
                                            Điền chi tiết thông tin, phụ phí minh bạch và tải ảnh theo 5 góc chuẩn để được gắn nhãn kiểm định 100%.
                                        </p>
                                    </div>

                                    {/* Quick Templates Bar */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                                            <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
                                            Gợi ý mẫu nhanh:
                                        </span>
                                        {QUICK_SAMPLE_SETS.map(sample => (
                                            <button
                                                key={sample.name}
                                                type="button"
                                                className="hx-photo-action-btn"
                                                onClick={() => applySampleSet(sample.urls)}
                                                title="Tự động điền 5 ảnh mẫu chuẩn cho phòng này"
                                            >
                                                {sample.name.split(':')[1]?.trim() || sample.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SECTION 1: THÔNG TIN CƠ BẢN */}
                                <div className="hx-form-section">
                                    <div className="hx-form-section-header">
                                        <div>
                                            <h3 className="hx-form-section-title">
                                                <Home size={19} color="#10B981" /> 1. Thông tin cơ bản & Nhà trọ liên kết
                                            </h3>
                                            <p className="hx-form-section-desc">Gắn phòng vào khu trọ và đặt tên nhận diện dễ tìm</p>
                                        </div>
                                    </div>

                                    <div className="hx-grid-3">
                                        {!selected && (
                                            <div className="hx-field-group">
                                                <label htmlFor="room-rental">Thuộc Nhà trọ / Khu trọ (*)</label>
                                                <select id="room-rental" name="rentalId" required defaultValue={rentals[0]?.id || ''}>
                                                    <option value="" disabled>-- Chọn nhà trọ của bạn --</option>
                                                    {rentals.map(r => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.title} ({r.district || 'TP.HCM'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="hx-field-group" style={selected ? { gridColumn: 'span 2' } : {}}>
                                            <label htmlFor="room-name">Tên phòng / Số phòng (*)</label>
                                            <input
                                                id="room-name"
                                                name="roomName"
                                                required
                                                maxLength={100}
                                                defaultValue={selected?.roomName}
                                                placeholder="VD: Căn hộ Studio Ban Công - P.302"
                                            />
                                            <span className="hx-hint">Tên rõ ràng giúp người thuê dễ nhận diện</span>
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="room-type">Mô hình cho thuê (*)</label>
                                            <select id="room-type" name="roomType" defaultValue={selected?.roomType ?? 'STUDIO'}>
                                                <option value="STUDIO">Căn hộ Studio (Khép kín, bếp riêng)</option>
                                                <option value="PRIVATE">Phòng riêng khép kín</option>
                                                <option value="SHARED">Ở ghép / Ký túc xá Coliving</option>
                                                <option value="APARTMENT">Căn hộ mini / Căn hộ dịch vụ</option>
                                            </select>
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="room-size">Diện tích sử dụng (*)</label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-size"
                                                    name="sizeM2"
                                                    type="number"
                                                    min={1}
                                                    step="0.1"
                                                    required
                                                    defaultValue={selected?.sizeM2 ?? 32}
                                                    placeholder="VD: 32"
                                                />
                                                <span className="hx-input-suffix">m²</span>
                                            </div>
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="room-max">Số người ở tối đa (*)</label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-max"
                                                    name="maxPeople"
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    required
                                                    defaultValue={selected?.maxPeople ?? 2}
                                                    placeholder="VD: 2"
                                                />
                                                <span className="hx-input-suffix">người</span>
                                            </div>
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="room-cycle">Kỳ đóng tiền phòng</label>
                                            <select id="room-cycle" name="paymentCycleMonths" defaultValue={selected?.costs?.paymentCycleMonths ?? 1}>
                                                <option value={1}>1 tháng / lần</option>
                                                <option value={2}>2 tháng / lần</option>
                                                <option value={3}>3 tháng / lần</option>
                                                <option value={6}>6 tháng / lần</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: GIÁ THUÊ & PHỤ PHÍ MINH BẠCH */}
                                <div className="hx-form-section">
                                    <div className="hx-form-section-header">
                                        <div>
                                            <h3 className="hx-form-section-title">
                                                <Banknote size={19} color="#10B981" /> 2. Giá thuê & Bảng phụ phí minh bạch (Cam kết không phí ẩn)
                                            </h3>
                                            <p className="hx-form-section-desc">Đơn vị: VNĐ. Điền đúng chỉ số thực tế để Inspector đối chiếu và cấp chứng nhận</p>
                                        </div>
                                    </div>

                                    <div className="hx-grid-3">
                                        {/* Giá thuê chính */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-price">Giá thuê niêm yết (*)</label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-price"
                                                    name="price"
                                                    type="number"
                                                    min={100000}
                                                    required
                                                    value={formPrice}
                                                    onChange={e => setFormPrice(e.target.value)}
                                                    placeholder="VD: 4500000"
                                                />
                                                <span className="hx-input-suffix">đ / tháng</span>
                                            </div>
                                            {Boolean(Number(formPrice)) && (
                                                <span className="hx-live-money">
                                                    👉 {money(Number(formPrice))} / tháng
                                                </span>
                                            )}
                                        </div>

                                        {/* Tiền cọc */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-deposit">Tiền đặt cọc</label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-deposit"
                                                    name="deposit"
                                                    type="number"
                                                    min={0}
                                                    value={formDeposit}
                                                    onChange={e => setFormDeposit(e.target.value)}
                                                    placeholder="VD: 4500000"
                                                />
                                                <span className="hx-input-suffix">đ</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                <button
                                                    type="button"
                                                    className="hx-photo-action-btn"
                                                    onClick={() => setFormDeposit(formPrice)}
                                                >
                                                    = 1 tháng cọc
                                                </button>
                                                {Boolean(Number(formDeposit)) && (
                                                    <span className="hx-live-money">
                                                        👉 {money(Number(formDeposit))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tiền điện */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-elec">
                                                <Zap size={14} color="#F59E0B" /> Giá điện (* công tơ riêng)
                                            </label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-elec"
                                                    name="electricityPerKwh"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={selected?.costs?.electricityPerKwh ?? 3500}
                                                    placeholder="VD: 3500"
                                                />
                                                <span className="hx-input-suffix">đ / kWh</span>
                                            </div>
                                        </div>

                                        {/* Tiền nước */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-water">
                                                <Droplets size={14} color="#0284C7" /> Giá nước
                                            </label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-water"
                                                    name="waterPerM3"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={selected?.costs?.waterPerM3 ?? 20000}
                                                    placeholder="VD: 20000"
                                                />
                                                <span className="hx-input-suffix">đ / m³</span>
                                            </div>
                                        </div>

                                        {/* Internet */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-net">
                                                <Wifi size={14} color="#10B981" /> Phí Internet / Wifi
                                            </label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-net"
                                                    name="internetMonthly"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={selected?.costs?.internetMonthly ?? 100000}
                                                    placeholder="0 nếu miễn phí"
                                                />
                                                <span className="hx-input-suffix">đ / tháng</span>
                                            </div>
                                        </div>

                                        {/* Phí gửi xe */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-parking">
                                                <Car size={14} color="#6366F1" /> Phí giữ xe máy
                                            </label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-parking"
                                                    name="parkingMonthly"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={selected?.costs?.parkingMonthly ?? 120000}
                                                    placeholder="0 nếu miễn phí"
                                                />
                                                <span className="hx-input-suffix">đ / xe</span>
                                            </div>
                                        </div>

                                        {/* Dịch vụ / Quản lý */}
                                        <div className="hx-field-group">
                                            <label htmlFor="room-service">Phí quản lý & dịch vụ chung</label>
                                            <div className="hx-input-wrap has-suffix">
                                                <input
                                                    id="room-service"
                                                    name="serviceMonthly"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={selected?.costs?.serviceMonthly ?? 100000}
                                                    placeholder="Vệ sinh, rác, thang máy"
                                                />
                                                <span className="hx-input-suffix">đ / phòng</span>
                                            </div>
                                        </div>

                                        {/* Ghi chú phụ phí */}
                                        <div className="hx-field-group" style={{ gridColumn: 'span 2' }}>
                                            <label htmlFor="room-feenotes">Ghi chú cụ thể về cách tính phụ phí</label>
                                            <input
                                                id="room-feenotes"
                                                name="feeNotes"
                                                maxLength={2000}
                                                defaultValue={selected?.costs?.feeNotes ?? ''}
                                                placeholder="VD: Điện nước chốt số vào ngày 30 hàng tháng; xe máy tối đa 2 chiếc/phòng..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: TIỆN NGHI CÓ SẴN (CHECKLIST TƯƠNG TÁC) */}
                                <div className="hx-form-section">
                                    <div className="hx-form-section-header">
                                        <div>
                                            <h3 className="hx-form-section-title">
                                                <Sparkles size={19} color="#10B981" /> 3. Danh mục tiện nghi có sẵn trong phòng
                                            </h3>
                                            <p className="hx-form-section-desc">Nhấp chọn các tiện ích phòng của bạn đã trang bị (Inspector sẽ kiểm tra thực tế)</p>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                                            Đã chọn: {formAmenities.length} tiện nghi
                                        </span>
                                    </div>

                                    <div className="hx-amenities-grid">
                                        {POPULAR_AMENITIES.map(item => {
                                            const active = formAmenities.includes(item);
                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    className={`hx-amenity-chip ${active ? 'active' : ''}`}
                                                    onClick={() => toggleAmenity(item)}
                                                >
                                                    {active ? <CheckCircle2 size={15} /> : <Plus size={14} />}
                                                    <span>{item}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* SECTION 4: BỘ KHUNG ẢNH CHUẨN KIỂM ĐỊNH */}
                                <div className="hx-form-section">
                                    <div className="hx-form-section-header">
                                        <div>
                                            <h3 className="hx-form-section-title">
                                                <Camera size={19} color="#10B981" /> 4. Bộ khung ảnh chuẩn kiểm định & Thư viện ảnh mẫu gợi ý
                                            </h3>
                                            <p className="hx-form-section-desc">
                                                5 khung ảnh bắt buộc để Inspector đối chiếu. Bấm "Dùng ảnh mẫu gợi ý" để tham khảo hoặc dán link ảnh thật của bạn.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 5 Core Inspection Photo Slots */}
                                    <div className="hx-photo-slots-grid">
                                        {INSPECTION_SLOTS.map(slot => {
                                            const val = slotPhotos[slot.key] || '';
                                            return (
                                                <div key={slot.key} className="hx-photo-slot">
                                                    <div className="hx-photo-slot-header">
                                                        <h4 className="hx-photo-slot-title">{slot.title}</h4>
                                                        <span className={`hx-photo-slot-badge ${slot.required ? 'req' : 'opt'}`}>
                                                            {slot.required ? 'Bắt buộc' : 'Khuyên có'}
                                                        </span>
                                                    </div>

                                                    <p style={{ fontSize: 11, color: '#64748B', margin: 0, minHeight: 32 }}>
                                                        {slot.desc}
                                                    </p>

                                                    <div className="hx-photo-preview">
                                                        {val ? (
                                                            <img
                                                                src={val}
                                                                alt={slot.title}
                                                                onError={(e) => {
                                                                    (e.currentTarget as HTMLImageElement).src = slot.sampleUrl;
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="hx-photo-placeholder">
                                                                <ImageIcon size={32} />
                                                                <span>Chưa có ảnh</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="url"
                                                        value={val}
                                                        onChange={e => setSlotPhotos({ ...slotPhotos, [slot.key]: e.target.value })}
                                                        placeholder="Dán link ảnh (https://...)"
                                                        style={{ fontSize: 12, padding: '8px 10px' }}
                                                    />

                                                    <div className="hx-photo-actions">
                                                        <button
                                                            type="button"
                                                            className="hx-photo-action-btn"
                                                            onClick={() => setSlotPhotos({ ...slotPhotos, [slot.key]: slot.sampleUrl })}
                                                        >
                                                            ✨ Dùng ảnh mẫu gợi ý
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="hx-photo-action-btn"
                                                            onClick={() => setSampleModalImage({ title: slot.title, url: slot.sampleUrl, tip: slot.tip })}
                                                        >
                                                            <Eye size={12} /> Xem mẫu
                                                        </button>
                                                        {val && (
                                                            <button
                                                                type="button"
                                                                className="hx-photo-action-btn danger"
                                                                onClick={() => setSlotPhotos({ ...slotPhotos, [slot.key]: '' })}
                                                            >
                                                                <Trash2 size={12} /> Xóa
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Khung ảnh bổ sung */}
                                    <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                                                    📸 Khung thêm ảnh bổ sung (Hành lang, bãi xe, thang máy, view ban công...)
                                                </h4>
                                                <span style={{ fontSize: 12, color: '#64748B' }}>
                                                    Thêm ảnh để người thuê thấy toàn diện không gian sống
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="hx-outline-button"
                                                style={{ minHeight: 36, fontSize: 12 }}
                                                onClick={() => setExtraPhotos([...extraPhotos, ''])}
                                            >
                                                <Plus size={14} /> Thêm khung ảnh mới
                                            </button>
                                        </div>

                                        {extraPhotos.length === 0 ? (
                                            <div style={{ background: '#F8FAF9', borderRadius: 12, padding: '16px 20px', border: '1px dashed #CBD5E1', fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>Chưa có ảnh phụ nào. Bấm "Thêm khung ảnh mới" nếu bạn muốn bổ sung thêm ảnh khu vực chung.</span>
                                                <button
                                                    type="button"
                                                    className="hx-link"
                                                    onClick={() => setExtraPhotos(['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80'])}
                                                >
                                                    + Thêm ảnh bãi xe / hành lang mẫu
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                                                {extraPhotos.map((imgUrl, idx) => (
                                                    <div key={idx} className="hx-photo-slot" style={{ background: '#fff' }}>
                                                        <div className="hx-photo-slot-header">
                                                            <span style={{ fontSize: 12, fontWeight: 700 }}>Ảnh bổ sung #{idx + 1}</span>
                                                            <button
                                                                type="button"
                                                                className="hx-photo-action-btn danger"
                                                                onClick={() => setExtraPhotos(extraPhotos.filter((_, i) => i !== idx))}
                                                            >
                                                                <Trash2 size={12} /> Xóa
                                                            </button>
                                                        </div>

                                                        <div className="hx-photo-preview" style={{ height: 130 }}>
                                                            {imgUrl ? (
                                                                <img src={imgUrl} alt={`Ảnh phụ ${idx + 1}`} />
                                                            ) : (
                                                                <span style={{ fontSize: 11, color: '#94A3B8' }}>Dán link ảnh bên dưới</span>
                                                            )}
                                                        </div>

                                                        <input
                                                            type="url"
                                                            value={imgUrl}
                                                            onChange={e => {
                                                                const updated = [...extraPhotos];
                                                                updated[idx] = e.target.value;
                                                                setExtraPhotos(updated);
                                                            }}
                                                            placeholder="https://..."
                                                            style={{ fontSize: 12, padding: '8px 10px' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION 5: MÔ TẢ & NỘI QUY */}
                                <div className="hx-form-section">
                                    <div className="hx-form-section-header">
                                        <div>
                                            <h3 className="hx-form-section-title">
                                                <FileText size={19} color="#10B981" /> 5. Mô tả chi tiết & Nội quy phòng trọ
                                            </h3>
                                            <p className="hx-form-section-desc">Mô tả rõ ràng giúp giảm thiểu 80% câu hỏi trùng lặp từ người thuê</p>
                                        </div>
                                    </div>

                                    <div className="hx-grid-2">
                                        <div className="hx-field-group">
                                            <label htmlFor="room-desc">Mô tả chi tiết phòng trọ</label>
                                            <textarea
                                                id="room-desc"
                                                name="description"
                                                rows={5}
                                                defaultValue={selected?.description ?? ''}
                                                placeholder="Vị trí phòng (gần trường ĐH nào, mặt tiền hay hẻm xe hơi), ánh sáng tự nhiên, môi trường sống xung quanh, có ban công thoáng mát..."
                                            />
                                        </div>

                                        <div className="hx-field-group">
                                            <label htmlFor="room-rules">Nội quy & Giờ giấc phòng trọ</label>
                                            <textarea
                                                id="room-rules"
                                                name="houseRules"
                                                rows={5}
                                                maxLength={2000}
                                                defaultValue={selected?.costs?.houseRules ?? ''}
                                                placeholder="Giờ mở/đóng cửa, quy định bạn bè đến chơi, chính sách nuôi thú cưng, giữ gìn vệ sinh chung, không làm ồn sau 23h..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 6: GỬI YÊU CẦU INSPECTOR */}
                                <div className="hx-inspector-callout">
                                    <div className="hx-inspector-callout-icon">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                            <div>
                                                <h3>Đăng ký Kiểm định viên (Inspector) đến thẩm định căn phòng</h3>
                                                <p>
                                                    Phòng trọ có xác minh tại chỗ sẽ được gắn huy hiệu <strong>✅ ĐÃ ĐỐI CHIẾU 100%</strong>,
                                                    tăng gấp 3 lần lượt xem và được cam kết bảo vệ uy tín cho chủ nhà.
                                                </p>
                                            </div>

                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#fff', padding: '8px 16px', borderRadius: 999, border: '1.5px solid #10B981', fontWeight: 700, fontSize: 13, color: '#065F46' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={requestInspectorOnCreate}
                                                    onChange={e => setRequestInspectorOnCreate(e.target.checked)}
                                                    style={{ width: 16, height: 16, accentColor: '#10B981' }}
                                                />
                                                Gửi yêu cầu Inspector ngay khi lưu
                                            </label>
                                        </div>

                                        {requestInspectorOnCreate && (
                                            <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginTop: 14, border: '1px solid #BBF7D0' }}>
                                                <div className="hx-grid-3">
                                                    <div className="hx-field-group">
                                                        <label htmlFor="inspect-date"><Calendar size={14} color="#059669" /> Ngày mong muốn đón Inspector</label>
                                                        <input
                                                            id="inspect-date"
                                                            type="date"
                                                            value={inspectDate}
                                                            onChange={e => setInspectDate(e.target.value)}
                                                            min={new Date().toISOString().split('T')[0]}
                                                        />
                                                    </div>

                                                    <div className="hx-field-group">
                                                        <label htmlFor="inspect-slot"><Clock size={14} color="#059669" /> Khung giờ thuận tiện</label>
                                                        <select
                                                            id="inspect-slot"
                                                            value={inspectTimeSlot}
                                                            onChange={e => setInspectTimeSlot(e.target.value)}
                                                        >
                                                            <option value="Sáng (8:30 - 11:30)">Sáng (8:30 - 11:30)</option>
                                                            <option value="Chiều (13:30 - 17:00)">Chiều (13:30 - 17:00)</option>
                                                            <option value="Cả ngày (Liên hệ trước 30p)">Cả ngày (Liên hệ trước 30p)</option>
                                                            <option value="Cuối tuần (Thứ 7 / CN)">Cuối tuần (Thứ 7 / CN)</option>
                                                        </select>
                                                    </div>

                                                    <div className="hx-field-group">
                                                        <label htmlFor="inspect-phone"><Phone size={14} color="#059669" /> SĐT Hotline chủ trọ đón tiếp</label>
                                                        <input
                                                            id="inspect-phone"
                                                            type="tel"
                                                            value={inspectPhone}
                                                            onChange={e => setInspectPhone(e.target.value)}
                                                            placeholder="VD: 0908 123 456"
                                                        />
                                                    </div>

                                                    <div className="hx-field-group" style={{ gridColumn: 'span 3' }}>
                                                        <label htmlFor="inspect-note">Ghi chú cho Inspector (Chỉ đường, gửi xe, dặn bảo vệ...)</label>
                                                        <input
                                                            id="inspect-note"
                                                            value={inspectNotes}
                                                            onChange={e => setInspectNotes(e.target.value)}
                                                            placeholder="VD: Gọi trước khi đến 15 phút, chìa khóa phòng gửi bảo vệ tại cổng chính..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Form Submit Actions */}
                                <div className="hx-actions" style={{ marginTop: 28, gap: 14 }}>
                                    <button
                                        type="submit"
                                        className="hx-button"
                                        disabled={busy || (!selected && rentals.length === 0)}
                                        style={{ minWidth: 240, minHeight: 46, fontSize: 15 }}
                                    >
                                        <CheckCircle2 size={18} /> {selected ? 'Cập nhật thông tin phòng' : 'Hoàn tất & Đăng phòng trọ'}
                                    </button>
                                    <button
                                        type="button"
                                        className="hx-outline-button"
                                        onClick={() => { setMode('list'); setSelected(null); }}
                                    >
                                        Hủy & Quay lại danh sách
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── TAB 4: MODERATOR/STAFF INSPECTION LOGGING ── */}
                        {mode === 'inspection' && selected && (
                            <form className="hx-panel" onSubmit={(e) => {
                                e.preventDefault();
                                const data = new FormData(e.currentTarget);
                                void action(() => request(`/rooms/${selected.id}/inspections`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        category: data.get('category'),
                                        result: data.get('result'),
                                        inspectedOn: data.get('inspectedOn'),
                                        validUntil: data.get('validUntil') || null,
                                        method: data.get('method'),
                                        findings: data.get('findings'),
                                        evidenceImages: String(data.get('evidenceImages') || '').split('\n').map(s => s.trim()).filter(Boolean)
                                    })
                                }), 'Đã lưu kết quả kiểm định phòng thành công.');
                            }}>
                                <h2>Ghi biên bản kiểm định: {selected.roomName}</h2>
                                <p>Dành riêng cho nhân viên Inspector của HexRoom. Đối chiếu thực tế hiện trạng, công tơ và lưu ảnh bằng chứng.</p>
                                <div className="hx-grid-2">
                                    <div className="hx-field-group">
                                        <label htmlFor="insp-cat">Hạng mục kiểm tra</label>
                                        <select id="insp-cat" name="category">
                                            {Object.entries(inspectionCategories).map(([k, label]) => (
                                                <option key={k} value={k}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="hx-field-group">
                                        <label htmlFor="insp-res">Kết luận kiểm tra</label>
                                        <select id="insp-res" name="result">
                                            {Object.entries(inspectionStatuses).map(([k, label]) => (
                                                <option key={k} value={k}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="hx-field-group">
                                        <label htmlFor="insp-date">Ngày kiểm tra (*)</label>
                                        <input id="insp-date" type="date" name="inspectedOn" required max={new Date().toISOString().split('T')[0]} />
                                    </div>

                                    <div className="hx-field-group">
                                        <label htmlFor="insp-until">Có hiệu lực đến ngày</label>
                                        <input id="insp-until" type="date" name="validUntil" />
                                    </div>

                                    <div className="hx-field-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="insp-method">Phương pháp đối chiếu (*)</label>
                                        <textarea id="insp-method" name="method" required maxLength={2000} placeholder="VD: Khảo sát tại chỗ, dùng thiết bị kiểm tra công tơ, chụp ảnh đối chiếu..." />
                                    </div>

                                    <div className="hx-field-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="insp-findings">Kết quả chi tiết, sai lệch (nếu có) (*)</label>
                                        <textarea id="insp-findings" name="findings" required maxLength={4000} placeholder="VD: Công tơ điện hoạt động chuẩn xác, chỉ số bắt đầu chốt là 0142 kWh..." />
                                    </div>

                                    <div className="hx-field-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="insp-evidence">Ảnh bằng chứng đối chiếu (mỗi dòng 1 link URL)</label>
                                        <textarea id="insp-evidence" name="evidenceImages" placeholder="https://..." />
                                    </div>
                                </div>

                                <div className="hx-actions" style={{ marginTop: 24 }}>
                                    <button className="hx-button" disabled={busy} type="submit">
                                        Lưu biên bản kiểm định
                                    </button>
                                    <button type="button" className="hx-outline-button" onClick={() => setMode('list')}>
                                        Hủy bỏ
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </main>

            {/* ── MODAL: CHI TIẾT PHÒNG TRỌ TOÀN DIỆN (NỀN TRẮNG SANG TRỌNG) ── */}
            {detailModalRoom && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={() => setDetailModalRoom(null)}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 860,
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 24,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '92vh',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 24px',
                                borderBottom: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Eye size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        {detailModalRoom.roomName}
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        Mã phòng: <strong style={{ color: '#0F172A' }}>{detailModalRoom.id}</strong> · {detailModalRoom.rentalTitle}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: getStatusConfig(detailModalRoom.status).bg, color: getStatusConfig(detailModalRoom.status).text, border: `1px solid ${getStatusConfig(detailModalRoom.status).border}` }}>
                                    {getStatusConfig(detailModalRoom.status).label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDetailModalRoom(null)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 6,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        color: '#64748B',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* 1. PHOTO GALLERY (5 GÓC CHUẨN KIỂM ĐỊNH) */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 750, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Camera size={14} style={{ color: '#059669' }} /> Hình ảnh căn phòng ({detailModalRoom.images?.length || 1} ảnh)
                                    </span>
                                    <span style={{ fontSize: 11, color: '#64748B' }}>
                                        Góc {detailImageIndex + 1}/{detailModalRoom.images?.length || 1}: {INSPECTION_SLOTS[detailImageIndex]?.title || 'Ảnh chi tiết'}
                                    </span>
                                </div>

                                {/* Main Active Image */}
                                <div style={{ width: '100%', height: 320, borderRadius: 16, overflow: 'hidden', background: '#0F172A', position: 'relative' }}>
                                    <img
                                        src={detailModalRoom.images && detailModalRoom.images[detailImageIndex] ? detailModalRoom.images[detailImageIndex] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200'}
                                        alt={detailModalRoom.roomName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                                        {INSPECTION_SLOTS[detailImageIndex]?.title || `Ảnh số ${detailImageIndex + 1}`}
                                    </div>
                                </div>

                                {/* Thumbnails Strip */}
                                {detailModalRoom.images && detailModalRoom.images.length > 1 && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                                        {detailModalRoom.images.map((url, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setDetailImageIndex(idx)}
                                                style={{
                                                    width: 76,
                                                    height: 56,
                                                    borderRadius: 8,
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    cursor: 'pointer',
                                                    border: detailImageIndex === idx ? '2px solid #10B981' : '1px solid #CBD5E1',
                                                    opacity: detailImageIndex === idx ? 1 : 0.65,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <img src={url} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2. CÁC THÔNG SỐ CƠ BẢN CỦA PHÒNG */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 750, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>
                                    Thông số kỹ thuật & Vị trí phòng
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                                    <div>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Diện tích sử dụng:</span>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{detailModalRoom.sizeM2 ?? 30} m²</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Sức chứa tối đa:</span>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{detailModalRoom.maxPeople ?? 2} người</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Loại mô hình:</span>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                                            {detailModalRoom.roomType === 'STUDIO' ? 'Studio khép kín' : detailModalRoom.roomType === 'PRIVATE' ? 'Phòng riêng' : detailModalRoom.roomType === 'SHARED' ? 'Ở ghép KTX' : 'Căn hộ mini'}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 12, color: '#64748B' }}>Chu kỳ thanh toán:</span>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                                            {detailModalRoom.costs?.paymentCycleMonths ?? 1} tháng / lần
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0', fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={15} style={{ color: '#059669', flexShrink: 0 }} />
                                    <span><strong>Địa chỉ:</strong> {detailModalRoom.address}, {detailModalRoom.district}, {detailModalRoom.city}</span>
                                </div>
                                {detailModalRoom.description && (
                                    <div style={{ marginTop: 10, fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <strong>Mô tả:</strong> {detailModalRoom.description}
                                    </div>
                                )}
                            </div>

                            {/* 3. BẢNG PHỤ PHÍ & CHI PHÍ MINH BẠCH 100% */}
                            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 750, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Banknote size={15} /> Bảng kê chi phí minh bạch 100% (Cam kết không phí ẩn)
                                    </h4>
                                    <span style={{ padding: '3px 8px', borderRadius: 6, background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 750 }}>
                                        Chuẩn HexRoom Verified
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Giá thuê phòng niêm yết</span>
                                        <strong style={{ fontSize: 17, color: '#059669' }}>{money(detailModalRoom.price)}/tháng</strong>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Tiền đặt cọc</span>
                                        <strong style={{ fontSize: 15, color: '#0F172A' }}>{money(detailModalRoom.costs?.deposit || detailModalRoom.price)}</strong>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>⚡ Giá điện (công tơ riêng)</span>
                                        <strong style={{ fontSize: 15, color: '#0F172A' }}>{money(detailModalRoom.costs?.electricityPerKwh || 3500)} /kWh</strong>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>💧 Giá nước sinh hoạt</span>
                                        <strong style={{ fontSize: 15, color: '#0F172A' }}>{money(detailModalRoom.costs?.waterPerM3 || 20000)} /m³</strong>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>📶 Phí Internet / Wifi</span>
                                        <strong style={{ fontSize: 14, color: '#0F172A' }}>{money(detailModalRoom.costs?.internetMonthly || 100000)} /tháng</strong>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>🛵 Phí giữ xe máy</span>
                                        <strong style={{ fontSize: 14, color: '#0F172A' }}>{money(detailModalRoom.costs?.parkingMonthly || 120000)} /xe/tháng</strong>
                                    </div>
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #BBF7D0' }}>
                                        <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>🧹 Dịch vụ & Quản lý</span>
                                        <strong style={{ fontSize: 14, color: '#0F172A' }}>{money(detailModalRoom.costs?.serviceMonthly || 100000)} /phòng/tháng</strong>
                                    </div>
                                </div>

                                {detailModalRoom.costs?.feeNotes && (
                                    <p style={{ fontSize: 12, color: '#065F46', margin: '10px 0 0', lineHeight: 1.5 }}>
                                        💡 <strong>Ghi chú phụ phí:</strong> {detailModalRoom.costs.feeNotes}
                                    </p>
                                )}
                            </div>

                            {/* 4. TIỆN NGHI CÓ SẴN */}
                            {detailModalRoom.amenities && detailModalRoom.amenities.length > 0 && (
                                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 750, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>
                                        Danh sách tiện nghi đã trang bị ({detailModalRoom.amenities.length})
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {detailModalRoom.amenities.map(amenity => (
                                            <span
                                                key={amenity}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 14px',
                                                    borderRadius: 999,
                                                    background: '#F1F5F9',
                                                    border: '1px solid #E2E8F0',
                                                    color: '#334155',
                                                    fontSize: 12,
                                                    fontWeight: 650,
                                                }}
                                            >
                                                <CheckCircle2 size={13} style={{ color: '#059669' }} /> {amenity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 5. NỘI QUY PHÒNG */}
                            {detailModalRoom.costs?.houseRules && (
                                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: 18, fontSize: 13, color: '#92400E' }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 750, margin: '0 0 6px', textTransform: 'uppercase' }}>
                                        Nội quy & Giờ giấc phòng trọ
                                    </h4>
                                    <p style={{ margin: 0, lineHeight: 1.6 }}>{detailModalRoom.costs.houseRules}</p>
                                </div>
                            )}

                            {/* 6. LỊCH HẸN XEM PHÒNG TỪ KHÁCH THUÊ */}
                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 750, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={15} style={{ color: '#059669' }} /> Danh sách khách đặt lịch hẹn xem phòng ({getBookingsForRoom(detailModalRoom).length})
                                    </h4>
                                </div>

                                {getBookingsForRoom(detailModalRoom).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {getBookingsForRoom(detailModalRoom).map((bk) => (
                                            <div
                                                key={bk.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 16px',
                                                    borderRadius: 12,
                                                    background: '#F8FAFC',
                                                    border: '1px solid #E2E8F0',
                                                    flexWrap: 'wrap',
                                                    gap: 10
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 750, fontSize: 13, color: '#0F172A' }}>
                                                        Khách hẹn: {bk.landlordName || 'Khách thuê HexRoom'}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#065F46', fontWeight: 650, marginTop: 2 }}>
                                                        📅 Ngày hẹn: <strong>{bk.appointmentDate || 'Sắp tới'}</strong> {bk.appointmentTime && `(${bk.appointmentTime})`}
                                                    </div>
                                                    {bk.notes && (
                                                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                                            Ghi chú: {bk.notes}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {bk.landlordPhone && (
                                                        <a
                                                            href={`tel:${bk.landlordPhone}`}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: 8,
                                                                background: '#ECFDF5',
                                                                color: '#059669',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <Phone size={12} /> {bk.landlordPhone}
                                                        </a>
                                                    )}
                                                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: bk.status === 'completed' ? '#EFF6FF' : '#ECFDF5', color: bk.status === 'completed' ? '#1E40AF' : '#065F46' }}>
                                                        {bk.status === 'completed' ? '✅ Đã xem' : '🟢 Sắp tới'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 10, textAlign: 'center', fontSize: 12, color: '#64748B' }}>
                                        Chưa có lịch hẹn xem phòng nào cho căn phòng này. Khách thuê đặt lịch sẽ tự động hiển thị tại đây.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 10,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Đổi trạng thái:</span>
                                <select
                                    value={detailModalRoom.status}
                                    onChange={e => handleQuickStatusChange(detailModalRoom.id, e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="AVAILABLE">🟢 Đang cho thuê</option>
                                    <option value="RENTED">🔵 Đã có người thuê</option>
                                    <option value="MAINTENANCE">🟠 Đang bảo trì</option>
                                    <option value="PENDING">🟡 Chờ duyệt</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Link
                                    to={`/room/${detailModalRoom.id}`}
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: 10,
                                        background: '#FFFFFF',
                                        color: '#334155',
                                        border: '1px solid #CBD5E1',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    Xem trên web ↗
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const r = detailModalRoom;
                                        setDetailModalRoom(null);
                                        setSelected(r);
                                        setMode('room');
                                    }}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: 10,
                                        background: '#10B981',
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                    }}
                                >
                                    Chỉnh sửa thông tin
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDetailModalRoom(null)}
                                    style={{
                                        padding: '9px 20px',
                                        borderRadius: 10,
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: YÊU CẦU INSPECTOR RIÊNG CHO PHÒNG (KHI BẤM TỪ DANH SÁCH) ── */}
            {inspectionTargetRoom && (
                <div className="hx-modal-backdrop" onClick={() => setInspectionTargetRoom(null)}>
                    <div className="hx-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, background: '#FFFFFF', borderRadius: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, color: '#0F172A', fontWeight: 800 }}>
                                        Yêu cầu Kiểm định viên (Inspector)
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        Phòng: <strong>{inspectionTargetRoom.roomName}</strong> ({inspectionTargetRoom.rentalTitle})
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="hx-photo-action-btn"
                                onClick={() => setInspectionTargetRoom(null)}
                                style={{ padding: 6, borderRadius: 8 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={submitInspectionRequest}>
                            <div style={{ background: '#F8FAF9', borderRadius: 14, padding: 14, marginBottom: 20, border: '1px solid #E2E8F0', fontSize: 13, color: '#334155' }}>
                                <strong style={{ color: '#065F46', display: 'block', marginBottom: 6 }}>
                                    🎯 Quyền lợi của chủ trọ khi được kiểm định:
                                </strong>
                                <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7, color: '#475569' }}>
                                    <li>Cấp huy hiệu <strong>ĐÃ ĐỐI CHIẾU 100%</strong> trên toàn hệ thống HexRoom</li>
                                    <li>Chốt số công tơ điện nước ban đầu để không xảy ra tranh chấp</li>
                                    <li>Ưu tiên hiển thị top đầu cho hơn 50,000+ sinh viên & người đi làm</li>
                                </ul>
                            </div>

                            <div className="hx-grid-1">
                                <div className="hx-field-group">
                                    <label htmlFor="modal-date">
                                        <Calendar size={14} color="#059669" /> Ngày mong muốn đón tiếp Inspector (*)
                                    </label>
                                    <input
                                        id="modal-date"
                                        type="date"
                                        required
                                        value={inspectDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setInspectDate(e.target.value)}
                                    />
                                </div>

                                <div className="hx-field-group">
                                    <label htmlFor="modal-slot">
                                        <Clock size={14} color="#059669" /> Khung giờ đón tiếp thuận tiện (*)
                                    </label>
                                    <select
                                        id="modal-slot"
                                        value={inspectTimeSlot}
                                        onChange={e => setInspectTimeSlot(e.target.value)}
                                    >
                                        <option value="Sáng (8:30 - 11:30)">Sáng (8:30 - 11:30)</option>
                                        <option value="Chiều (13:30 - 17:00)">Chiều (13:30 - 17:00)</option>
                                        <option value="Cả ngày (Báo trước 30 phút)">Cả ngày (Báo trước 30 phút)</option>
                                        <option value="Cuối tuần (Thứ 7 / CN)">Cuối tuần (Thứ 7 / CN)</option>
                                    </select>
                                </div>

                                <div className="hx-field-group">
                                    <label htmlFor="modal-phone">
                                        <Phone size={14} color="#059669" /> Số điện thoại chủ trọ liên hệ (*)
                                    </label>
                                    <input
                                        id="modal-phone"
                                        type="tel"
                                        required
                                        value={inspectPhone}
                                        onChange={e => setInspectPhone(e.target.value)}
                                        placeholder="VD: 0908 123 456"
                                    />
                                </div>

                                <div className="hx-field-group">
                                    <label>Các hạng mục đề nghị kiểm tra đối chiếu:</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                                        {[
                                            ['CONDITION', 'Hiện trạng & nội thất phòng'],
                                            ['PRICE_AND_FEES', 'Giá thuê & các khoản phụ phí'],
                                            ['IMAGES', 'Xác thực hình ảnh & công tơ'],
                                            ['RENTAL_RIGHTS', 'Quyền cho thuê & an ninh']
                                        ].map(([code, title]) => (
                                            <label
                                                key={code}
                                                style={{
                                                    fontSize: 12,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    background: inspectScope.includes(code) ? '#ECFDF5' : '#F1F5F9',
                                                    border: `1px solid ${inspectScope.includes(code) ? '#10B981' : '#E2E8F0'}`,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={inspectScope.includes(code)}
                                                    onChange={e => {
                                                        if (e.target.checked) setInspectScope([...inspectScope, code]);
                                                        else setInspectScope(inspectScope.filter(c => c !== code));
                                                    }}
                                                    style={{ width: 14, height: 14, accentColor: '#10B981' }}
                                                />
                                                <span style={{ fontWeight: 600, color: '#334155' }}>{title}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="hx-field-group">
                                    <label htmlFor="modal-notes">Ghi chú thêm cho điều phối viên</label>
                                    <textarea
                                        id="modal-notes"
                                        rows={3}
                                        value={inspectNotes}
                                        onChange={e => setInspectNotes(e.target.value)}
                                        placeholder="VD: Chìa khóa gửi tại phòng bảo vệ, có thể đến kiểm tra bất cứ lúc nào trong khung giờ..."
                                    />
                                </div>
                            </div>

                            <div className="hx-actions" style={{ marginTop: 24, justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    className="hx-outline-button"
                                    onClick={() => setInspectionTargetRoom(null)}
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    className="hx-button"
                                    disabled={busy}
                                >
                                    <ShieldCheck size={16} /> Gửi yêu cầu Inspector ngay
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: XEM ẢNH MẪU PHÓNG TO ── */}
            {sampleModalImage && (
                <div className="hx-modal-backdrop" onClick={() => setSampleModalImage(null)}>
                    <div className="hx-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                                {sampleModalImage.title} (Ảnh mẫu chuẩn HexRoom)
                            </h3>
                            <button
                                type="button"
                                className="hx-photo-action-btn"
                                onClick={() => setSampleModalImage(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ width: '100%', height: 380, borderRadius: 14, overflow: 'hidden', background: '#000', marginBottom: 14 }}>
                            <img
                                src={sampleModalImage.url}
                                alt={sampleModalImage.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 12, fontSize: 13, color: '#065F46' }}>
                            <strong>💡 Mẹo chụp từ Inspector:</strong> {sampleModalImage.tip}
                        </div>

                        <div className="hx-actions" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="hx-button"
                                onClick={() => setSampleModalImage(null)}
                            >
                                Đã hiểu cách chụp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
