import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MapPin, House, ClipboardCheck, Calendar, CheckCircle2,
    ShieldCheck, Clock, User, Phone, Mail, FileText, ArrowRight,
    X, MessageCircle, AlertTriangle, Sparkles, Send, Check
} from 'lucide-react';
import { Header, Footer } from '../home/components';
import { RoomFavoriteButton } from '@/app/components/RoomFavoriteButton';
import { useAuth } from '@/app/context/useAuth';
import { useChatBox } from '@/app/context/useChatBox';
import { request, money, inspectionCategories, inspectionStatuses, type ApiRoom, type Inspection, type RoomCosts } from '@/lib/hexroom-api';
import { MOCK_ROOMS_DATA } from '@/lib/mock-data';
import { createRentalRequest, type RentalRequest } from '@/app/features/rentalManagement/requests/requests-storage';
import type { Booking } from '@/app/features/booking-history/types';

const costLabels: [keyof RoomCosts, string][] = [
    ['deposit', 'Tiền cọc'],
    ['electricityPerKwh', 'Điện / kWh'],
    ['waterPerM3', 'Nước / m³'],
    ['internetMonthly', 'Internet / tháng'],
    ['parkingMonthly', 'Gửi xe / tháng'],
    ['serviceMonthly', 'Dịch vụ / tháng']
];

