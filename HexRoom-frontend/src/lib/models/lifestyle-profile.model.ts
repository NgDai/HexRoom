export interface LifestyleProfile {
    lifestyle_id: string;
    user_id: string;
    sleep_time?: string;
    cleanliness?: string;
    smoking: boolean;
    drinking: boolean;
    pets: boolean;
    personality_type?: string;
}

export interface CreateLifestyleProfileDTO {
    user_id: string;
    sleep_time?: string;
    cleanliness?: string;
    smoking?: boolean;
    drinking?: boolean;
    pets?: boolean;
    personality_type?: string;
}

export interface UpdateLifestyleProfileDTO {
    sleep_time?: string;
    cleanliness?: string;
    smoking?: boolean;
    drinking?: boolean;
    pets?: boolean;
    personality_type?: string;
}
