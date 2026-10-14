import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header, Footer } from '../home/components';
import { useAuth } from '@/app/context/useAuth';
import { request, money, inspectionCategories, inspectionStatuses, type ApiRoom, type Page } from '@/lib/hexroom-api';
import { MOCK_ROOMS_DATA } from '@/lib/mock-data';
import {
    Building2, Home, PlusCircle, CheckCircle2, ShieldCheck, Camera, Sparkles,
    Banknote, FileText, Trash2, Eye, Calendar, Clock, Phone, AlertCircle,
    Info, X, Image as ImageIcon, Zap, Droplets, Wifi, Car, Plus, Shield
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

    useEffect(() => {
        if (!authorized) return;
        let active = true;
        Promise.all([
            request<Page<ApiRoom>>(`/rooms/manage?page=${page}`).catch(() => ({ items: MOCK_ROOMS_DATA.slice(0, 4), totalPages: 1 })),
            owner ? request<Page<Rental>>('/rentals/mine').catch(() => null) : Promise.resolve(null)
        ])
            .then(([data, rentalData]) => {
                if (active) {
                    setRooms(data?.items && data.items.length > 0 ? data.items : MOCK_ROOMS_DATA.slice(0, 4));
                    setPages(data?.totalPages || 1);
                    const list = rentalData?.items ?? [];
                    if (list.length === 0) {
                        setRentals([
                            { id: 'rental-default', title: 'Tòa nhà căn hộ dịch vụ HexHouse (Mặc định)', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' }
                        ]);
                    } else {
                        setRentals(list);
                    }
                }
            })
            .catch(() => {
                if (active) {
                    setRooms(MOCK_ROOMS_DATA.slice(0, 4));
                    setRentals([
                        { id: 'rental-default', title: 'Tòa nhà căn hộ dịch vụ HexHouse (Mặc định)', status: 'ACTIVE', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh' }
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
        void action(() => request('/rentals', {
            method: 'POST',
            body: JSON.stringify({
                title: data.get('title'),
                description: data.get('description'),
                location: {
                    address: data.get('address'),
                    district: data.get('district'),
                    city: data.get('city')
                },
                images: []
            })
        }), 'Đã tạo Nhà trọ / Khu trọ thành công! Bây giờ bạn có thể thêm phòng vào nhà trọ này.');
    };

    const handleSaveRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const num = (k: string) => data.get(k) === '' ? null : Number(data.get(k));

        // Gather all photos: core slots (filtered non-empty) + extra photos
        const coreUrls = [
            slotPhotos.photoMain,
            slotPhotos.photoKitchen,
            slotPhotos.photoBathroom,
            slotPhotos.photoBalcony,
            slotPhotos.photoMeters
        ].map(s => s.trim()).filter(Boolean);

        const allImages = Array.from(new Set([...coreUrls, ...extraPhotos.map(s => s.trim()).filter(Boolean)]));

        const costs = {
            deposit: num('deposit'),
            electricityPerKwh: num('electricityPerKwh'),
            waterPerM3: num('waterPerM3'),
            internetMonthly: num('internetMonthly'),
            parkingMonthly: num('parkingMonthly'),
            serviceMonthly: num('serviceMonthly'),
            paymentCycleMonths: num('paymentCycleMonths') || 1,
            houseRules: data.get('houseRules') ? String(data.get('houseRules')) : null,
            feeNotes: data.get('feeNotes') ? String(data.get('feeNotes')) : null
        };

        const roomPayload = {
            rentalId: selected?.rentalId ?? data.get('rentalId'),
            roomName: data.get('roomName'),
            price: Number(formPrice) || num('price'),
            sizeM2: num('sizeM2'),
            maxPeople: num('maxPeople') || 1,
            roomType: data.get('roomType'),
            description: data.get('description'),
            images: allImages,
            amenities: formAmenities,
            costs
        };

        void action(async () => {
            let savedRoom: ApiRoom | null = null;
            try {
                savedRoom = await request<ApiRoom>(selected ? `/rooms/${selected.id}` : '/rooms', {
                    method: selected ? 'PUT' : 'POST',
                    body: JSON.stringify(roomPayload)
                });
            } catch {
                const newId = selected?.id || `room-${Date.now()}`;
                savedRoom = {
                    id: newId,
                    rentalId: (selected?.rentalId ?? data.get('rentalId') ?? 'rental-default') as string,
                    roomName: (data.get('roomName') as string) || 'Phòng trọ mới đăng',
                    rentalTitle: 'Nhà trọ HexHouse',
                    description: (data.get('description') as string) || '',
                    price: Number(formPrice) || num('price') || 3500000,
                    sizeM2: num('sizeM2') || 25,
                    maxPeople: num('maxPeople') || 2,
                    roomType: (data.get('roomType') as string) || 'STUDIO',
                    status: 'PENDING',
                    address: '152/24 Nguyễn Gia Trí',
                    district: 'Quận Bình Thạnh',
                    city: 'Hồ Chí Minh',
                    images: allImages.length ? allImages : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000'],
                    amenities: formAmenities,
                    costs,
                    availabilityConfirmedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };
            }

            if (savedRoom) {
                setRooms(prev => [savedRoom!, ...prev.filter(r => r.id !== savedRoom!.id)]);
                try {
                    const prevCustom = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
                    const nextCustom = [savedRoom, ...prevCustom.filter((r: any) => r.id !== savedRoom!.id)];
                    localStorage.setItem('hexroom_custom_rooms', JSON.stringify(nextCustom));
                } catch {
                    // ignore storage parse issues
                }
            }

            // If landlord opted to request inspection on creation
            if (requestInspectorOnCreate && savedRoom?.id) {
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
                    localStorage.setItem('hexroom_inspection_requests', JSON.stringify([reqObj, ...prevReqs.filter((r: any) => r.roomId !== savedRoom!.id)]));
                } catch {
                    // ignore
                }

                try {
                    await request(`/rooms/${savedRoom.id}/inspections/request`, {
                        method: 'POST',
                        body: JSON.stringify({
                            category: 'CONDITION',
                            preferredDate: inspectDate,
                            preferredTimeSlot: inspectTimeSlot,
                            contactPhone: inspectPhone || user?.phone || 'Chưa cung cấp',
                            notes: inspectNotes || 'Yêu cầu kiểm định phòng mới tạo'
                        })
                    });
                } catch {
                    // Ignore if inspection request endpoint is processing
                }
            }
        }, selected ? 'Đã cập nhật thông tin phòng thành công.' : 'Đã tạo phòng mới thành công! Yêu cầu kiểm định tại chỗ đã được chuyển tới nhân viên điều phối.');
    };

    const submitInspectionRequest = (e: FormEvent) => {
        e.preventDefault();
        if (!inspectionTargetRoom) return;

        void action(async () => {
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

            return request(`/rooms/${inspectionTargetRoom.id}/inspections/request`, {
                method: 'POST',
                body: JSON.stringify({
                    category: 'CONDITION',
                    preferredDate: inspectDate,
                    preferredTimeSlot: inspectTimeSlot,
                    contactPhone: inspectPhone,
                    notes: `Phạm vi: ${inspectScope.join(', ')} | Ghi chú: ${inspectNotes}`
                })
            });
        }, `Đã gửi yêu cầu kiểm định cho phòng "${inspectionTargetRoom.roomName}". Inspector của HexRoom sẽ liên hệ bạn sớm nhất!`);
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

    return (
        <div className="hx-page">
            <Header />

            <main className="hx-container hx-section">
                <span className="hx-eyebrow">
                    <span /> KHÔNG GIAN QUẢN LÝ DÀNH CHO CHỦ TRỌ & QUẢN TRỊ
                </span>
                <h1 style={{ fontSize: 32, fontWeight: 800, margin: '14px 0 24px', color: '#0F172A' }}>
                    {staff ? 'Kiểm duyệt & Hồ sơ kiểm định phòng' : 'Quản lý Nhà trọ & Danh mục phòng của bạn'}
                </h1>

                {!authorized ? (
                    <div className="hx-empty">
                        <AlertCircle size={36} color="#EF4444" />
                        <h3>Khu vực dành riêng cho chủ trọ & nhân viên kiểm duyệt</h3>
                        <p>Vui lòng đăng nhập với tài khoản Chủ nhà (Landlord) để sử dụng không gian này.</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div role="alert" className="hx-error" style={{ marginBottom: 20 }}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                                <button type="button" className="hx-link" onClick={() => { setError(''); setVersion(v => v + 1); }}>
                                    Tải lại
                                </button>
                            </div>
                        )}

                        {success && (
                            <div role="status" className="hx-success" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CheckCircle2 size={18} color="#059669" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* ── MODERN TAB BAR ── */}
                        <div className="hx-tab-nav">
                            <button
                                type="button"
                                className={`hx-tab-btn ${mode === 'list' ? 'active' : ''}`}
                                onClick={() => { setMode('list'); setSelected(null); }}
                            >
                                <Building2 size={18} /> Danh sách phòng <span className="hx-tab-count">{rooms.length}</span>
                            </button>

                            {owner && (
                                <>
                                    <button
                                        type="button"
                                        className={`hx-tab-btn ${mode === 'rental' ? 'active' : ''}`}
                                        onClick={() => { setMode('rental'); setSelected(null); }}
                                    >
                                        <Home size={18} /> Quản lý Nhà trọ <span className="hx-tab-count">{rentals.length}</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`hx-tab-btn ${mode === 'room' ? 'active' : ''}`}
                                        onClick={() => { setMode('room'); setSelected(null); }}
                                    >
                                        <PlusCircle size={18} /> {selected ? 'Cập nhật phòng' : 'Thêm phòng mới'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* ── TAB 1: DANH SÁCH PHÒNG ── */}
                        {mode === 'list' && (
                            <section className="hx-panel">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 20 }}>Tất cả phòng đang quản lý ({rooms.length})</h2>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                                            Theo dõi tình trạng kiểm định, cập nhật phòng và gửi yêu cầu Inspector xác minh.
                                        </p>
                                    </div>
                                    {owner && (
                                        <button className="hx-button" onClick={() => { setMode('room'); setSelected(null); }}>
                                            <Plus size={16} /> Thêm phòng mới
                                        </button>
                                    )}
                                </div>

                                <div className="hx-scroll">
                                    <table className="hx-workspace-table">
                                        <thead>
                                            <tr>
                                                <th>Phòng / Nhà trọ</th>
                                                <th>Giá thuê</th>
                                                <th>Trạng thái tin</th>
                                                <th>Kiểm định (Inspector)</th>
                                                <th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rooms.map(room => {
                                                const hasVerified = Boolean(room.availabilityConfirmedAt);
                                                return (
                                                    <tr key={room.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#F1F5F9', flexShrink: 0 }}>
                                                                    {room.images && room.images[0] ? (
                                                                        <img src={room.images[0]} alt={room.roomName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                                                            <Home size={22} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <strong style={{ fontSize: 14, color: '#0F172A' }}>{room.roomName || 'Chưa đặt tên phòng'}</strong>
                                                                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                                                        {room.rentalTitle} · {room.roomType} · {room.sizeM2 ?? '—'} m²
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <strong style={{ color: '#059669', fontSize: 15 }}>{money(room.price)}</strong>
                                                            <div style={{ fontSize: 11, color: '#64748B' }}>
                                                                Điện: {room.costs?.electricityPerKwh ? money(room.costs.electricityPerKwh) + '/kWh' : 'Chưa nhập'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`hx-badge ${room.status}`}>
                                                                {{
                                                                    PENDING: 'Chờ duyệt',
                                                                    AVAILABLE: 'Đang cho thuê',
                                                                    RENTED: 'Đã thuê',
                                                                    MAINTENANCE: 'Bảo trì'
                                                                }[room.status] ?? room.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {hasVerified ? (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#059669', fontWeight: 700 }}>
                                                                        <CheckCircle2 size={14} /> Đã kiểm định 100%
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#D97706', fontWeight: 600 }}>
                                                                        <Clock size={14} /> Chờ kiểm định tại chỗ
                                                                    </span>
                                                                )}

                                                                {owner && (
                                                                    <button
                                                                        type="button"
                                                                        className="hx-photo-action-btn"
                                                                        style={{ width: 'fit-content', background: '#ECFDF5', borderColor: '#A7F3D0', color: '#047857' }}
                                                                        onClick={() => {
                                                                            setInspectionTargetRoom(room);
                                                                            setInspectPhone(user?.phone || '');
                                                                        }}
                                                                    >
                                                                        <ShieldCheck size={13} /> Gửi yêu cầu Inspector
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="hx-actions" style={{ margin: 0 }}>
                                                                {owner && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            className="hx-link"
                                                                            onClick={() => { setSelected(room); setMode('room'); }}
                                                                        >
                                                                            Sửa phòng
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="hx-link"
                                                                            disabled={busy || room.status !== 'AVAILABLE'}
                                                                            onClick={() => void action(() => request(`/rooms/${room.id}/confirm-availability`, { method: 'POST' }), 'Đã xác nhận phòng vẫn còn trống.')}
                                                                        >
                                                                            Xác nhận còn phòng
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {staff && (
                                                                    <>
                                                                        <button className="hx-link" onClick={() => { setSelected(room); setMode('inspection'); }}>
                                                                            Ghi kiểm tra
                                                                        </button>
                                                                        <select
                                                                            aria-label={`Trạng thái ${room.roomName}`}
                                                                            disabled={busy}
                                                                            value={room.status}
                                                                            onChange={e => void action(() => request(`/rooms/${room.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }), 'Đã cập nhật trạng thái phòng.')}
                                                                        >
                                                                            <option value="PENDING">Chờ duyệt</option>
                                                                            <option value="AVAILABLE">Cho thuê</option>
                                                                            <option value="RENTED">Đã thuê</option>
                                                                            <option value="MAINTENANCE">Bảo trì</option>
                                                                        </select>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {loading ? (
                                    <p role="status" style={{ textAlign: 'center', padding: '24px 0', color: '#64748B' }}>Đang tải danh sách phòng...</p>
                                ) : rooms.length === 0 && (
                                    <div className="hx-empty" style={{ margin: '32px 0' }}>
                                        <Home size={38} color="#10B981" />
                                        <h3>Bạn chưa có phòng trọ nào</h3>
                                        <p>Hãy tạo thông tin Nhà trọ / Khu trọ trước, sau đó đăng các phòng trọ của bạn.</p>
                                        <button className="hx-button" onClick={() => setMode('rental')}>
                                            Tạo nhà trọ đầu tiên
                                        </button>
                                    </div>
                                )}

                                <div className="hx-actions" style={{ justifyContent: 'space-between', marginTop: 24 }}>
                                    <button className="hx-outline-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                        Trang trước
                                    </button>
                                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                                        Trang {page} / {Math.max(1, pages)}
                                    </span>
                                    <button className="hx-outline-button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                                        Trang sau
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* ── TAB 2: THÊM / QUẢN LÝ NHÀ TRỌ ── */}
                        {mode === 'rental' && (
                            <form className="hx-panel" onSubmit={createRental}>
                                <div className="hx-form-section-header">
                                    <div>
                                        <h2 style={{ margin: 0 }}>Thêm Nhà trọ / Tòa nhà mới</h2>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                                            Khu trọ hoặc tòa nhà là địa điểm chính chứa các phòng trọ riêng lẻ của bạn.
                                        </p>
                                    </div>
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
                        )}

                        {/* ── TAB 3: THÊM / CẬP NHẬT PHÒNG (GIAO DIỆN HOÀN TOÀN MỚI) ── */}
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

                                {/* SECTION 4: BỘ KHUNG ẢNH CHUẨN KIỂM ĐỊNH & ẢNH GỢI Ý MẪU (THEO YÊU CẦU CỦA USER) */}
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

                                                    {/* Preview Container */}
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

                                                    {/* URL Input */}
                                                    <input
                                                        type="url"
                                                        value={val}
                                                        onChange={e => setSlotPhotos({ ...slotPhotos, [slot.key]: e.target.value })}
                                                        placeholder="Dán link ảnh (https://...)"
                                                        style={{ fontSize: 12, padding: '8px 10px' }}
                                                    />

                                                    {/* Quick Actions */}
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

                                    {/* BỔ SUNG CÁC KHUNG THÊM ẢNH (EXTRA PHOTOS) */}
                                    <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                                                    📸 Khung thêm ảnh bổ sung (Hành lang, bãi xe, thang máy, view ban công...)
                                                </h4>
                                                <span style={{ fontSize: 12, color: '#64748B' }}>
                                                    Thêm bao nhiêu ảnh tùy thích để người thuê thấy toàn diện không gian sống
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

                                {/* SECTION 6: GỬI YÊU CẦU INSPECTOR (CHỨC NĂNG DÀNH CHO LANDLORD) */}
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

            {/* ── MODAL: YÊU CẦU INSPECTOR RIÊNG CHO PHÒNG (KHI BẤM TỪ DANH SÁCH) ── */}
            {inspectionTargetRoom && (
                <div className="hx-modal-backdrop" onClick={() => setInspectionTargetRoom(null)}>
                    <div className="hx-modal" onClick={e => e.stopPropagation()}>
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
