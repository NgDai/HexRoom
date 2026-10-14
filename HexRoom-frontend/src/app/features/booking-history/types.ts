export type BookingStatus = 'completed' | 'active' | 'cancelled';

export type FeedbackStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export interface Booking {
    id: string;
    rentalPeriodId?: string;
    roomId?: string;
    /** Chủ nhà từ API my-bookings */
    landlordId?: string;
    propertyId?: string;
    roomName?: string;
    propertyName: string;
    propertyImage: string;
    address: string;
    landlordName: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
    hasReview: boolean;
    userRating?: number;
    feedbackId?: string;
    feedbackStatus?: FeedbackStatus;
    moderatorNote?: string;
    canReview?: boolean;
    canReviewDisabled?: boolean;
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
