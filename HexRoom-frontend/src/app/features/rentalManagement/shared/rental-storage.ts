import type { CreateManagedRentalInput, ManagedRentalItem } from './types';

const STORAGE_KEY = 'ezroom:rental-management:rentals';

function createRentalId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `rental-${crypto.randomUUID()}`;
    }

    return `rental-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function readStorage(): ManagedRentalItem[] {
    if (typeof window === 'undefined') return [];

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as ManagedRentalItem[];
        if (!Array.isArray(parsed)) return [];

        return parsed.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    } catch {
        return [];
    }
}

function writeStorage(rentals: ManagedRentalItem[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rentals));
}

export async function listManagedRentals() {
    return readStorage();
}

export async function getManagedRentalById(rentalId: string) {
    const rentals = readStorage();
    return rentals.find((item) => item.rental_id === rentalId) ?? null;
}

export async function createManagedRental(payload: CreateManagedRentalInput) {
    const rental: ManagedRentalItem = {
        rental_id: createRentalId(),
        user_id: payload.user_id,
        title: payload.title.trim(),
        summary: payload.summary?.trim(),
        description: payload.description?.trim(),
        city: payload.city.trim(),
        district: payload.district.trim(),
        address: payload.address.trim(),
        property_type: payload.property_type,
        available_room: payload.available_room,
        status: payload.status,
        created_at: new Date().toISOString(),
        thumbnail_url: payload.thumbnail_url?.trim() || undefined,
    };

    const current = readStorage();
    const next = [rental, ...current];
    writeStorage(next);
    return rental;
}

export async function updateManagedRentalStatus(
    rentalId: string,
    status: ManagedRentalItem['status']
) {
    const current = readStorage();
    const next = current.map((rental) =>
        rental.rental_id === rentalId
            ? {
                ...rental,
                status,
            }
            : rental
    );
    writeStorage(next);
    return next.find((item) => item.rental_id === rentalId) ?? null;
}
