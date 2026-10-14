export interface UserPreference {
    preference_id: string;
    user_id: string;
    min_price?: number;
    max_price?: number;
    preferred_location?: string;
    preferred_amenities?: string[];
    lifestyle_weight?: number;
}

export interface CreateUserPreferenceDTO {
    user_id: string;
    min_price?: number;
    max_price?: number;
    preferred_location?: string;
    preferred_amenities?: string[];
    lifestyle_weight?: number;
}

export interface UpdateUserPreferenceDTO {
    min_price?: number;
    max_price?: number;
    preferred_location?: string;
    preferred_amenities?: string[];
    lifestyle_weight?: number;
}
