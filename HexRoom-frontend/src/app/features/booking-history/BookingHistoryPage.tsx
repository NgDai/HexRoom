import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Calendar,
    Clock,
    MapPin,
    Phone,
    MessageCircle,
    X,
    Eye,
    ShieldCheck,
    CheckCircle2,
    ArrowRight,
    ExternalLink,
} from 'lucide-react';
import { Header, Footer } from '../home/components';
import {
    BookingCard,
    BookingTabs,
    ReviewModal,
    ViewFeedbackModal,
    ReportModal,
    EmptyState,
} from './components';
import { useAuth } from '@/app/context/useAuth';
import { type BookingTabValue } from './constants';
import { filterBookings } from './utils';
import {
    getMyBookingsRequest,
    createFeedbackRequest,
    getFeedbackByRentalPeriodRequest,
    createReportRequest,
} from '@/lib/api';
import { buildBookingReportPayload } from './utils';
import type { Booking, ReviewData, ReportData } from './types';
import type { FeedbackStatus } from './types';

type ModalState = 'none' | 'review' | 'viewFeedback' | 'report';

export function BookingHistoryPage() {
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();

    // Default tab: 'upcoming'
    const [activeTab, setActiveTab] = React.useState<BookingTabValue>('upcoming');
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 3;

    // Modals
    const [modalState, setModalState] = React.useState<ModalState>('none');
    const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);
    const [detailModalBooking, setDetailModalBooking] = React.useState<Booking | null>(null);
    const [viewFeedbackData, setViewFeedbackData] = React.useState<{
        rating: number;
        comment: string | null;
        cleanlinessRating?: number | null;
        locationRating?: number | null;
        valueRating?: number | null;
        landlordRating?: number | null;
        status: FeedbackStatus;
        moderatorNote?: string | null;
    } | null>(null);

    const fetchBookings = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!user) {
                setBookings([]);
                setLoading(false);
                return;
            }

            const userEmail = (user.email || '').toLowerCase().trim();
            const userPhone = (user.phone || '').trim();
            const cleanUserPhone = userPhone.replace(/\D/g, '');
            const userId = user.id;

            const localRaw = localStorage.getItem('hexroom_local_bookings');
            let localItems: Booking[] = localRaw ? JSON.parse(localRaw) : [];
            // Filter out any previous mock appointments
            localItems = localItems.filter((b) => !b.id.startsWith('HXR-APPT-'));

            // Chỉ lấy các lịch hẹn xem phòng / đặt phòng thuộc về tài khoản đang đăng nhập
            const myLocalItems = localItems.filter((b) => {
                if (b.userId && userId && b.userId === userId) return true;
                if (b.tenantId && userId && b.tenantId === userId) return true;
                if (b.tenantEmail && userEmail && b.tenantEmail.toLowerCase().trim() === userEmail) return true;
                if (b.tenantPhone && cleanUserPhone) {
                    const cleanPhone = b.tenantPhone.replace(/\D/g, '');
                    if (cleanPhone && cleanPhone === cleanUserPhone) return true;
                }
                return false;
            });

            try {
                const res = await getMyBookingsRequest();
                const apiItems = (res.data || []).map((b) => ({
                    ...b,
                    propertyId: b.roomId,
                    landlordId: b.landlordId,
                })) as Booking[];

                const map = new Map<string, Booking>();
                myLocalItems.forEach((b) => map.set(b.id, b));
                apiItems.forEach((b) => map.set(b.id, b));
                setBookings(Array.from(map.values()));
            } catch {
                setBookings(myLocalItems);
            }
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    React.useEffect(() => {
        if (!authLoading) {
            fetchBookings();
        }
    }, [fetchBookings, authLoading]);

    const filteredBookings = filterBookings(bookings, activeTab);
    const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Cancel appointment handler
    const handleCancelAppointment = (booking: Booking) => {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn hủy lịch hẹn xem phòng "${booking.roomName || 'này'}" không?`
        );
        if (!confirmed) return;

        setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' as const } : b)));
        try {
            const localRaw = localStorage.getItem('hexroom_local_bookings');
            if (localRaw) {
                const allItems: Booking[] = JSON.parse(localRaw);
                const updatedAll = allItems.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' as const } : b));
                localStorage.setItem('hexroom_local_bookings', JSON.stringify(updatedAll));
            }
        } catch {
            // ignore
        }
        if (detailModalBooking?.id === booking.id) {
            setDetailModalBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        }
    };

    const handleWriteReview = (booking: Booking) => {
        setSelectedBooking(booking);
        setModalState('review');
    };

    const handleViewReview = async (booking: Booking) => {
        setSelectedBooking(booking);
        setModalState('viewFeedback');
        const rentalPeriodId = booking.rentalPeriodId || booking.id;
        try {
            const res = await getFeedbackByRentalPeriodRequest(rentalPeriodId);
            if (res.data) {
                setViewFeedbackData({
                    rating: res.data.rating,
                    comment: res.data.comment,
                    cleanlinessRating: res.data.cleanlinessRating,
                    locationRating: res.data.locationRating,
                    valueRating: res.data.valueRating,
                    landlordRating: res.data.landlordRating,
                    status: res.data.status as FeedbackStatus,
                    moderatorNote: res.data.moderatorNote,
                });
            } else {
                setViewFeedbackData(null);
            }
        } catch {
            setViewFeedbackData(null);
        }
    };

    const handleReport = (booking: Booking) => {
        setSelectedBooking(booking);
        setModalState('report');
    };

    const handleContactLandlord = (booking: Booking) => {
        if (booking.landlordPhone) {
            window.location.href = `tel:${booking.landlordPhone}`;
        } else {
            navigate('/chat');
        }
    };

    const handleReviewSubmit = async (data: ReviewData) => {
        if (!selectedBooking?.rentalPeriodId || !selectedBooking?.roomId) {
            if (selectedBooking) {
                setBookings((prev) =>
                    prev.map((b) =>
                        b.id === selectedBooking.id
                            ? { ...b, hasReview: true, userRating: data.rating, feedbackStatus: 'APPROVED' as const }
                            : b
                    )
                );
                try {
                    const localRaw = localStorage.getItem('hexroom_local_bookings');
                    if (localRaw) {
                        const allItems: Booking[] = JSON.parse(localRaw);
                        const updatedAll = allItems.map((b) =>
                            b.id === selectedBooking.id
                                ? { ...b, hasReview: true, userRating: data.rating, feedbackStatus: 'APPROVED' as const }
                                : b
                        );
                        localStorage.setItem('hexroom_local_bookings', JSON.stringify(updatedAll));
                    }
                } catch {
                    // ignore
                }
            }
            setModalState('none');
            setSelectedBooking(null);
            return;
        }

        try {
            await createFeedbackRequest({
                rentalPeriodId: selectedBooking.rentalPeriodId,
                roomId: selectedBooking.roomId,
                rating: data.rating,
                comment: data.comment,
                cleanlinessRating: data.cleanlinessRating,
                locationRating: data.locationRating,
                valueRating: data.valueRating,
                landlordRating: data.landlordRating,
            });
            setModalState('none');
            setSelectedBooking(null);
            fetchBookings();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Gửi đánh giá thất bại');
        }
    };

    const handleReportSubmit = async (data: ReportData) => {
        if (!selectedBooking) return;
        try {
            const body = buildBookingReportPayload(selectedBooking, data);
            await createReportRequest(body);
            setModalState('none');
            setSelectedBooking(null);
            alert('Gửi báo cáo thành công! Ban quản trị HexRoom sẽ xử lý sớm nhất.');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Gửi báo cáo thất bại');
            throw err;
        }
    };

    const handleCloseModal = () => {
        setModalState('none');
        setSelectedBooking(null);
        setViewFeedbackData(null);
    };

    const handleExplore = () => {
        navigate('/rooms');
    };

    const formatDateFull = (dateStr?: string) => {
        if (!dateStr) return 'Chưa xác định';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <div className="hx-page" style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <main className="hx-container hx-section" style={{ paddingTop: 36, paddingBottom: 64, flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
                {/* Header Title (Không còn nút quay lại theo yêu cầu) */}
                <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#059669', fontSize: 11, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                            <Calendar size={13} /> Quản lý lịch hẹn
                        </div>
                        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                            Lịch sử hẹn lịch xem phòng
                        </h1>
                        <p style={{ fontSize: 15, color: '#64748B', maxWidth: 700, lineHeight: 1.6, margin: 0 }}>
                            Theo dõi thời gian hẹn lịch xem phòng sắp tới và danh sách các phòng trọ bạn đã đi xem thực tế.
                        </p>
                    </div>

                    <Link
                        to="/rooms"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 13,
                            fontWeight: 750,
                            color: '#059669',
                            background: '#ECFDF5',
                            padding: '10px 18px',
                            borderRadius: 12,
                            border: '1px solid #A7F3D0',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
                        }}
                    >
                        ＋ Tìm thêm phòng trọ
                    </Link>
                </div>

                {/* Tabs */}
                <BookingTabs
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        setActiveTab(tab);
                        setCurrentPage(1);
                    }}
                />

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontWeight: 600 }}>
                        Đang tải lịch hẹn...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#EF4444', fontWeight: 600 }}>
                        {error}
                    </div>
                ) : filteredBookings.length > 0 ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {paginatedBookings.map((booking) => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    onWriteReview={handleWriteReview}
                                    onViewReview={handleViewReview}
                                    onReport={handleReport}
                                    onContactLandlord={handleContactLandlord}
                                    onViewDetail={(b) => setDetailModalBooking(b)}
                                    onCancelAppointment={handleCancelAppointment}
                                />
                            ))}
                        </div>

                        {/* Pagination / Sang trang */}
                        {totalPages > 1 && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    marginTop: 36,
                                    marginBottom: 16,
                                }}
                            >
                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    style={{
                                        minWidth: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#334155',
                                        fontWeight: 700,
                                        fontSize: 18,
                                        cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage <= 1 ? 0.45 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease',
                                    }}
                                    aria-label="Trang trước"
                                >
                                    ‹
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                                    const isCurrent = num === currentPage;
                                    return (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setCurrentPage(num)}
                                            style={{
                                                minWidth: 42,
                                                height: 42,
                                                borderRadius: 12,
                                                border: isCurrent ? '1px solid #10B981' : '1px solid #CBD5E1',
                                                background: isCurrent ? '#10B981' : '#FFFFFF',
                                                color: isCurrent ? '#FFFFFF' : '#1E293B',
                                                fontWeight: 750,
                                                fontSize: 14,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isCurrent ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                                            }}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    style={{
                                        minWidth: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#334155',
                                        fontWeight: 700,
                                        fontSize: 18,
                                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage >= totalPages ? 0.45 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease',
                                    }}
                                    aria-label="Trang tiếp"
                                >
                                    ›
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <EmptyState
                        onExplore={handleExplore}
                        tabLabel={
                            activeTab === 'upcoming'
                                ? 'lịch xem phòng sắp tới nào'
                                : activeTab === 'completed'
                                ? 'phòng trọ nào đã xem'
                                : 'lịch hẹn xem phòng nào'
                        }
                    />
                )}
            </main>

            {/* ── MODAL CHI TIẾT LỊCH HẸN XEM PHÒNG (Nền trắng sang trọng) ── */}
            {detailModalBooking && (
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
                    onClick={() => setDetailModalBooking(null)}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 520,
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 24,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '90vh',
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Eye size={18} style={{ color: '#059669' }} />
                                <h3 style={{ fontSize: 16, fontWeight: 750, color: '#0F172A', margin: 0 }}>
                                    Chi tiết lịch hẹn xem phòng
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailModalBooking(null)}
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

                        {/* Modal Body */}
                        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* 1. THỜI GIAN HẸN XEM PHÒNG */}
                            <div
                                style={{
                                    padding: 16,
                                    borderRadius: 14,
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, fontWeight: 750, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={14} style={{ color: '#059669' }} /> Thời gian hẹn xem phòng
                                    </span>
                                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 750, background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                                        {detailModalBooking.status === 'completed'
                                            ? '✅ Đã xem phòng'
                                            : detailModalBooking.status === 'cancelled'
                                            ? 'Đã hủy'
                                            : '🟢 Sắp tới'}
                                    </span>
                                </div>
                                <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                                    {formatDateFull(detailModalBooking.appointmentDate || detailModalBooking.startDate)}
                                </div>
                                {detailModalBooking.appointmentTime && (
                                    <div style={{ fontSize: 14, fontWeight: 750, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={15} /> Khung giờ: {detailModalBooking.appointmentTime}
                                    </div>
                                )}
                                <p style={{ fontSize: 12, color: '#065F46', lineHeight: 1.55, margin: '4px 0 0' }}>
                                    💡 <em>Lời nhắc:</em> Vui lòng có mặt đúng giờ hẹn. Trường hợp bận đột xuất hoặc cần đổi lịch, vui lòng gọi điện trước cho chủ trọ ít nhất 30 phút.
                                </p>
                            </div>

                            {/* 2. CĂN PHÒNG ĐÃ HẸN XEM */}
                            <div
                                style={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 14,
                                    padding: 16,
                                    backgroundColor: '#F8FAFC',
                                }}
                            >
                                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                    <img
                                        src={detailModalBooking.propertyImage}
                                        alt={detailModalBooking.roomName}
                                        style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#E2E8F0' }}
                                    />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.35 }}>
                                            {detailModalBooking.roomName}
                                        </h4>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <MapPin size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {detailModalBooking.address}
                                            </span>
                                        </p>
                                        {detailModalBooking.price && (
                                            <div style={{ marginTop: 8, fontSize: 15, fontWeight: 850, color: '#059669' }}>
                                                {Number(detailModalBooking.price).toLocaleString('vi-VN')} đ/tháng
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {detailModalBooking.roomId && (
                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
                                        <Link
                                            to={`/room/${detailModalBooking.roomId}`}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#059669',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            Xem chi tiết căn phòng này <ExternalLink size={13} />
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* 3. THÔNG TIN CHỦ TRỌ TIẾP ĐÓN */}
                            <div
                                style={{
                                    padding: 16,
                                    borderRadius: 14,
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                }}
                            >
                                <div style={{ fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                                    Chủ trọ đón tiếp
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>
                                            {detailModalBooking.landlordName}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#94A3B8' }}>Chính chủ cho thuê</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {detailModalBooking.landlordPhone && (
                                            <a
                                                href={`tel:${detailModalBooking.landlordPhone}`}
                                                style={{
                                                    padding: '7px 14px',
                                                    borderRadius: 8,
                                                    background: '#ECFDF5',
                                                    color: '#059669',
                                                    fontWeight: 750,
                                                    fontSize: 12,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    textDecoration: 'none',
                                                    border: '1px solid #A7F3D0',
                                                }}
                                            >
                                                <Phone size={13} /> Gọi điện
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDetailModalBooking(null);
                                                handleContactLandlord(detailModalBooking);
                                            }}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: 8,
                                                border: '1px solid #CBD5E1',
                                                background: '#FFFFFF',
                                                color: '#334155',
                                                fontWeight: 650,
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <MessageCircle size={13} /> Nhắn tin
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Ghi chú khi hẹn */}
                            {detailModalBooking.notes && (
                                <div style={{ fontSize: 12, color: '#475569', background: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0', lineHeight: 1.5 }}>
                                    <strong>Ghi chú:</strong> {detailModalBooking.notes}
                                </div>
                            )}
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
                            }}
                        >
                            {detailModalBooking.status === 'upcoming' ? (
                                <button
                                    type="button"
                                    onClick={() => handleCancelAppointment(detailModalBooking)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        fontWeight: 650,
                                        color: '#E11D48',
                                        background: '#FFF1F2',
                                        border: '1px solid #FECDD3',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Hủy lịch hẹn này
                                </button>
                            ) : (
                                <div />
                            )}
                            <button
                                type="button"
                                onClick={() => setDetailModalBooking(null)}
                                style={{
                                    padding: '9px 20px',
                                    borderRadius: 10,
                                    background: '#0F172A',
                                    color: '#FFFFFF',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Other modals */}
            <ReviewModal
                isOpen={modalState === 'review'}
                onClose={handleCloseModal}
                onSubmit={handleReviewSubmit}
                propertyName={selectedBooking?.roomName || selectedBooking?.propertyName || ''}
                existingRating={selectedBooking?.feedbackStatus === 'REJECTED' ? selectedBooking?.userRating : undefined}
                isEditMode={selectedBooking?.feedbackStatus === 'REJECTED'}
            />

            <ViewFeedbackModal
                isOpen={modalState === 'viewFeedback'}
                onClose={handleCloseModal}
                propertyName={selectedBooking?.roomName || selectedBooking?.propertyName || ''}
                rating={viewFeedbackData?.rating ?? 0}
                comment={viewFeedbackData?.comment ?? null}
                cleanlinessRating={viewFeedbackData?.cleanlinessRating}
                locationRating={viewFeedbackData?.locationRating}
                valueRating={viewFeedbackData?.valueRating}
                landlordRating={viewFeedbackData?.landlordRating}
                status={viewFeedbackData?.status ?? 'PENDING'}
                moderatorNote={viewFeedbackData?.moderatorNote}
            />

            <ReportModal
                isOpen={modalState === 'report'}
                onClose={handleCloseModal}
                onSubmit={handleReportSubmit}
                propertyName={selectedBooking?.roomName || selectedBooking?.propertyName || ''}
            />

            <div style={{ marginTop: 'auto', width: '100%' }}>
                <Footer />
            </div>
        </div>
    );
}