export function RoomTransparencyPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const chatBox = useChatBox();

    const [room, setRoom] = useState<ApiRoom | null>(null);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [people, setPeople] = useState(1);
    const [electricity, setElectricity] = useState(0);
    const [water, setWater] = useState(0);

    // Booking modal state
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
    const [bookingType, setBookingType] = useState<'VIEWING' | 'RESERVE'>('VIEWING');

    const [bookingDate, setBookingDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [bookingTimeSlot, setBookingTimeSlot] = useState('Sáng (08:30 - 11:30)');
    const [occupantsCount, setOccupantsCount] = useState(1);
    const [tenantName, setTenantName] = useState(user?.fullName || '');
    const [tenantPhone, setTenantPhone] = useState(user?.phone || '');
    const [tenantEmail, setTenantEmail] = useState(user?.email || '');
    const [tenantNotes, setTenantNotes] = useState('');
    const [leaseMonths, setLeaseMonths] = useState<'6' | '12'>('6');
    const [agreeTerms, setAgreeTerms] = useState(true);
    const [confirmedBookingId, setConfirmedBookingId] = useState('');
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

    useEffect(() => {
        if (user) {
            if (!tenantName && user.fullName) setTenantName(user.fullName);
            if (!tenantPhone && user.phone) setTenantPhone(user.phone);
            if (!tenantEmail && user.email) setTenantEmail(user.email);
        }
    }, [user, tenantName, tenantPhone, tenantEmail]);

    useEffect(() => {
        let active = true;
        const mock = MOCK_ROOMS_DATA.find((r) => r.id === id);
        if (mock) {
            setRoom(mock);
            setInspections([
                {
                    id: 'insp-1',
                    category: 'CONDITION',
                    result: 'CHECKED',
                    currentResult: 'CHECKED',
                    inspectedOn: '10/10/2026',
                    validUntil: '10/04/2027',
                    method: 'Kiểm tra trực tiếp tại phòng, kiểm tra hệ thống điện nước và cửa sổ',
                    findings: 'Phòng mới, tường không ẩm mốc, máy lạnh hoạt động tốt, nước cấp mạnh.',
                    evidenceImages: mock.images.slice(0, 2),
                    recordedAt: '2026-10-10T10:00:00Z',
                },
                {
                    id: 'insp-2',
                    category: 'PRICE_AND_FEES',
                    result: 'CHECKED',
                    currentResult: 'CHECKED',
                    inspectedOn: '10/10/2026',
                    validUntil: '10/04/2027',
                    method: 'Đối chiếu hóa đơn điện nước tháng gần nhất và biểu phí chủ nhà',
                    findings: 'Giá thuê đúng niêm yết, đồng hồ điện nước riêng biệt, không phát sinh phụ phí ngầm.',
                    evidenceImages: [],
                    recordedAt: '2026-10-10T10:00:00Z',
                },
                {
                    id: 'insp-3',
                    category: 'IMAGES',
                    result: 'CHECKED',
                    currentResult: 'CHECKED',
                    inspectedOn: '10/10/2026',
                    validUntil: '10/04/2027',
                    method: 'Chụp ảnh thực tế 360 độ góc rộng',
                    findings: 'Ảnh chụp khớp 100% với hiện trạng thực tế.',
                    evidenceImages: mock.images.slice(1, 3),
                    recordedAt: '2026-10-10T10:00:00Z',
                },
                {
                    id: 'insp-4',
                    category: 'RENTAL_RIGHTS',
                    result: 'CHECKED',
                    currentResult: 'CHECKED',
                    inspectedOn: '10/10/2026',
                    validUntil: '10/10/2027',
                    method: 'Kiểm tra giấy tờ chủ quyền nhà và hợp đồng ủy quyền quản lý',
                    findings: 'Chính chủ cho thuê hợp pháp, có đăng ký tạm trú đầy đủ.',
                    evidenceImages: [],
                    recordedAt: '2026-10-10T10:00:00Z',
                },
            ]);
            setLoading(false);
            return;
        }

        Promise.all([request<ApiRoom>(`/rooms/${id}`), request<Inspection[]>(`/rooms/${id}/inspections`)])
            .then(([data, records]) => { if (active) { setRoom(data); setInspections(records); } })
            .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id]);

    const costs = room?.costs;
    const fixedFees = ['internetMonthly', 'parkingMonthly', 'serviceMonthly'] as const;
    const unknown = fixedFees.filter(key => costs?.[key] == null).length + (costs?.electricityPerKwh == null ? 1 : 0) + (costs?.waterPerM3 == null ? 1 : 0);
    const estimate = Number(room?.price ?? 0) + fixedFees.reduce((sum, key) => sum + Number(costs?.[key] ?? 0), 0) + electricity * Number(costs?.electricityPerKwh ?? 0) + water * Number(costs?.waterPerM3 ?? 0);

    const openBookingModal = (type: 'VIEWING' | 'RESERVE') => {
        setBookingType(type);
        setBookingStep(1);
        setBookingModalOpen(true);
    };

    const handleContactLandlord = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (chatBox) {
            chatBox.openChatWith('landlord-demo');
        } else {
            navigate('/chat');
        }
    };

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!room) return;
        setIsSubmittingBooking(true);

        const newBookingId = `HXR-BOOK-${Date.now().toString().slice(-6)}`;
        const depositVal = Number(room.costs?.deposit || room.price);

        // 1. Lưu vào danh sách đơn của Tenant (cho /history)
        const newBooking: Booking = {
            id: newBookingId,
            roomId: room.id,
            roomName: room.roomName || room.rentalTitle,
            propertyName: room.rentalTitle || 'Tòa nhà HexRoom',
            propertyImage: room.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            address: [room.address, room.district, room.city].filter(Boolean).join(', '),
            landlordName: 'Chủ nhà HexRoom',
            startDate: bookingDate,
            endDate: new Date(Date.now() + Number(leaseMonths) * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
            status: 'active',
            hasReview: false,
            canReview: true,
        };

        const existingRaw = localStorage.getItem('hexroom_local_bookings');
        const existingList: Booking[] = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem('hexroom_local_bookings', JSON.stringify([newBooking, ...existingList]));

        // 2. Lưu vào danh sách yêu cầu của Landlord (cho /rental-management/requests)
        const newRentalRequest: RentalRequest = {
            id: newBookingId,
            userId: user?.id || 'guest-user',
            roomId: room.id,
            sourceType: 'PREORDER',
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            depositAmount: depositVal,
            createdAt: new Date().toISOString(),
            user: {
                id: user?.id || 'guest-user',
                fullName: tenantName || 'Khách thuê HexRoom',
                email: tenantEmail || 'tenant@hexroom.vn',
                phone: tenantPhone || '0901234567',
            },
            room: {
                id: room.id,
                room_name: room.roomName || room.rentalTitle,
                price: room.price,
            },
            rental: {
                id: room.rentalId || 'rental-001',
                title: room.rentalTitle || 'Tòa nhà HexRoom',
            },
        };

        await createRentalRequest(newRentalRequest);

        setIsSubmittingBooking(false);
        setConfirmedBookingId(newBookingId);
        setBookingStep(3);
    };

    return (
        <div className="hx-page">
            <Header />

            <main className="hx-container hx-section">
                <Link className="hx-text-link" to="/rooms">
                    <ArrowLeft size={16} /> Danh sách phòng
                </Link>

                {loading ? (
                    <div className="hx-empty" role="status">Đang tải thông tin phòng…</div>
                ) : error || !room ? (
                    <div className="hx-error" role="alert">{error || 'Không tìm thấy phòng'}</div>
                ) : (
                    <>
                        <div className="hx-section-heading">
                            <div>
                                <h1 style={{ fontSize: 34, fontWeight: 700, marginTop: 24 }}>
                                    {room.roomName || room.rentalTitle}
                                </h1>
                                <p>
                                    <MapPin size={14} style={{ display: 'inline' }} /> {[room.address, room.district, room.city].filter(Boolean).join(', ')}
                                </p>
                            </div>
                            <RoomFavoriteButton
                                favoritePayload={{
                                    id: room.id,
                                    name: room.roomName,
                                    price: room.price,
                                    area: room.sizeM2 ?? 0,
                                    image: room.images[0] ?? '',
                                    address: room.address,
                                    available: true,
                                }}
                            />
                        </div>

                        {/* Gallery */}
                        <div className="hx-gallery">
                            {room.images.length ? (
                                room.images.map((url) => (
                                    <img
                                        key={url}
                                        src={url}
                                        alt={`Ảnh do chủ trọ cung cấp: ${room.roomName}`}
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80';
                                        }}
                                    />
                                ))
                            ) : (
                                <div className="hx-empty" style={{ width: '100%' }}>
                                    <House />Chủ trọ chưa cung cấp ảnh
                                </div>
                            )}
                        </div>
                        <p style={{ fontSize: 12, color: '#70806b' }}>
                            Ảnh do chủ trọ cung cấp · Ảnh kiểm tra thực tế đối chiếu được hiển thị riêng trong hồ sơ bên dưới.
                        </p>

                        <div className="hx-detail-grid">
                            {/* Left column: Information & Inspection Checklist */}
                            <div>
                                <section className="hx-panel">
                                    <h2>Thông tin căn phòng</h2>
                                    <div className="hx-actions">
                                        <span className="hx-badge">{room.sizeM2 ?? 'Chưa cung cấp'} m²</span>
                                        <span className="hx-badge">Tối đa {room.maxPeople} người</span>
                                        {room.amenities.map((name) => (
                                            <span className="hx-badge" key={name}>{name}</span>
                                        ))}
                                    </div>
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{room.description || 'Chưa có mô tả.'}</p>
                                    <p>
                                        Ngày chủ trọ xác nhận còn phòng:{' '}
                                        <strong>
                                            {room.availabilityConfirmedAt ? new Date(room.availabilityConfirmedAt).toLocaleDateString('vi-VN') : 'Chưa xác nhận'}
                                        </strong>
                                    </p>
                                    <h3>Nội quy phòng trọ</h3>
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{costs?.houseRules || 'Giữ gìn trật tự sau 23h00, đảm bảo vệ sinh chung.'}</p>
                                </section>

                                {/* 4-Step Inspection Profile (Core HexRoom Value) */}
                                <section className="hx-panel">
                                    <h2>
                                        <ClipboardCheck size={22} style={{ display: 'inline', marginRight: 8, color: '#10B981' }} />
                                        Hồ sơ kiểm định thực tế (Inspection Report)
                                    </h2>
                                    <p>
                                        Kết quả được nhân viên HexRoom kiểm tra trực tiếp tại chỗ theo 4 danh mục chuẩn. Việc duyệt đăng tin không thay thế kiểm tra thực tế.
                                    </p>
                                    {Object.entries(inspectionCategories).map(([category, label]) => {
                                        const records = inspections.filter((item) => item.category === category);
                                        const latest = records[0];
                                        return (
                                            <article className="hx-inspection" key={category}>
                                                <h3>
                                                    {label}
                                                    <span className={'hx-badge ' + (latest?.currentResult ?? '')}>
                                                        {inspectionStatuses[latest?.currentResult ?? 'NOT_CHECKED']}
                                                    </span>
                                                </h3>
                                                {latest ? (
                                                    <>
                                                        <small>
                                                            Kiểm tra: {latest.inspectedOn} · Hiệu lực đến: {latest.validUntil ?? 'Không áp dụng'}
                                                        </small>
                                                        <p>
                                                            <strong>Phương pháp:</strong> {latest.method}
                                                            <br />
                                                            <strong>Kết quả và giới hạn:</strong> {latest.findings}
                                                        </p>
                                                        <div className="hx-evidence">
                                                            {latest.evidenceImages.map((url) => (
                                                                <a key={url} href={url} target="_blank" rel="noreferrer">
                                                                    <img src={url} alt={`Bằng chứng ${label}`} loading="lazy" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                        {records.length > 1 && (
                                                            <details>
                                                                <summary style={{ marginTop: 16, cursor: 'pointer' }}>
                                                                    Lịch sử ({records.length - 1} lần trước)
                                                                </summary>
                                                                {records.slice(1).map((record) => (
                                                                    <p key={record.id}>
                                                                        <strong>{record.inspectedOn} · {inspectionStatuses[record.result]}</strong>
                                                                        <br />
                                                                        {record.method}
                                                                        <br />
                                                                        {record.findings}
                                                                        <br />
                                                                        {record.evidenceImages.map((url, i) => (
                                                                            <a key={url} href={url} target="_blank" rel="noreferrer">Ảnh {i + 1} </a>
                                                                        ))}
                                                                    </p>
                                                                ))}
                                                            </details>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p>Chưa có hồ sơ đối chiếu cho hạng mục này.</p>
                                                )}
                                            </article>
                                        );
                                    })}
                                    <Link className="hx-text-link" to="/how-it-works">
                                        Xem quy trình 4 bước và cách đọc kết quả →
                                    </Link>
                                </section>
                            </div>

                            {/* Right column: Costs & HexRoom Booking CTA */}
                            <aside>
                                <section className="hx-panel">
                                    <span className="hx-eyebrow">GIÁ THUÊ HẰNG THÁNG</span>
                                    <div className="hx-calc-result">{money(room.price)}</div>
                                    <p>Thông tin giá và phí do chủ trọ cung cấp và đã đối chiếu.</p>

                                    {costLabels.map(([key, label]) => (
                                        <div className="hx-cost-row" key={key}>
                                            <span>{label}</span>
                                            <strong>{money(costs?.[key] as number | null)}</strong>
                                        </div>
                                    ))}

                                    <div className="hx-cost-row">
                                        <span>Kỳ thanh toán</span>
                                        <strong>{costs?.paymentCycleMonths ? `${costs.paymentCycleMonths} tháng` : '1 tháng'}</strong>
                                    </div>
                                    <p>{costs?.feeNotes || 'Không có phụ phí phát sinh nào ngoài biểu phí trên.'}</p>

                                    {/* ── FLOW ĐẶT PHÒNG / GIỮ CHỖ CHUẨN HEXROOM ── */}
                                    <div className="hx-booking-cta-panel">
                                        <button
                                            type="button"
                                            className="hx-button"
                                            style={{
                                                width: '100%',
                                                padding: '13px 18px',
                                                fontSize: '15px',
                                                fontWeight: 800,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: 8,
                                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                                            }}
                                            onClick={() => openBookingModal('VIEWING')}
                                        >
                                            <Calendar size={18} /> Đặt lịch hẹn xem phòng trực tiếp
                                        </button>

                                        <button
                                            type="button"
                                            className="hx-outline-button"
                                            style={{
                                                width: '100%',
                                                padding: '12px 18px',
                                                fontSize: '14px',
                                                fontWeight: 750,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: 8,
                                                borderColor: '#10B981',
                                                color: '#059669',
                                                background: '#ECFDF5'
                                            }}
                                            onClick={() => openBookingModal('RESERVE')}
                                        >
                                            <CheckCircle2 size={18} color="#10B981" /> Đăng ký giữ chỗ & Hợp đồng mẫu
                                        </button>

                                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                            <button
                                                type="button"
                                                className="hx-outline-button"
                                                style={{ flex: 1, padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                onClick={handleContactLandlord}
                                            >
                                                <MessageCircle size={15} color="#10B981" /> Nhắn tin chủ trọ
                                            </button>
                                            <a
                                                href="tel:0987654321"
                                                className="hx-outline-button"
                                                style={{ padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                                            >
                                                <Phone size={15} color="#10B981" /> Gọi điện
                                            </a>
                                        </div>

                                        <div className="hx-booking-trust-note">
                                            <ShieldCheck size={20} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                                            <div>
                                                <strong>Quy trình thuê phòng chuẩn an toàn:</strong><br />
                                                HexRoom hỗ trợ đặt hẹn và hợp đồng mẫu minh bạch. Nền tảng không giữ tiền cọc. Quý khách chỉ thanh toán cọc sau khi kiểm tra phòng thực tế và ký kết biên bản.
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Cost Estimation Calculator */}
                                <section className="hx-panel">
                                    <h2>Ước tính chi phí ở chung</h2>
                                    <div className="hx-fields">
                                        <label>
                                            Số người chia đều
                                            <input
                                                type="number"
                                                min={1}
                                                max={room.maxPeople}
                                                value={people}
                                                onChange={(e) => setPeople(Math.max(1, Math.min(room.maxPeople, Number(e.target.value) || 1)))}
                                            />
                                        </label>
                                        <label>
                                            Điện dùng chung (kWh)
                                            <input
                                                type="number"
                                                min={0}
                                                value={electricity}
                                                onChange={(e) => setElectricity(Math.max(0, Number(e.target.value) || 0))}
                                            />
                                        </label>
                                        <label>
                                            Nước dùng chung (m³)
                                            <input
                                                type="number"
                                                min={0}
                                                value={water}
                                                onChange={(e) => setWater(Math.max(0, Number(e.target.value) || 0))}
                                            />
                                        </label>
                                    </div>
                                    <div className="hx-calc-result">
                                        {money(Math.round(estimate / people))}
                                        <small style={{ fontSize: 12 }}> / người / tháng</small>
                                    </div>
                                    <p>
                                        {unknown
                                            ? `Tạm tính từ khoản đã biết; còn ${unknown} khoản phí chưa có dữ liệu. Chưa phải tổng chi phí đầy đủ.`
                                            : 'Ước tính chia đều từ mức sử dụng bạn nhập.'}
                                        {' '}Tiền cọc tính riêng. Phí gửi xe hiện tính một suất; hãy đối chiếu ghi chú và thống nhất cách chia với các thành viên.
                                    </p>
                                </section>
                            </aside>
                        </div>
                    </>
                )}
            </main>

            {/* ── HEXROOM COMPREHENSIVE BOOKING & SMART LEASE MODAL ── */}
            {bookingModalOpen && room && (
                <div className="hx-modal-backdrop" onClick={() => !isSubmittingBooking && setBookingModalOpen(false)}>
                    <div className="hx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <span className="hx-eyebrow">QUY TRÌNH THUÊ PHÒNG AN TOÀN HEXROOM</span>
                                <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                                    {bookingStep === 1 ? '1. Đặt lịch hẹn & Thông tin người thuê' :
                                     bookingStep === 2 ? '2. Minh bạch chi phí & Hợp đồng thuê mẫu' :
                                     '3. Hoàn tất & Xác nhận đặt phòng'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                className="hx-carousel-btn"
                                style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#64748B' }}
                                onClick={() => setBookingModalOpen(false)}
                                aria-label="Đóng modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="hx-booking-steps">
                            <div className={`hx-booking-step-item ${bookingStep === 1 ? 'active' : bookingStep > 1 ? 'completed' : ''}`}>
                                <span className="hx-booking-step-num">1</span>
                                <span>Lịch hẹn</span>
                            </div>
                            <div style={{ flex: 1, height: 2, background: bookingStep > 1 ? '#10B981' : '#E2E8F0', margin: '0 8px' }} />
                            <div className={`hx-booking-step-item ${bookingStep === 2 ? 'active' : bookingStep > 2 ? 'completed' : ''}`}>
                                <span className="hx-booking-step-num">2</span>
                                <span>Hợp đồng & Phí</span>
                            </div>
                            <div style={{ flex: 1, height: 2, background: bookingStep > 2 ? '#10B981' : '#E2E8F0', margin: '0 8px' }} />
                            <div className={`hx-booking-step-item ${bookingStep === 3 ? 'completed' : ''}`}>
                                <span className="hx-booking-step-num">3</span>
                                <span>Xác nhận</span>
                            </div>
                        </div>

                        {/* STEP 1: CHỌN HÌNH THỨC & THỜI GIAN */}
                        {bookingStep === 1 && (
                            <form onSubmit={(e) => { e.preventDefault(); setBookingStep(2); }}>
                                <div className="hx-booking-type-toggle">
                                    <div
                                        className={`hx-booking-type-card ${bookingType === 'VIEWING' ? 'selected' : ''}`}
                                        onClick={() => setBookingType('VIEWING')}
                                    >
                                        <h4>
                                            <Calendar size={16} color="#10B981" /> Hẹn xem trực tiếp
                                        </h4>
                                        <p>Đến khảo sát thực tế phòng, kiểm tra công tơ điện nước trước khi chốt thuê (Khuyên dùng).</p>
                                    </div>
                                    <div
                                        className={`hx-booking-type-card ${bookingType === 'RESERVE' ? 'selected' : ''}`}
                                        onClick={() => setBookingType('RESERVE')}
                                    >
                                        <h4>
                                            <CheckCircle2 size={16} color="#10B981" /> Đăng ký giữ phòng
                                        </h4>
                                        <p>Giữ chỗ ưu tiên trước ngày nhập học/nhận việc, đối chiếu hợp đồng thuê mẫu chuẩn pháp lý.</p>
                                    </div>
                                </div>

                                <div className="hx-fields">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <label>
                                            Ngày hẹn / Ngày dọn vào (*)
                                            <input
                                                type="date"
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                value={bookingDate}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                            />
                                        </label>

                                        <label>
                                            Khung giờ thuận tiện (*)
                                            <select
                                                value={bookingTimeSlot}
                                                onChange={(e) => setBookingTimeSlot(e.target.value)}
                                            >
                                                <option value="Sáng (08:30 - 11:30)">Sáng (08:30 - 11:30)</option>
                                                <option value="Chiều (14:00 - 17:30)">Chiều (14:00 - 17:30)</option>
                                                <option value="Tối (18:00 - 20:30)">Tối (18:00 - 20:30)</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <label>
                                            Họ và tên người thuê (*)
                                            <input
                                                type="text"
                                                required
                                                placeholder="VD: Nguyễn Văn A"
                                                value={tenantName}
                                                onChange={(e) => setTenantName(e.target.value)}
                                            />
                                        </label>

                                        <label>
                                            Số điện thoại liên hệ (*)
                                            <input
                                                type="tel"
                                                required
                                                placeholder="VD: 0901234567"
                                                value={tenantPhone}
                                                onChange={(e) => setTenantPhone(e.target.value)}
                                            />
                                        </label>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                                        <label>
                                            Email nhận thông báo & hợp đồng
                                            <input
                                                type="email"
                                                placeholder="VD: ban@email.com"
                                                value={tenantEmail}
                                                onChange={(e) => setTenantEmail(e.target.value)}
                                            />
                                        </label>

                                        <label>
                                            Số người ở
                                            <input
                                                type="number"
                                                min={1}
                                                max={room.maxPeople}
                                                value={occupantsCount}
                                                onChange={(e) => setOccupantsCount(Number(e.target.value))}
                                            />
                                        </label>
                                    </div>

                                    <label>
                                        Ghi chú cho chủ trọ (nếu có)
                                        <textarea
                                            rows={2}
                                            placeholder="VD: Mình muốn xem thêm chỗ để xe máy và khóa cửa tầng trệt..."
                                            value={tenantNotes}
                                            onChange={(e) => setTenantNotes(e.target.value)}
                                        />
                                    </label>
                                </div>

                                <div className="hx-actions" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        className="hx-outline-button"
                                        onClick={() => setBookingModalOpen(false)}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="hx-button"
                                        style={{ minWidth: 200 }}
                                    >
                                        Tiếp tục: Xem hợp đồng mẫu →
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: MINH BẠCH CHI PHÍ & HỢP ĐỒNG THUÊ MẪU */}
                        {bookingStep === 2 && (
                            <form onSubmit={handleConfirmBooking}>
                                {/* Cost Summary Breakdown */}
                                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', marginBottom: 18 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                                            Bảng kê chi phí tháng đầu (Không phí ngầm)
                                        </span>
                                        <span className="hx-film-verified">
                                            <CheckCircle2 size={11} /> 100% MINH BẠCH
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                                        <div>Tiền thuê: <strong>{money(room.price)} / tháng</strong></div>
                                        <div>Tiền cọc: <strong>{money(room.costs?.deposit || room.price)}</strong></div>
                                        <div>Điện: <strong>{costs?.electricityPerKwh ? money(costs.electricityPerKwh) + '/kWh' : 'Đồng hồ riêng'}</strong></div>
                                        <div>Nước: <strong>{costs?.waterPerM3 ? money(costs.waterPerM3) + '/m³' : 'Theo hóa đơn'}</strong></div>
                                    </div>
                                    <div style={{ borderTop: '1px dashed #CBD5E1', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#059669', fontSize: 14 }}>
                                        <span>Tổng thanh toán dự kiến khi nhận phòng:</span>
                                        <span>{money(room.price + Number(room.costs?.deposit || room.price))}</span>
                                    </div>
                                </div>

                                {/* Smart Lease Agreement Preview */}
                                <div className="hx-contract-preview-box">
                                    <div className="hx-contract-badge">
                                        <FileText size={12} /> HỢP ĐỒNG THUÊ PHÒNG MẪU ĐÃ RÀ SOÁT PHÁP LÝ (MỤC 3.E)
                                    </div>

                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                                            Thời hạn hợp đồng dự kiến:
                                        </label>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="leaseMonths"
                                                    checked={leaseMonths === '6'}
                                                    onChange={() => setLeaseMonths('6')}
                                                />
                                                6 tháng
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="leaseMonths"
                                                    checked={leaseMonths === '12'}
                                                    onChange={() => setLeaseMonths('12')}
                                                />
                                                12 tháng (1 năm)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="hx-contract-clause">
                                        <Check size={16} color="#059669" />
                                        <span><strong>Thời hạn hoàn cọc:</strong> Khách thuê thông báo trước 30 ngày trước khi trả phòng sẽ được nhận lại 100% tiền đặt cọc đúng quy định.</span>
                                    </div>
                                    <div className="hx-contract-clause">
                                        <Check size={16} color="#059669" />
                                        <span><strong>Hiện trạng bàn giao:</strong> Bàn giao đúng các thiết bị và hiện trạng đã được ghi nhận trong Biên bản kiểm định 4 bước của HexRoom.</span>
                                    </div>
                                    <div className="hx-contract-clause">
                                        <Check size={16} color="#059669" />
                                        <span><strong>Không phụ phí phát sinh:</strong> Chủ nhà cam kết giữ nguyên đơn giá điện, nước, internet trong suốt thời hạn hợp đồng.</span>
                                    </div>
                                </div>

                                {/* Nestly / HexRoom Trust Guarantee */}
                                <div className="hx-booking-trust-note" style={{ marginBottom: 20 }}>
                                    <ShieldCheck size={24} color="#059669" style={{ flexShrink: 0 }} />
                                    <div>
                                        <strong style={{ color: '#065F46' }}>Cam kết bảo vệ khách thuê HexRoom:</strong>
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#047857' }}>
                                            HexRoom không giữ cọc và không thu hộ tiền thuê. Quý khách KHÔNG chuyển tiền cọc trước khi trực tiếp kiểm tra phòng và ký biên bản hợp đồng.
                                        </p>
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer', marginBottom: 20 }}>
                                    <input
                                        type="checkbox"
                                        required
                                        checked={agreeTerms}
                                        onChange={(e) => setAgreeTerms(e.target.checked)}
                                        style={{ marginTop: 2 }}
                                    />
                                    <span>Tôi đã đối chiếu chi phí minh bạch và đồng ý với điều khoản đặt hẹn & hợp đồng mẫu của HexRoom.</span>
                                </label>

                                <div className="hx-actions" style={{ justifyContent: 'space-between' }}>
                                    <button
                                        type="button"
                                        className="hx-outline-button"
                                        onClick={() => setBookingStep(1)}
                                    >
                                        ← Quay lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingBooking || !agreeTerms}
                                        className="hx-button"
                                        style={{ minWidth: 240 }}
                                    >
                                        {isSubmittingBooking ? 'Đang gửi yêu cầu...' : 'Xác nhận đặt phòng ngay'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 3: HOÀN TẤT & MÃ ĐẶT CHỖ */}
                        {bookingStep === 3 && (
                            <div className="hx-booking-success-box">
                                <div style={{ width: 64, height: 64, borderRadius: 999, background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #A7F3D0' }}>
                                    <CheckCircle2 size={38} />
                                </div>

                                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                                    Yêu cầu đặt phòng đã gửi thành công!
                                </h3>
                                <p style={{ fontSize: 13, color: '#64748B', maxWidth: 440, margin: '0 auto 16px' }}>
                                    Chủ nhà đã nhận được yêu cầu hẹn của bạn. Nhân viên hỗ trợ HexRoom cam kết hỗ trợ phản hồi đầu tiên trong vòng 5 phút (theo mục 3.C).
                                </p>

                                <div>
                                    <span style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                                        MÃ ĐẶT PHÒNG CỦA BẠN:
                                    </span>
                                    <br />
                                    <span className="hx-booking-code-pill">
                                        {confirmedBookingId}
                                    </span>
                                </div>

                                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '14px 20px', margin: '16px auto', maxWidth: 460, textAlign: 'left', fontSize: 13, border: '1px solid #E2E8F0' }}>
                                    <div style={{ marginBottom: 6 }}>Phòng: <strong>{room.roomName || room.rentalTitle}</strong></div>
                                    <div style={{ marginBottom: 6 }}>Địa chỉ: <strong>{[room.address, room.district, room.city].filter(Boolean).join(', ')}</strong></div>
                                    <div style={{ marginBottom: 6 }}>Ngày hẹn: <strong>{new Date(bookingDate).toLocaleDateString('vi-VN')} ({bookingTimeSlot})</strong></div>
                                    <div>Người đặt: <strong>{tenantName} — {tenantPhone}</strong></div>
                                </div>

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                                    <button
                                        type="button"
                                        className="hx-button"
                                        onClick={() => {
                                            setBookingModalOpen(false);
                                            navigate('/history');
                                        }}
                                        style={{ minWidth: 200 }}
                                    >
                                        <FileText size={16} /> Xem trong Lịch sử đặt phòng
                                    </button>

                                    <button
                                        type="button"
                                        className="hx-outline-button"
                                        onClick={() => {
                                            setBookingModalOpen(false);
                                            handleContactLandlord();
                                        }}
                                    >
                                        <MessageCircle size={16} color="#10B981" /> Nhắn tin với chủ trọ
                                    </button>

                                    <button
                                        type="button"
                                        className="hx-outline-button"
                                        onClick={() => setBookingModalOpen(false)}
                                    >
                                        Hoàn tất & Đóng
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
