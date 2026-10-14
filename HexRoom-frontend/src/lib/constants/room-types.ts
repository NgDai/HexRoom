/**
 * Shared room type definitions.
 * Single source of truth for FE room type options and labels.
 */

export const ROOM_TYPE_OPTIONS = [
    { value: '', label: 'Loại phòng' },
    { value: 'single', label: 'Phòng đơn' },
    { value: 'double', label: 'Phòng đôi' },
    { value: 'studio', label: 'Studio' },
    { value: 'apartment', label: 'Căn hộ' },
] as const;

export const ROOM_TYPE_LABELS: Record<string, string> = {
    single: 'Phòng đơn',
    double: 'Phòng đôi',
    studio: 'Studio',
    apartment: 'Căn hộ',
    PRIVATE: 'Phòng đơn',
    SHARED: 'Phòng đôi',
    STUDIO: 'Studio',
    APARTMENT: 'Căn hộ',
};

export function getRoomTypeLabel(value: string): string {
    return ROOM_TYPE_LABELS[value] ?? value;
}
