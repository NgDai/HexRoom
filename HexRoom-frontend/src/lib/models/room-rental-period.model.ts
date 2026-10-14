export type RentalPeriodStatus = 'active' | 'completed' | 'cancelled';

export interface RoomRentalPeriod {
    period_id: string;
    room_id: string;
    start_date: string;
    end_date?: string;
    status: RentalPeriodStatus;
    created_at: Date | string;
}

export interface CreateRoomRentalPeriodDTO {
    room_id: string;
    start_date: string;
    end_date?: string;
    status?: RentalPeriodStatus;
}

export interface UpdateRoomRentalPeriodDTO {
    start_date?: string;
    end_date?: string;
    status?: RentalPeriodStatus;
}
