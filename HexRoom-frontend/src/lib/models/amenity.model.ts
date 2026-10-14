export interface Amenity {
    amenity_id: string;
    name: string;
    icon?: string;
}

export interface CreateAmenityDTO {
    name: string;
    icon?: string;
}

export interface UpdateAmenityDTO {
    name?: string;
    icon?: string;
}
