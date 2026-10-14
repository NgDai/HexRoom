export interface Notification {
    notification_id: string;
    user_id: string;
    type: string;
    title: string;
    content?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    is_read: boolean;
    created_at: Date | string;
}

export interface CreateNotificationDTO {
    user_id: string;
    type: string;
    title: string;
    content?: string;
    related_entity_type?: string;
    related_entity_id?: string;
}

export interface UpdateNotificationDTO {
    is_read?: boolean;
}
