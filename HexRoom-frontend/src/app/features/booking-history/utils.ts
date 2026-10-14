import type { Booking, BookingStatus, ReportData } from './types';

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
    filter: 'all' | BookingStatus
): Booking[] {
    if (filter === 'all') return bookings;
    return bookings.filter((booking) => booking.status === filter);
}
