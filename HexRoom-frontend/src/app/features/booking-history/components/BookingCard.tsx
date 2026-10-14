import { Star, Calendar, MapPin, MessageCircle, Flag, Eye } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import type { Booking } from '../types';

interface BookingCardProps {
    booking: Booking;
    onWriteReview: (booking: Booking) => void;
    onViewReview: (booking: Booking) => void;
    onReport: (booking: Booking) => void;
    onContactLandlord: (booking: Booking) => void;
}

function StatusBadge({ status }: { status: Booking['status'] }) {
    const config = {
        completed: { bg: 'bg-primary/10', text: 'text-primary', label: 'Đã hoàn thành' },
        active: { bg: 'bg-accent/10', text: 'text-accent', label: 'Đang thuê' },
        cancelled: { bg: 'bg-muted', text: 'text-foreground/60', label: 'Đã hủy' },
    };

    const { bg, text, label } = config[status];
    return <span className={`px-3 py-1 ${bg} ${text} rounded-full text-sm`}>{label}</span>;
}

function FeedbackStatusBadge({
    status,
    moderatorNote,
}: {
    status: string;
    moderatorNote?: string;
}) {
    const config: Record<string, { bg: string; text: string; label: string }> = {
        PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Đang chờ duyệt' },
        APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã công khai' },
        REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Bị từ chối' },
    };
    const c = config[status] || { bg: 'bg-muted', text: 'text-foreground/70', label: status };
    return (
        <div className="mb-3 p-3 rounded-lg border bg-muted/30">
            <span className={`px-2 py-1 rounded text-xs font-medium ${c.bg} ${c.text}`}>
                {c.label}
            </span>
            {status === 'REJECTED' && moderatorNote && (
                <p className="mt-2 text-sm text-foreground/70">{moderatorNote}</p>
            )}
        </div>
    );
}

function RatingDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-2 mb-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'fill-accent text-accent' : 'text-muted'
                            }`}
                    />
                ))}
            </div>
            <span className="text-foreground/70">Đánh giá của bạn</span>
        </div>
    );
}

export function BookingCard({
    booking,
    onWriteReview,
    onViewReview,
    onReport,
    onContactLandlord,
}: BookingCardProps) {
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('vi-VN');

    return (
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Property Image */}
                    <div className="w-full sm:w-48 h-48 sm:h-32 shrink-0">
                        <ImageWithFallback
                            src={booking.propertyImage}
                            alt={booking.roomName || booking.propertyName}
                            className="w-full h-full object-cover rounded-lg"
                        />
                    </div>

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1 truncate">
                                    {booking.roomName || 'Phòng'}
                                </h3>
                                <p className="text-sm text-foreground/60 mb-2 truncate">
                                    {booking.propertyName}
                                </p>
                                <div className="flex items-center gap-2 text-foreground/60 mb-2">
                                    <MapPin className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{booking.address}</span>
                                </div>
                                <div className="flex items-center gap-2 text-foreground/60">
                                    <Calendar className="w-4 h-4 shrink-0" />
                                    <span>
                                        {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                                    </span>
                                </div>
                            </div>
                            <StatusBadge status={booking.status} />
                        </div>

                        {/* User's Review */}
                        {booking.hasReview && booking.userRating != null && (
                            <RatingDisplay rating={booking.userRating} />
                        )}

                        {/* Feedback status badge */}
                        {booking.hasReview && booking.feedbackStatus && (
                            <FeedbackStatusBadge status={booking.feedbackStatus} moderatorNote={booking.moderatorNote} />
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {booking.canReview && (
                                <button
                                    onClick={() => onWriteReview(booking)}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
                                >
                                    <Star className="w-4 h-4" />
                                    {booking.feedbackStatus === 'REJECTED' ? 'Gửi lại đánh giá' : 'Đánh giá'}
                                </button>
                            )}

                            {booking.canReviewDisabled && (
                                <button
                                    title="Có thể đánh giá sau ít phút nữa"
                                    disabled
                                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed flex items-center gap-2"
                                >
                                    <Star className="w-4 h-4" />
                                    Đánh giá
                                </button>
                            )}

                            {booking.hasReview && (
                                <button
                                    onClick={() => onViewReview(booking)}
                                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-all flex items-center gap-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    Xem đánh giá
                                </button>
                            )}

                            <button
                                onClick={() => onContactLandlord(booking)}
                                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-all flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Liên hệ chủ nhà
                            </button>

                            <button
                                onClick={() => onReport(booking)}
                                className="px-4 py-2 border border-border rounded-lg hover:bg-destructive/5 hover:border-destructive/20 text-foreground/70 hover:text-destructive transition-all flex items-center gap-2"
                            >
                                <Flag className="w-4 h-4" />
                                Báo cáo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
