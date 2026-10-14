export type RoomType = 'single' | 'double' | 'studio' | 'apartment';

export interface OtherRoomInRental {
    id: string;
    roomName: string | null;
    price: number;
    area: number | null;
    roomType: string;
    image: string;
}

export interface Room {
    id: string;
    title: string;
    location: string;
    price: number;
    area: number;
    roomType: RoomType;
    amenities: string[];
    image: string;
    rating: number;
    available: boolean;
    isNearlyAvailable?: boolean;
    availableFrom?: string | null;
    daysUntilAvailable?: number | null;
    rentalId?: string;
    /** Match score 0–100 from recommendation system. Higher = better fit. */
    matchScore?: number;
    /** Raw CLIP visual similarity 0–100. Only present on image search results. */
    clipSimilarity?: number;
    /** Other rooms in the same rental (for "also in this rental"). */
    otherRoomsInRental?: OtherRoomInRental[];
    /** Distance in km from user's location (only when lat/lng provided). */
    distanceKm?: number;
    /** Nearby POI categories (only when Google Maps is enabled). */
    nearbyPOIs?: Record<string, NearbyPOICategory>;
}

export interface SearchCriteria {
    q?: string;
    /** @deprecated Prefer city + district + address */
    location?: string;
    city?: string;
    district?: string;
    address?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    roomType?: RoomType | '';
    amenities?: string[];
    lat?: number;
    lng?: number;
}

export interface NearbyPOICategory {
    label: string;
    places: Array<{ name: string; type: string; distance: number }>;
    count: number;
}

export interface AmenityItem {
    id: string;
    label: string;
}

export type SortOption =
    | 'relevant'
    | 'price-asc'
    | 'price-desc'
    | 'area-asc'
    | 'area-desc'
    | 'rating';