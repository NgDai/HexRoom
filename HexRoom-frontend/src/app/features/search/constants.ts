export const SORT_OPTIONS = [
    { value: 'relevant', labelKey: 'search.sort.mostRelevant' },
    { value: 'price-asc', labelKey: 'search.sort.priceAsc' },
    { value: 'price-desc', labelKey: 'search.sort.priceDesc' },
    { value: 'area-asc', labelKey: 'search.sort.areaAsc' },
    { value: 'area-desc', labelKey: 'search.sort.areaDesc' },
    { value: 'rating', labelKey: 'search.sort.topRated' },
];

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Sentinel for image search 403 VIP-only — UI shows upgrade CTA instead of raw API text. */
export const VIP_IMAGE_SEARCH_ERROR = 'VIP_IMAGE_SEARCH_FORBIDDEN';