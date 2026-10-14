export interface Feedback {
    feedback_id: string;
    user_id: string;
    target_user_id?: string;
    rental_id?: string;
    rate: number;
    review?: string;
    created_at: Date | string;
}

export interface CreateFeedbackDTO {
    user_id: string;
    target_user_id?: string;
    rental_id?: string;
    rate: number;
    review?: string;
}

export interface UpdateFeedbackDTO {
    rate?: number;
    review?: string;
}

export interface FeedbackWithRelations extends Feedback {
    author?: {
        user_id: string;
        full_name: string;
        avatar_url?: string;
    };
    targetUser?: {
        user_id: string;
        full_name: string;
    };
    rental?: {
        rental_id: string;
        title: string;
    };
}
