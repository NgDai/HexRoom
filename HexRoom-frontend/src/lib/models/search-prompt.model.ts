export interface LifestyleFilter {
    sleep_time?: string;
    cleanliness?: string;
    smoking?: boolean;
    drinking?: boolean;
    pets?: boolean;
    personality_type?: string;
}

export interface SearchPrompt {
    prompt_id: string;
    user_id?: string;
    text: string;
    max_price?: number;
    lifestyle_filter?: LifestyleFilter;
    created_at: Date | string;
}

export interface CreateSearchPromptDTO {
    user_id?: string;
    text: string;
    max_price?: number;
    lifestyle_filter?: LifestyleFilter;
}
