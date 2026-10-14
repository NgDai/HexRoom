export type MatchStatus = 'pending' | 'accepted' | 'rejected';

export interface RoommateMatch {
    match_id: string;
    user_id: string;
    matched_user_id: string;
    compatibility_score?: number;
    status: MatchStatus;
}

export interface CreateRoommateMatchDTO {
    user_id: string;
    matched_user_id: string;
    compatibility_score?: number;
    status?: MatchStatus;
}

export interface UpdateRoommateMatchDTO {
    compatibility_score?: number;
    status?: MatchStatus;
}

export interface RoommateMatchWithUser extends RoommateMatch {
    matchedUser?: {
        user_id: string;
        full_name: string;
        avatar_url?: string;
        gender?: string;
        birth_year?: number;
    };
}
