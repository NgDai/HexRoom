export type Gender = 'male' | 'female' | 'other';

export interface User {
    user_id: string;
    full_name: string;
    email: string;
    password?: string; // Optional vì không nên expose password ra frontend
    gender?: Gender;
    birth_year?: number;
    avatar_url?: string;
    role_id?: string;
    created_at: Date | string;
}

// DTO cho việc tạo user mới
export interface CreateUserDTO {
    full_name: string;
    email: string;
    password: string;
    gender?: Gender;
    birth_year?: number;
    avatar_url?: string;
    role_id?: string;
}

// DTO cho việc cập nhật user
export interface UpdateUserDTO {
    full_name?: string;
    email?: string;
    gender?: Gender;
    birth_year?: number;
    avatar_url?: string;
}

// Response khi login/register
export interface AuthResponse {
    user: Omit<User, 'password'>;
    token: string;
}

// User với các relations
export interface UserWithRelations extends Omit<User, 'password'> {
    role?: {
        role_id: string;
        role: string;
    };
    lifestyleProfile?: {
        lifestyle_id: string;
        sleep_time: string;
        cleanliness: string;
        smoking: boolean;
        drinking: boolean;
        pets: boolean;
        personality_type: string;
    };
    preference?: {
        preference_id: string;
        min_price: number;
        max_price: number;
        preferred_location: string;
        preferred_amenities: string[];
        lifestyle_weight: number;
    };
    wallet?: {
        wallet_id: string;
        balance: number;
        currency: string;
    };
}
