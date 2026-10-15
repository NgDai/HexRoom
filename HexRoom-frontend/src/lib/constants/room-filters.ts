/**
 * Shared filter constants and helpers for HexRoom
 * Used across HomePage, RoomsPage, and SearchPage
 */

export interface CityOption {
    name: string;
    label: string;
    districts: string[];
}

export const POPULAR_LOCATIONS: CityOption[] = [
    {
        name: 'Hồ Chí Minh',
        label: 'TP. Hồ Chí Minh',
        districts: [
            'Quận Bình Thạnh',
            'Quận 1',
            'Quận 3',
            'Quận 7',
            'Quận 10',
            'Quận Gò Vấp',
            'Quận Tân Bình',
            'Quận Phú Nhuận',
            'TP. Thủ Đức',
            'Quận 5',
            'Quận 8',
            'Quận 12',
            'Quận Tân Phú',
            'Quận Bình Tân'
        ]
    },
    {
        name: 'Hà Nội',
        label: 'Hà Nội',
        districts: [
            'Quận Cầu Giấy',
            'Quận Đống Đa',
            'Quận Ba Đình',
            'Quận Hai Bà Trưng',
            'Quận Thanh Xuân',
            'Quận Nam Từ Liêm',
            'Quận Bắc Từ Liêm',
            'Quận Tây Hồ',
            'Quận Hà Đông',
            'Quận Hoàng Mai',
            'Quận Long Biên'
        ]
    },
    {
        name: 'Đà Nẵng',
        label: 'Đà Nẵng',
        districts: [
            'Quận Hải Châu',
            'Quận Sơn Trà',
            'Quận Ngũ Hành Sơn',
            'Quận Thanh Khê',
            'Quận Liên Chiểu',
            'Quận Cẩm Lệ'
        ]
    },
    {
        name: 'Bình Dương',
        label: 'Bình Dương',
        districts: [
            'TP. Thủ Dầu Một',
            'TP. Thuận An',
            'TP. Dĩ An',
            'Thị xã Bến Cát',
            'Thị xã Tân Uyên'
        ]
    },
    {
        name: 'Cần Thơ',
        label: 'Cần Thơ',
        districts: [
            'Quận Ninh Kiều',
            'Quận Cái Răng',
            'Quận Bình Thủy',
            'Quận Ô Môn'
        ]
    },
    {
        name: 'Hải Phòng',
        label: 'Hải Phòng',
        districts: [
            'Quận Hồng Bàng',
            'Quận Ngô Quyền',
            'Quận Lê Chân',
            'Quận Hải An'
        ]
    }
];

export const FILTER_ROOM_TYPES = [
    { value: '', label: 'Tất cả loại phòng' },
    { value: 'STUDIO', label: 'Căn hộ Studio' },
    { value: 'SINGLE', label: 'Phòng đơn khép kín' },
    { value: 'SHARED', label: 'Ở ghép / Coliving' },
    { value: 'APARTMENT', label: 'Căn hộ mini / Chung cư' },
    { value: 'WHOLE_HOUSE', label: 'Nhà nguyên căn' }
];

export interface PricePresetItem {
    id: string;
    label: string;
    min?: number;
    max?: number;
}

export const FILTER_PRICE_PRESETS: PricePresetItem[] = [
    { id: 'any', label: 'Mọi mức giá' },
    { id: 'lt2m', max: 2_000_000, label: 'Dưới 2 triệu' },
    { id: '2_4m', min: 2_000_000, max: 4_000_000, label: '2 - 4 triệu' },
    { id: '4_7m', min: 4_000_000, max: 7_000_000, label: '4 - 7 triệu' },
    { id: '7_12m', min: 7_000_000, max: 12_000_000, label: '7 - 12 triệu' },
    { id: 'gt12m', min: 12_000_000, label: 'Trên 12 triệu' }
];

export interface SizePresetItem {
    id: string;
    label: string;
    min?: number;
    max?: number;
}

export const FILTER_SIZE_PRESETS: SizePresetItem[] = [
    { id: 'any', label: 'Mọi diện tích' },
    { id: 'lt20', max: 20, label: 'Dưới 20m²' },
    { id: '20_30', min: 20, max: 30, label: '20 - 30m²' },
    { id: '30_45', min: 30, max: 45, label: '30 - 45m²' },
    { id: 'gt45', min: 45, label: 'Trên 45m²' }
];

export interface AmenityFilterItem {
    id: string;
    name: string;
    label: string;
    icon: string;
}

