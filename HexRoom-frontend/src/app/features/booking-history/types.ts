export type BookingStatus = 'upcoming' | 'pending' | 'completed' | 'active' | 'cancelled';

export type FeedbackStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export interface Booking {
    id: string;
    userId?: string;
    tenantId?: string;
    rentalPeriodId?: string;
    roomId?: string;
    landlordId?: string;
    propertyId?: string;
    roomName?: string;
    propertyName: string;
    propertyImage: string;
    address: string;
    landlordName: string;
    landlordPhone?: string;
    tenantName?: string;
    tenantPhone?: string;
    tenantAvatar?: string;
    tenantEmail?: string;
    startDate: string;
    endDate: string;
    appointmentDate?: string;
    appointmentTime?: string;
    bookingType?: 'VIEWING' | 'RESERVE';
    status: BookingStatus;
    hasReview: boolean;
    userRating?: number;
    feedbackId?: string;
    feedbackStatus?: FeedbackStatus;
    moderatorNote?: string;
    canReview?: boolean;
    canReviewDisabled?: boolean;
    viewedDate?: string;
    price?: number;
    notes?: string;
}

export interface ReviewData {
    rating: number;
    comment: string;
    images?: File[];
    cleanlinessRating?: number;
    locationRating?: number;
    valueRating?: number;
    landlordRating?: number;
}

export interface ReportData {
    reason: string;
    details: string;
}

export interface ReportReason {
    value: string;
    label: string;
    description: string;
}
