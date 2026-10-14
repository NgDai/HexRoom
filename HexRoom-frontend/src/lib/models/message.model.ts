export interface Message {
    message_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    sent_at: Date | string;
}

export interface CreateMessageDTO {
    sender_id: string;
    receiver_id: string;
    content: string;
}

export interface MessageWithUsers extends Message {
    sender?: {
        user_id: string;
        full_name: string;
        avatar_url?: string;
    };
    receiver?: {
        user_id: string;
        full_name: string;
        avatar_url?: string;
    };
}
