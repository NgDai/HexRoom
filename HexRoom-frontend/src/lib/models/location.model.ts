export interface Location {
    location_id: string;
    address: string;
    district?: string;
    city: string;
    latitude?: number;
    longitude?: number;
}

export interface CreateLocationDTO {
    address: string;
    district?: string;
    city: string;
    latitude?: number;
    longitude?: number;
}

export interface UpdateLocationDTO {
    address?: string;
    district?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}
