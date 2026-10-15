import type { Booking, ReportData } from './types';
import type { BookingTabValue } from './constants';

/** Payload for POST /reports from a rental booking context. */
export function buildBookingReportPayload(
    booking: Pick<Booking, 'roomId' | 'id' | 'rentalPeriodId'>,
    data: ReportData
): { targetType: 'ROOM' | 'BOOKING'; targetId: string; reason: string; description: string } {
    const description = data.details.trim();
    if (booking.roomId) {
        return { targetType: 'ROOM', targetId: booking.roomId, reason: data.reason, description };
    }
    const bookingId = booking.rentalPeriodId || booking.id;
    if (bookingId) {
        return { targetType: 'BOOKING', targetId: bookingId, reason: data.reason, description };
    }
    throw new Error('Thiếu thông tin phòng hoặc booking để gửi báo cáo');
}

export function filterBookings(
    bookings: Booking[],
    filter: BookingTabValue
): Booking[] {
    if (filter === 'upcoming') {
        return bookings.filter(
            (b) => b.status === 'upcoming' || b.status === 'active' || b.status === 'pending'
        );
    }
    if (filter === 'completed') {
        return bookings.filter((b) => b.status === 'completed');
    }
    if (filter === 'cancelled') {
        return bookings.filter((b) => b.status === 'cancelled');
    }
    return bookings;
}
