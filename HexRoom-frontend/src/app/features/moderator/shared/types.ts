export type ModerationDecision = 'pending_review' | 'approved' | 'rejected';

export interface ModerationHistoryRecord {
    history_id: string;
    target_type: 'rental' | 'room_post' | 'report' | 'review' | 'user';
    target_id: string;
    action: string; // APPROVE | REJECT | HIDE | DISMISS | BAN | SUSPEND | UNSUSPEND hoặc approve_listing, reject_listing, etc.
    note?: string;
    moderator_id: string;
    created_at: string;
}

export interface RentalDocument {
    id: string;
    documentType: string;
    imageUrl: string;
    status: string;
    note?: string | null;
}

export interface RentalModerationItem {
    rental_id: string;
    user_id: string;
    title: string;
    description?: string;
    city: string;
    district: string;
    address: string;
    property_type: string;
    created_at: string;
    listing_status: string;
    moderation_status: ModerationDecision;
    last_moderated_at?: string;
    last_note?: string;
    images?: string[];
    documents?: RentalDocument[];
    owner_email?: string;
    owner_phone?: string;
    rooms_count?: number;
}

export interface RoomPostModerationItem {
    room_post_id: string;
    rental_id: string;
    rental_title: string;
    title: string;
    price: number;
    area: number;
    max_occupants: number;
    created_at: string;
    listing_status: string;
    moderation_status: ModerationDecision;
    last_moderated_at?: string;
    last_note?: string;
    images?: string[];
    amenities?: Array<{ id: string; name: string }>;
    description?: string;
    owner_name?: string;
    owner_email?: string;
    owner_phone?: string;
}

export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type ReportCategory = 'spam' | 'offensive' | 'fraud' | 'misleading' | 'other';
export type ReportAction =
    | 'warning'
    | 'remove_content'
    | 'restrict_content'
    | 'suspend_user'
    | 'dismiss_report';

export interface ViolationReport {
    report_id: string;
    reporter_id: string;
    reporter_email?: string;
    reporter_phone?: string;
    target_user_id: string;
    target_user_name?: string;
    target_user_email?: string;
    target_user_phone?: string;
    target_type: 'rental' | 'room_post' | 'review' | 'user';
    target_id: string;
    category: ReportCategory;
    details: string;
    status: ReportStatus;
    action_taken?: ReportAction;
    created_at: string;
    resolved_at?: string;
}

export type ReviewModerationStatus = 'flagged' | 'approved' | 'hidden' | 'deleted';
export type ReviewModerationAction = 'approve' | 'hide' | 'delete' | 'warn_user';

export interface ModeratedReview {
    review_id: string;
    reviewer_id: string;
    rental_id: string;
    rental_title: string;
    rating: number;
    content: string;
    flag_reason: string;
    status: ReviewModerationStatus;
    warning_count: number;
    created_at: string;
    moderated_at?: string;
}

export interface ModerateRentalInput {
    rental_id: string;
    decision: Exclude<ModerationDecision, 'pending_review'>;
    moderator_id: string;
    note?: string;
}

export interface ModerateRoomPostInput {
    room_post_id: string;
    decision: Exclude<ModerationDecision, 'pending_review'>;
    moderator_id: string;
    note?: string;
}

export interface HandleReportInput {
    report_id: string;
    action: ReportAction;
    moderator_id: string;
    note?: string;
}

export interface ModerateReviewInput {
    review_id: string;
    action: ReviewModerationAction;
    moderator_id: string;
    note?: string;
}
