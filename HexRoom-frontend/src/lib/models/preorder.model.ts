export type PreorderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export interface Preorder {
    preorder_id: string;
    user_id: string;
    room_id: string;
    amount: number;
    status: PreorderStatus;
    expired_at?: Date | string;
    created_at: Date | string;
}

export interface CreatePreorderDTO {
    user_id: string;
    room_id: string;
    amount: number;
    status?: PreorderStatus;
    expired_at?: Date | string;
}

export interface UpdatePreorderDTO {
    amount?: number;
    status?: PreorderStatus;
    expired_at?: Date | string;
}

export interface PreorderWithRelations extends Preorder {
    user?: {
        user_id: string;
        full_name: string;
        email: string;
    };
    room?: {
        room_id: string;
        title: string;
        price: number;
    };
}
