import { Star, Calendar, Clock, MapPin, MessageCircle, Phone, Eye, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import type { Booking } from '../types';

interface BookingCardProps {
    booking: Booking;
    onWriteReview: (booking: Booking) => void;
    onViewReview: (booking: Booking) => void;
    onReport: (booking: Booking) => void;
    onContactLandlord: (booking: Booking) => void;
    onViewDetail: (booking: Booking) => void;
    onCancelAppointment?: (booking: Booking) => void;
}

function StatusBadge({ status }: { status: Booking['status'] }) {
    const config = {
        upcoming: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: '🟢 Lịch hẹn sắp tới' },
        active: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: '🟢 Sắp tới' },
        pending: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: '⏳ Chờ xác nhận' },
        completed: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', label: '✅ Đã xem phòng' },
        cancelled: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1', label: 'Đã hủy' },
    };

    const c = config[status] || { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', label: status };
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 750,
                background: c.bg,
                color: c.text,
                border: `1px solid ${c.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
        >
            {c.label}
        </span>
    );
}

function RatingDisplay({ rating }: { rating: number }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                padding: '10px 14px',
                background: '#FFFBEB',
                borderRadius: 10,
                border: '1px solid #FDE68A',
                fontSize: 13,
                fontWeight: 650,
                color: '#92400E',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        size={15}
                        style={{
                            fill: i < rating ? '#F59E0B' : '#E2E8F0',
                            color: i < rating ? '#F59E0B' : '#CBD5E1',
                        }}
                    />
                ))}
            </div>
            <span>Đánh giá của bạn ({rating}/5 sao)</span>
        </div>
    );
}

export function BookingCard({
    booking,
    onWriteReview,
    onViewReview,
    onReport,
    onContactLandlord,
    onViewDetail,
    onCancelAppointment,
}: BookingCardProps) {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Chưa xác định';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const isUpcoming = booking.status === 'upcoming' || booking.status === 'active' || booking.status === 'pending';
    const isCompleted = booking.status === 'completed';

    return (
        <div
            onClick={() => onViewDetail(booking)}
            style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 20,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
                    {/* Room Image */}
                    <div
                        style={{
                            position: 'relative',
                            width: 200,
                            height: 140,
                            borderRadius: 14,
                            overflow: 'hidden',
                            background: '#F1F5F9',
                            flexShrink: 0,
                        }}
                    >
                        <ImageWithFallback
                            src={booking.propertyImage}
                            alt={booking.roomName || booking.propertyName}
                            className="w-full h-full object-cover"
                        />
                        <div style={{ position: 'absolute', top: 10, left: 10 }}>
                            <StatusBadge status={booking.status} />
                        </div>
                    </div>

                    {/* Room & Appointment Details */}
                    <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            {/* Title & Price Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
                                        {booking.roomName || 'Căn phòng trọ'}
                                    </h3>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>
                                        {booking.propertyName}
                                    </p>
                                </div>
                                {booking.price && (
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <span style={{ fontSize: 17, fontWeight: 850, color: '#0F172A' }}>
                                            {Number(booking.price).toLocaleString('vi-VN')} đ
                                        </span>
                                        <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>/tháng</span>
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                                <MapPin size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {booking.address}
                                </span>
                            </div>

                            {/* ── PROMINENT APPOINTMENT TIME BOX (Nổi bật rõ ràng) ── */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    marginBottom: 12,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 750, color: '#065F46' }}>
                                    <Calendar size={15} style={{ color: '#059669', flexShrink: 0 }} />
                                    <span>Ngày hẹn xem: {formatDate(booking.appointmentDate || booking.startDate)}</span>
                                </div>
                                {booking.appointmentTime && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 13,
                                            fontWeight: 750,
                                            color: '#065F46',
                                            borderLeft: '1px solid #6EE7B7',
                                            paddingLeft: 16,
                                        }}
                                    >
                                        <Clock size={15} style={{ color: '#059669', flexShrink: 0 }} />
                                        <span>Khung giờ: {booking.appointmentTime}</span>
                                    </div>
                                )}
                            </div>

                            {/* Completed status label */}
                            {isCompleted && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 14px',
                                        borderRadius: 10,
                                        background: '#EFF6FF',
                                        border: '1px solid #BFDBFE',
                                        fontSize: 12,
                                        fontWeight: 650,
                                        color: '#1E40AF',
                                        marginBottom: 12,
                                    }}
                                >
                                    <CheckCircle2 size={15} style={{ color: '#2563EB', flexShrink: 0 }} />
                                    <span>Đã xem phòng vào ngày: {booking.viewedDate || formatDate(booking.appointmentDate || booking.startDate)}</span>
                                </div>
                            )}

                            {/* Landlord Contact Box */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    fontSize: 13,
                                    color: '#475569',
                                    marginBottom: 14,
                                }}
                            >
                                <span>
                                    Chủ trọ đón tiếp: <strong style={{ color: '#0F172A' }}>{booking.landlordName}</strong>
                                </span>
                                {booking.landlordPhone && (
                                    <a
                                        href={`tel:${booking.landlordPhone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            color: '#059669',
                                            fontWeight: 750,
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <Phone size={13} />
                                        {booking.landlordPhone}
                                    </a>
                                )}
                            </div>

                            {/* Review display if present */}
                            {booking.hasReview && booking.userRating != null && (
                                <RatingDisplay rating={booking.userRating} />
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 10,
                                paddingTop: 14,
                                borderTop: '1px solid #F1F5F9',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => onViewDetail(booking)}
                                style={{
                                    background: '#10B981',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '8px 16px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Eye size={14} /> Xem chi tiết lịch hẹn
                            </button>

                            <button
                                type="button"
                                onClick={() => onContactLandlord(booking)}
                                style={{
                                    background: '#FFFFFF',
                                    color: '#334155',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 10,
                                    padding: '8px 14px',
                                    fontSize: 13,
                                    fontWeight: 650,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <MessageCircle size={14} style={{ color: '#059669' }} /> Nhắn tin chủ trọ
                            </button>

                            {booking.roomId && (
                                <Link
                                    to={`/room/${booking.roomId}`}
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#334155',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: 10,
                                        padding: '8px 14px',
                                        fontSize: 13,
                                        fontWeight: 650,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Xem phòng trọ ↗
                                </Link>
                            )}

                            {booking.canReview && isCompleted && (
                                <button
                                    type="button"
                                    onClick={() => onWriteReview(booking)}
                                    style={{
                                        background: '#F59E0B',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: 10,
                                        padding: '8px 16px',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginLeft: 'auto',
                                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                                    }}
                                >
                                    <Star size={14} /> Viết đánh giá phòng
                                </button>
                            )}

                            {booking.hasReview && (
                                <button
                                    type="button"
                                    onClick={() => onViewReview(booking)}
                                    style={{
                                        background: '#EFF6FF',
                                        color: '#2563EB',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: 10,
                                        padding: '8px 14px',
                                        fontSize: 13,
                                        fontWeight: 650,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginLeft: 'auto',
                                    }}
                                >
                                    <Eye size={14} /> Xem đánh giá
                                </button>
                            )}

                            {isUpcoming && onCancelAppointment && (
                                <button
                                    type="button"
                                    onClick={() => onCancelAppointment(booking)}
                                    style={{
                                        background: '#FFF1F2',
                                        color: '#E11D48',
                                        border: '1px solid #FECDD3',
                                        borderRadius: 10,
                                        padding: '8px 14px',
                                        fontSize: 13,
                                        fontWeight: 650,
                                        cursor: 'pointer',
                                        marginLeft: 'auto',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Hủy hẹn
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
