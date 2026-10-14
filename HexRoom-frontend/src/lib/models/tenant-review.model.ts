export interface TenantReview {
  id: string;
  rental_period_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number | null;
  payment_punctuality_rating: number | null;
  property_care_rating: number | null;
  communication_rating: number | null;
  comment: string | null;
  landlord_reply: string | null;
  replied_at: Date | string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
  moderator_note: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateTenantReviewDTO {
  rentalPeriodId: string;
  rating: number;
  paymentPunctualityRating?: number;
  propertyCareRating?: number;
  communicationRating?: number;
  comment: string;
}

export interface UpdateTenantReviewDTO {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
  landlord_reply?: string;
}

export interface TenantReviewWithRelations extends TenantReview {
  reviewer?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  reviewee?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  reviewer_moderator?: {
    id: string;
    fullName: string;
  };
  room_rental_periods?: {
    id: string;
    startDate: Date | string;
    endDate: Date | string | null;
  };
}

export interface TenantReviewStats {
  totalReviews: number;
  avgRating: number;
  avgPaymentPunctuality: number;
  avgPropertyCare: number;
  avgCommunication: number;
}

export interface TenantReviewListResponse {
  data: TenantReviewWithRelations[];
  stats: TenantReviewStats;
}

export interface PendingReviewsResponse {
  data: TenantReviewWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TenantReviewReplyDTO {
  content: string;
}

export interface UpdateReviewStatusDTO {
  action: 'approve' | 'reject' | 'hide';
  notes?: string;
}
