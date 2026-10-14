import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookingCard,
    BookingTabs,
    ReviewModal,
    ViewFeedbackModal,
    ReportModal,
    EmptyState,
} from './components';
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

    const [activeTab, setActiveTab] = React.useState<BookingTabValue>('all');
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [modalState, setModalState] = React.useState<ModalState>('none');
    const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);
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
            const res = await getMyBookingsRequest();
            const items = (res.data || []).map((b) => ({
                ...b,
                propertyId: b.roomId,
                landlordId: b.landlordId,
            })) as Booking[];
            const localRaw = localStorage.getItem('hexroom_local_bookings');
            const localItems: Booking[] = localRaw ? JSON.parse(localRaw) : [];
            const map = new Map<string, Booking>();
            localItems.forEach(b => map.set(b.id, b));
            items.forEach(b => map.set(b.id, b));
            setBookings(Array.from(map.values()));
        } catch {
            const localRaw = localStorage.getItem('hexroom_local_bookings');
            const localItems: Booking[] = localRaw ? JSON.parse(localRaw) : [];
            if (localItems.length > 0) {
                setBookings(localItems);
            } else {
                setError('Chưa có lịch sử đặt phòng nào.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const filteredBookings = filterBookings(bookings, activeTab);

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
        const pid = booking.rentalPeriodId || booking.id;
        if (booking.landlordId) {
            navigate(`/chat/${booking.landlordId}`);
        } else if (pid) {
            navigate(`/chat?booking=${encodeURIComponent(pid)}`);
        } else {
            navigate('/chat');
        }
    };

    const handleReviewSubmit = async (data: ReviewData) => {
        if (!selectedBooking?.rentalPeriodId || !selectedBooking?.roomId) return;
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
        navigate('/search');
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Lịch sử thuê phòng</h1>
                    <p className="text-foreground/60">Quản lý các booking và đánh giá của bạn</p>
                </div>

                <BookingTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {loading ? (
                    <div className="py-12 text-center text-foreground/60">Đang tải...</div>
                ) : error ? (
                    <div className="py-12 text-center text-destructive">{error}</div>
                ) : filteredBookings.length > 0 ? (
                    <div className="space-y-4">
                        {filteredBookings.map((booking) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                onWriteReview={handleWriteReview}
                                onViewReview={handleViewReview}
                                onReport={handleReport}
                                onContactLandlord={handleContactLandlord}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState onExplore={handleExplore} />
                )}
            </main>

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
        </div>
    );
}