export const FILTER_AMENITIES: AmenityFilterItem[] = [
    { id: 'air_cond', name: 'Máy lạnh', label: 'Máy lạnh / Điều hòa', icon: '❄️' },
    { id: 'washing_machine', name: 'Máy giặt', label: 'Máy giặt', icon: '🧺' },
    { id: 'fridge', name: 'Tủ lạnh', label: 'Tủ lạnh', icon: '🧊' },
    { id: 'mezzanine', name: 'Gác lửng', label: 'Gác lửng / Gác xép', icon: '🪜' },
    { id: 'balcony', name: 'Ban công', label: 'Ban công / Cửa sổ lớn', icon: '🌿' },
    { id: 'elevator', name: 'Thang máy', label: 'Thang máy', icon: '🛗' },
    { id: 'fingerprint_lock', name: 'Khóa vân tay', label: 'Khóa vân tay', icon: '🔐' },
    { id: 'kitchen', name: 'Bếp', label: 'Bếp riêng / Nấu ăn', icon: '🍳' },
    { id: 'parking', name: 'Bãi giữ xe', label: 'Chỗ để xe', icon: '🛵' },
    { id: 'free_time', name: 'Giờ tự do', label: 'Giờ giấc tự do', icon: '🕒' },
    { id: 'no_landlord', name: 'Không chung chủ', label: 'Không chung chủ', icon: '🔑' },
    { id: 'pet_allowed', name: 'Thú cưng', label: 'Cho nuôi thú cưng', icon: '🐾' }
];

export const FILTER_SORT_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price_asc', label: 'Giá: Thấp đến cao' },
    { value: 'price_desc', label: 'Giá: Cao đến thấp' },
    { value: 'size_desc', label: 'Diện tích lớn nhất' }
] as const;


export interface UniversityOption {
    id: string;
    name: string;
    shortName: string;
    city: string;
    district: string;
}

export const POPULAR_UNIVERSITIES: UniversityOption[] = [
    { id: 'hcmut', name: 'Đại học Bách Khoa TP.HCM', shortName: 'ĐH Bách Khoa', city: 'Hồ Chí Minh', district: 'Quận 10' },
    { id: 'ueh', name: 'Đại học Kinh Tế TP.HCM (UEH)', shortName: 'ĐH Kinh Tế', city: 'Hồ Chí Minh', district: 'Quận 3' },
    { id: 'ftu2', name: 'Đại học Ngoại Thương CS2', shortName: 'ĐH Ngoại Thương', city: 'Hồ Chí Minh', district: 'Quận Bình Thạnh' },
    { id: 'rmit', name: 'Đại học Quốc Tế RMIT', shortName: 'RMIT', city: 'Hồ Chí Minh', district: 'Quận 7' },
    { id: 'hutech', name: 'Đại học Công Nghệ TP.HCM (HUTECH)', shortName: 'HUTECH', city: 'Hồ Chí Minh', district: 'Quận Bình Thạnh' },
    { id: 'vnuhcm', name: 'Đại học Quốc Gia TP.HCM', shortName: 'ĐHQG TP.HCM', city: 'Hồ Chí Minh', district: 'TP. Thủ Đức' },
    { id: 'uel', name: 'Đại học Kinh Tế - Luật', shortName: 'Kinh Tế - Luật', city: 'Hồ Chí Minh', district: 'TP. Thủ Đức' },
    { id: 'hust', name: 'Đại học Bách Khoa Hà Nội', shortName: 'Bách Khoa HN', city: 'Hà Nội', district: 'Quận Hai Bà Trưng' },
    { id: 'neu', name: 'Đại học Kinh Tế Quốc Dân (NEU)', shortName: 'NEU', city: 'Hà Nội', district: 'Quận Hai Bà Trưng' },
    { id: 'ftu1', name: 'Đại học Ngoại Thương Hà Nội', shortName: 'Ngoại Thương HN', city: 'Hà Nội', district: 'Quận Đống Đa' },
    { id: 'vnu_hn', name: 'Đại học Quốc Gia Hà Nội', shortName: 'ĐHQG Hà Nội', city: 'Hà Nội', district: 'Quận Cầu Giấy' }
];

export interface PolicyFilterItem {
    id: string;
    label: string;
    icon: string;
    keyword: string;
}

export const FILTER_POLICIES: PolicyFilterItem[] = [
    { id: 'no_curfew', label: 'Giờ giấc tự do 24/7', icon: '🕒', keyword: 'tự do' },
    { id: 'no_landlord', label: 'Không chung chủ', icon: '🔑', keyword: 'không chung chủ' },
    { id: 'pet_allowed', label: 'Cho phép nuôi thú cưng', icon: '🐾', keyword: 'thú cưng' },
    { id: 'smart_lock', label: 'Khóa vân tay / Thẻ từ', icon: '🔐', keyword: 'vân tay' },
    { id: 'free_parking', label: 'Miễn phí chỗ để xe', icon: '🛵', keyword: 'giữ xe' },
    { id: 'govt_elec', label: 'Điện chuẩn giá dân', icon: '⚡', keyword: 'giá dân' }
];

export const FILTER_TARGET_TENANTS = [
    { value: '', label: 'Tất cả đối tượng' },
    { value: 'student', label: 'Sinh viên' },
    { value: 'female_only', label: 'Chỉ cho Nữ' },
    { value: 'male_only', label: 'Chỉ cho Nam' },
    { value: 'working', label: 'Người đi làm' },
    { value: 'family', label: 'Cặp đôi / Gia đình' }
];
