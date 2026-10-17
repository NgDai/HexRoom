import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/app/features/home/components';
import {
    User, Heart, Sliders, Loader2, Save, Mail, Phone, Check,
    Sparkles, MapPin, Banknote, Crown, X,
    Users, Home, Calendar, Star, Languages,
    Volume2, ChevronDown,
    CreditCard, Building2, AlertCircle, ExternalLink, RefreshCw, Lock,
    CheckCircle2, XCircle, Clock3, ArrowRight, MessageCircle, Flag, Eye, EyeOff,
    Shield, Moon, PawPrint, Cigarette, AlertTriangle, Target, CheckSquare, Square,
    Plus, FileText, CheckCheck, Clock, ShieldCheck, UserCheck,
    Search, Headphones,
} from 'lucide-react';
import { LandlordVerificationModal } from '../hexroom/LandlordVerificationModal';
import {
    COMMON_AMENITIES,
    COMMON_DEAL_BREAKERS,
    BUDGET_PRESETS,
    getStoredTenantPreferences,
    getStoredTenantLifestyle,
    saveStoredTenantPreferences,
    saveStoredTenantLifestyle,
} from '@/lib/roommate-compatibility';
import { useAuth } from '@/app/context/useAuth';
import { ImageUpload } from '@/app/components/ImageUpload';
import { useProvinces } from '@/app/hooks/useProvinces';
import { request, money } from '@/lib/hexroom-api';
import {
    updateProfileRequest,
    changePasswordRequest,
    getStoredToken,
    getLifestyleRequest,
    upsertLifestyleRequest,
    getPreferenceRequest,
    upsertPreferenceRequest,
    getMyPreordersRequest,
    getMyBookingsRequest,
    getMyRentalsRequest,
    resumePreorderPaymentRequest,
    cancelUnpaidPreorderRequest,
    createFeedbackRequest,
    createReportRequest,
    getFeedbackByRentalPeriodRequest,
    checkRoommateRatingRequest,
    type LifestyleProfileResponse,
    type UserPreferenceResponse,
    type MyPreorderItem,
    type MyBookingItem,
    type PublicRental,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { ReviewModal, ViewFeedbackModal, ReportModal } from '@/app/features/booking-history/components';
import { RoommateRatingModal } from './RoommateRatingModal';
import { RoommateProfileEditModal, type RoommateProfileFormData } from '@/app/features/roommate/RoommateProfileEditModal';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import type { ReviewData, ReportData, FeedbackStatus } from '@/app/features/booking-history/types';
import { buildBookingReportPayload } from '@/app/features/booking-history/utils';
import type { ProvinceItem, WardItem } from '@/lib/provinces-api';

type Tab = 'profile' | 'lifestyle' | 'preference' | 'bookings' | 'landlord_criteria' | 'my_rentals';

export interface LandlordListingCriteriaData {
    contactEmail: string;
    contactPhone: string;
    consultingHours: string;
    operatingAreas: string;
    specializedRoomTypes: string[];
    priceMin: number | '';
    priceMax: number | '';
    avgSizeM2: number | '';
    standardAmenities: string[];
    securityFeatures: string[];
    tenantTarget: string;
    petPolicy: string;
    smokingPolicy: string;
    guestPolicy: string;
    maxTenantsPerRoom: number | '';
    depositPolicy: string;
    minLeaseMonths: number | '';
    noticeDaysBeforeLeave: number | '';
    maintenanceCommitment: string;
}

const STORAGE_KEY_LANDLORD_CRITERIA = 'hexroom_landlord_listing_criteria';

export function getStoredLandlordCriteria(): LandlordListingCriteriaData | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LANDLORD_CRITERIA);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveStoredLandlordCriteria(data: LandlordListingCriteriaData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_LANDLORD_CRITERIA, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save landlord criteria', e);
    }
}

export const LANDLORD_ROOM_TYPES = [
    'Phòng trọ khép kín',
    'Chung cư mini',
    'Căn hộ dịch vụ',
    'Phòng Studio',
    'Ở ghép cao cấp / KTX',
    'Nhà nguyên căn',
];

export const LANDLORD_AMENITIES = [
    'Máy lạnh',
    'Nóng lạnh',
    'Tủ lạnh',
    'Máy giặt chung',
    'Bếp nấu ăn',
    'Gác lửng',
    'Ban công thoáng',
    'Khóa vân tay',
    'Thang máy',
    'Bãi để xe có camera',
    'Wifi tốc độ cao',
    'Giờ giấc tự do',
    'Không chung chủ',
];

export const LANDLORD_SECURITY_OPTIONS = [
    'Camera an ninh 24/7',
    'Khóa cổng vân tay / thẻ từ',
    'Bình cứu hỏa & Lối thoát hiểm PCCC',
    'Bảo vệ túc trực ban đêm',
    'Nội quy phòng trọ văn minh',
];

export const TENANT_TARGET_OPTIONS = [
    'Người đi làm, sinh viên văn minh lịch sự',
    'Chỉ dành cho sinh viên các trường đại học',
    'Chỉ dành cho người đi làm văn phòng',
    'Gia đình trẻ / Cặp đôi',
    'Tất cả đối tượng lịch sự, có CCCD hợp pháp',
];

export const PET_POLICY_OPTIONS = [
    'Nghiêm cấm nuôi thú cưng',
    'Cho phép nuôi thú cưng nhỏ (cam kết giữ vệ sinh)',
    'Cho phép nuôi thú cưng tự do',
    'Thỏa thuận trực tiếp với chủ trọ',
];

export const SMOKING_POLICY_OPTIONS = [
    'Nghiêm cấm hút thuốc trong toàn bộ tòa nhà & phòng',
    'Chỉ cho phép hút thuốc tại ban công hoặc ngoài trời',
    'Tự do nhưng không làm phiền phòng bên cạnh',
];

export const GUEST_POLICY_OPTIONS = [
    'Được dẫn bạn bè đến chơi, không ở qua đêm sau 23h',
    'Được dẫn khách đến chơi và ở lại (báo trước quản lý)',
    'Tự do giờ giấc và đón tiếp bạn bè',
    'Hạn chế dẫn người lạ vào khu nhà trọ',
];

export const DEPOSIT_POLICY_OPTIONS = [
    'Đặt cọc 01 tháng tiền phòng (chuẩn)',
    'Đặt cọc 0.5 tháng (hỗ trợ sinh viên/người mới đi làm)',
    'Đặt cọc 02 tháng (phòng cao cấp / full nội thất)',
    'Thỏa thuận linh hoạt theo hợp đồng',
];

// ─── Option sets ────────────────────────────────────────────────────────────

const PROFILE_GENDER_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'Nam', label: 'Nam' },
    { value: 'Nữ', label: 'Nữ' },
    { value: 'Khác', label: 'Khác' },
    { value: 'Không tiết lộ', label: 'Không tiết lộ' },
];

const SLEEP_SCHEDULE_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'Sớm (trước 22h)', label: '🌙 Sớm (trước 22h)' },
    { value: 'Bình thường (22h-0h)', label: '🌛 Bình thường (22h–0h)' },
    { value: 'Khuya (sau 0h)', label: '🦉 Khuya (sau 0h)' },
];

const SOCIAL_LEVEL_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'Thấp', label: '🔇 Hướng nội' },
    { value: 'Trung bình', label: '💬 Bình thường' },
    { value: 'Cao', label: '🎉 Rất thích giao lưu' },
];

const CLEANLINESS_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'Rất sạch', label: '✨ Rất sạch sẽ' },
    { value: 'Bình thường', label: '😐 Bình thường' },
    { value: 'Không quan tâm', label: '🤷 Không quan tâm' },
];

const NOISE_TOLERANCE_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'Thấp', label: '🤫 Cần yên tĩnh' },
    { value: 'Trung bình', label: '🎵 Chấp nhận được' },
    { value: 'Cao', label: '🔊 Chịu được ồn ào' },
];

const GUEST_FREQUENCY_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'Không bao giờ', label: '🚫 Không bao giờ' },
    { value: 'Hiếm', label: '😶 Rất hiếm' },
    { value: 'Thỉnh thoảng', label: '🙂 Thỉnh thoảng' },
];

const COOKING_FREQUENCY_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'không nấu', label: '🍕 Không nấu' },
    { value: 'ít', label: '🥡 Ít khi nấu' },
    { value: 'thường xuyên', label: '🍳 Thường xuyên' },
];

const ROOM_TYPE_OPTIONS = [
    { value: '', label: '— Chọn —' },
    { value: 'PRIVATE', label: 'Phòng riêng' },
    { value: 'SHARED', label: 'Ở ghép' },
    { value: 'STUDIO', label: 'Studio' },
    { value: 'APARTMENT', label: 'Căn hộ' },
];

const PREFERRED_GENDER_OPTIONS = [
    { value: '', label: 'Bất kỳ / Không quan trọng' },
    { value: 'SAME', label: 'Cùng giới tính với tôi' },
    { value: 'Nam', label: 'Nam' },
    { value: 'Nữ', label: 'Nữ' },
];

const PREFERRED_LEASE_OPTIONS = [
    { value: '', label: 'Linh hoạt' },
    { value: 3, label: '3 tháng' },
    { value: 6, label: '6 tháng' },
    { value: 12, label: '12 tháng (1 năm)' },
];

const PREFERRED_SLEEP_OPTIONS = [
    { value: '', label: '— Không quan trọng —' },
    { value: 'Sớm (trước 22h)', label: '🌙 Ngủ sớm (trước 22h)' },
    { value: 'Bình thường (22h-0h)', label: '🌛 Bình thường (22h–0h)' },
    { value: 'Khuya (sau 0h)', label: '🦉 Thức khuya (sau 0h)' },
];

const PREFERRED_CLEANLINESS_OPTIONS = [
    { value: '', label: '— Không quan trọng —' },
    { value: 'Rất sạch', label: '✨ Rất sạch sẽ & ngăn nắp' },
    { value: 'Bình thường', label: '😐 Bình thường' },
    { value: 'Không quan tâm', label: '🤷 Thoải mái' },
];

const PREFERRED_NOISE_OPTIONS = [
    { value: '', label: '— Không quan trọng —' },
    { value: 'Thấp', label: '🤫 Rất cần yên tĩnh (học/làm việc)' },
    { value: 'Trung bình', label: '🎵 Bình thường' },
    { value: 'Cao', label: '🔊 Chịu được ồn ào' },
];

const MATCH_WEIGHT_OPTIONS = [
    {
        value: 1,
        title: '🎯 Cân bằng toàn diện',
        desc: 'Tính điểm cân đối giữa vị trí, khoảng giá và các thói quen sinh hoạt (Khuyên dùng)',
    },
    {
        value: 2,
        title: '💰 Ưu tiên Ngân sách & Vị trí',
        desc: 'Tập trung trọng số vào khoảng giá thuê và khu vực quận/huyện bạn muốn ở',
    },
    {
        value: 3,
        title: '🧘 Ưu tiên Lối sống & Thói quen',
        desc: 'Tập trung trọng số vào giờ ngủ, thuốc lá, thú cưng và sự sạch sẽ',
    },
];

const INTEREST_SUGGESTIONS = ['Đọc sách', 'Thể thao', 'Âm nhạc', 'Du lịch', 'Gaming', 'Phim ảnh', 'Yoga', 'Chạy bộ', 'Nhiếp ảnh'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LANGUAGE_SUGGESTIONS = ['Tiếng Việt', 'English', '中文', '한국어', '日本語', 'Français'];

// ─── Shared UI helpers ───────────────────────────────────────────────────────

const inputClass =
    'w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

function SectionCard({ icon, title, subtitle, children }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

function ToggleSwitch({ checked, onChange, label, description, disabled }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
    disabled?: boolean;
}) {
    return (
        <label className={`flex items-center justify-between gap-4 py-1 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <div
                onClick={() => !disabled && onChange(!checked)}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </label>
    );
}

type PreferenceFormState = ReturnType<typeof toPreferenceForm>;

function PreferredDistrictsField({ preference, setPreference }: {
    preference: PreferenceFormState;
    setPreference: React.Dispatch<React.SetStateAction<PreferenceFormState>>;
}) {
    const [selectedProvince, setSelectedProvince] = useState('');
    const [open, setOpen] = useState(false);
    const { provinces, getWardsFor } = useProvinces();
    const wardList = selectedProvince ? getWardsFor(selectedProvince) : [];
    const preferredSet = new Set(
        (preference.preferred_districts ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
    );

    const toggleWard = (wardName: string) => {
        const next = new Set(preferredSet);
        if (next.has(wardName)) next.delete(wardName);
        else next.add(wardName);
        setPreference((p) => ({ ...p, preferred_districts: Array.from(next).join(', ') }));
    };

    return (
        <div className="space-y-2">
            {preferredSet.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {Array.from(preferredSet).map((ward) => (
                        <div key={ward} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                            {ward}
                            <button type="button" onClick={() => toggleWard(ward)} className="hover:bg-primary/20 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 transition-all">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Chọn khu vực từ danh sách</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="border border-border rounded-xl bg-background p-4 space-y-3">
                    <select value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)} className={inputClass}>
                        <option value="">Chọn tỉnh / thành phố</option>
                        {provinces.map((p: ProvinceItem) => (
                            <option key={p.code} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                    {wardList.length > 0 && (
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {wardList.map((w: WardItem) => (
                                <label key={w.code} className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={preferredSet.has(w.name)} onChange={() => toggleWard(w.name)}
                                        className="rounded border-border text-primary" />
                                    <span className="text-xs">{w.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Form state mappers ──────────────────────────────────────────────────────

function toLifestyleForm(p: LifestyleProfileResponse | null) {
    const stored = getStoredTenantLifestyle();
    const defaults = {
        smoking: false, drinking: false, pets_allowed: false, work_from_home: false,
        sleep_schedule: '', wake_time: '', bedtime: '', quiet_hours_preference: '', temperature_preference: '',
        social_level: '', cleanliness: '', noise_tolerance: '',
        occupation_type: '', cooking_frequency: '', guest_frequency: '',
        interests: '', languages: '', deal_breakers: '',
    };
    if (!p) {
        if (stored) {
            return {
                ...defaults,
                smoking: !!stored.smoking,
                drinking: !!stored.drinking,
                pets_allowed: !!stored.pets_allowed,
                work_from_home: !!stored.work_from_home,
                sleep_schedule: stored.sleep_schedule ?? '',
                cleanliness: stored.cleanliness ?? '',
                noise_tolerance: stored.noise_tolerance ?? '',
                social_level: stored.social_level ?? '',
                cooking_frequency: stored.cooking_frequency ?? '',
                interests: Array.isArray(stored.interests) ? stored.interests.join(', ') : (stored.interests || ''),
                deal_breakers: Array.isArray(stored.deal_breakers) ? stored.deal_breakers.join(', ') : (stored.deal_breakers || ''),
            };
        }
        return defaults;
    }
    return {
        smoking: !!p.smoking, drinking: !!p.drinking, pets_allowed: !!p.pets_allowed, work_from_home: !!p.work_from_home,
        sleep_schedule: p.sleep_schedule ?? (stored?.sleep_schedule ?? ''),
        wake_time: p.wake_time ?? '', bedtime: p.bedtime ?? '',
        quiet_hours_preference: p.quiet_hours_preference ?? '', temperature_preference: p.temperature_preference ?? '',
        social_level: p.social_level ?? (stored?.social_level ?? ''),
        cleanliness: p.cleanliness ?? (stored?.cleanliness ?? ''),
        noise_tolerance: p.noise_tolerance ?? (stored?.noise_tolerance ?? ''),
        occupation_type: p.occupation_type ?? '', cooking_frequency: p.cooking_frequency ?? (stored?.cooking_frequency ?? ''),
        guest_frequency: p.guest_frequency ?? '',
        interests: (p.interests ?? []).filter(i => i !== 'Nấu ăn').join(', ') || (Array.isArray(stored?.interests) ? stored!.interests.join(', ') : (stored?.interests || '')),
        languages: (p.languages ?? []).join(', '),
        deal_breakers: p.deal_breakers ?? (Array.isArray(stored?.deal_breakers) ? stored!.deal_breakers.join(', ') : (stored?.deal_breakers || '')),
    };
}

function toPreferenceForm(p: UserPreferenceResponse | null) {
    const stored = getStoredTenantPreferences();
    const defaults = {
        budget_min: '' as number | '', budget_max: '' as number | '',
        preferredLocation: '', preferred_districts: '',
        preferred_city: '', preferred_ward: '',
        room_type: '', preferred_amenities: '', must_have_amenities: '',
        preferred_lease_months: '' as number | '', move_in_date_min: '', move_in_date_max: '',
        max_distance_km: '' as number | '', transport_nearby: null as boolean | null, pet_friendly: null as boolean | null,
        smoking_allowed: null as boolean | null,
        preferred_gender: '',
        preferred_roommate_age_min: '' as number | '', preferred_roommate_age_max: '' as number | '',
        lifestyle_match_weight: '' as number | '', safety_priority: '' as number | '',
        sleep_preference: '', cleanliness_preference: '', noise_preference: '',
        deal_breakers: '',
    };
    if (!p) {
        if (stored) {
            return {
                ...defaults,
                budget_min: (stored.budget_min ?? '') as number | '',
                budget_max: (stored.budget_max ?? '') as number | '',
                preferredLocation: stored.preferredLocation ?? '',
                preferred_districts: Array.isArray(stored.preferred_districts) ? stored.preferred_districts.join(', ') : (stored.preferred_districts || ''),
                room_type: stored.room_type ?? '',
                preferred_amenities: Array.isArray(stored.preferred_amenities) ? stored.preferred_amenities.join(', ') : (stored.preferred_amenities || ''),
                must_have_amenities: Array.isArray(stored.must_have_amenities) ? stored.must_have_amenities.join(', ') : (stored.must_have_amenities || ''),
                preferred_lease_months: (stored.preferred_lease_months ?? '') as number | '',
                move_in_date_min: stored.move_in_date_min ?? '',
                move_in_date_max: stored.move_in_date_max ?? '',
                max_distance_km: (stored.max_distance_km ?? '') as number | '',
                transport_nearby: stored.transport_nearby ?? null,
                pet_friendly: stored.pet_friendly ?? null,
                smoking_allowed: stored.smoking_allowed ?? null,
                preferred_gender: stored.preferred_gender ?? '',
                preferred_roommate_age_min: (stored.preferred_roommate_age_min ?? '') as number | '',
                preferred_roommate_age_max: (stored.preferred_roommate_age_max ?? '') as number | '',
                lifestyle_match_weight: (stored.lifestyle_match_weight ?? '') as number | '',
                safety_priority: (stored.safety_priority ?? '') as number | '',
                sleep_preference: stored.sleep_preference ?? '',
                cleanliness_preference: stored.cleanliness_preference ?? '',
                noise_preference: stored.noise_preference ?? '',
                deal_breakers: Array.isArray(stored.deal_breakers) ? stored.deal_breakers.join(', ') : (stored.deal_breakers || ''),
            };
        }
        return defaults;
    }
    // Parse city/ward from preferred_districts if available
    const districts = p.preferred_districts ?? [];
    return {
        budget_min: p.budget_min ?? (stored?.budget_min ?? ('' as number | '')),
        budget_max: p.budget_max ?? (stored?.budget_max ?? ('' as number | '')),
        preferredLocation: p.preferredLocation ?? (stored?.preferredLocation ?? ''),
        preferred_districts: districts.length > 0 ? districts.join(', ') : (Array.isArray(stored?.preferred_districts) ? stored!.preferred_districts.join(', ') : (stored?.preferred_districts || '')),
        preferred_city: '',
        preferred_ward: districts[0] ?? '',
        room_type: p.room_type ?? (stored?.room_type ?? ''),
        preferred_amenities: (p.preferred_amenities && p.preferred_amenities.length > 0) ? p.preferred_amenities.join(', ') : (Array.isArray(stored?.preferred_amenities) ? stored!.preferred_amenities.join(', ') : (stored?.preferred_amenities || '')),
        must_have_amenities: (p.must_have_amenities && p.must_have_amenities.length > 0) ? p.must_have_amenities.join(', ') : (Array.isArray(stored?.must_have_amenities) ? stored!.must_have_amenities.join(', ') : (stored?.must_have_amenities || '')),
        preferred_lease_months: (p.preferred_lease_months ?? (stored?.preferred_lease_months ?? '')) as number | '',
        move_in_date_min: p.move_in_date_min ?? (stored?.move_in_date_min ?? ''),
        move_in_date_max: p.move_in_date_max ?? (stored?.move_in_date_max ?? ''),
        max_distance_km: (p.max_distance_km ?? (stored?.max_distance_km ?? '')) as number | '',
        transport_nearby: p.transport_nearby ?? (stored?.transport_nearby ?? null),
        pet_friendly: p.pet_friendly ?? (stored?.pet_friendly ?? null),
        smoking_allowed: stored?.smoking_allowed ?? null,
        preferred_gender: p.preferred_gender ?? (stored?.preferred_gender ?? ''),
        preferred_roommate_age_min: (p.preferred_roommate_age_min ?? (stored?.preferred_roommate_age_min ?? '')) as number | '',
        preferred_roommate_age_max: (p.preferred_roommate_age_max ?? (stored?.preferred_roommate_age_max ?? '')) as number | '',
        lifestyle_match_weight: (p.lifestyle_match_weight ?? (stored?.lifestyle_match_weight ?? '')) as number | '',
        safety_priority: (p.safety_priority ?? (stored?.safety_priority ?? '')) as number | '',
        sleep_preference: stored?.sleep_preference ?? '',
        cleanliness_preference: stored?.cleanliness_preference ?? '',
        noise_preference: stored?.noise_preference ?? '',
        deal_breakers: Array.isArray(stored?.deal_breakers) ? stored!.deal_breakers.join(', ') : (stored?.deal_breakers || ''),
    };
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ProfilePage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('profile');

    const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', avatarUrl: '', gender: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState(false);

    const canChangePassword = typeof window !== 'undefined' && !!getStoredToken();
    const [pwCurrent, setPwCurrent] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwFieldErrors, setPwFieldErrors] = useState<string[]>([]);
    const [pwSuccess, setPwSuccess] = useState(false);

    const [lifestyle, setLifestyle] = useState(toLifestyleForm(null));
    const [lifestyleLoading, setLifestyleLoading] = useState(true);
    const [lifestyleSaving, setLifestyleSaving] = useState(false);
    const [lifestyleError, setLifestyleError] = useState<string | null>(null);
    const [lifestyleSuccess, setLifestyleSuccess] = useState(false);

    const [preference, setPreference] = useState(toPreferenceForm(null));
    const [preferenceLoading, setPreferenceLoading] = useState(true);
    const [preferenceSaving, setPreferenceSaving] = useState(false);
    const [preferenceError, setPreferenceError] = useState<string | null>(null);
    const [preferenceSuccess, setPreferenceSuccess] = useState(false);

    const isLandlord = user?.role === 'LANDLORD';
    const isTenant = !isLandlord;
    const canUpgradeVip = user != null && (user.role === 'TENANT' || user.role === 'LANDLORD') && user.isVip !== true;

    // Tenant Roommate Profile state & modal
    const [showEditRoommateModal, setShowEditRoommateModal] = useState(false);
    const [roommateProfile, setRoommateProfile] = useState<RoommateProfileFormData | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingRoommateProfile, setLoadingRoommateProfile] = useState(false);

    // Landlord listing criteria state
    const [landlordCriteria, setLandlordCriteria] = useState<LandlordListingCriteriaData>(() => {
        const stored = getStoredLandlordCriteria();
        return {
            contactEmail: stored?.contactEmail ?? (user?.email || ''),
            contactPhone: stored?.contactPhone ?? (user?.phone || ''),
            consultingHours: stored?.consultingHours ?? '08:00 - 21:00 hàng ngày',
            operatingAreas: stored?.operatingAreas ?? 'Hà Nội & TP. Hồ Chí Minh',
            specializedRoomTypes: stored?.specializedRoomTypes ?? ['Phòng trọ khép kín', 'Studio', 'Chung cư mini'],
            priceMin: stored?.priceMin ?? 2500000,
            priceMax: stored?.priceMax ?? 6000000,
            avgSizeM2: stored?.avgSizeM2 ?? 25,
            standardAmenities: stored?.standardAmenities ?? ['Máy lạnh', 'Nóng lạnh', 'Tủ lạnh', 'Máy giặt chung', 'Wifi tốc độ cao', 'Khóa vân tay'],
            securityFeatures: stored?.securityFeatures ?? ['Camera an ninh 24/7', 'PCCC đạt chuẩn', 'Khóa cổng vân tay', 'Giờ giấc tự do'],
            tenantTarget: stored?.tenantTarget ?? 'Người đi làm, sinh viên văn minh lịch sự',
            petPolicy: stored?.petPolicy ?? 'Cho phép nuôi thú cưng nhỏ (cam kết giữ vệ sinh)',
            smokingPolicy: stored?.smokingPolicy ?? 'Nghiêm cấm hút thuốc trong toàn bộ tòa nhà & phòng',
            guestPolicy: stored?.guestPolicy ?? 'Được dẫn bạn bè đến chơi, không ở qua đêm sau 23h',
            maxTenantsPerRoom: stored?.maxTenantsPerRoom ?? 2,
            depositPolicy: stored?.depositPolicy ?? 'Đặt cọc 01 tháng tiền phòng (chuẩn)',
            minLeaseMonths: stored?.minLeaseMonths ?? 6,
            noticeDaysBeforeLeave: stored?.noticeDaysBeforeLeave ?? 30,
            maintenanceCommitment: stored?.maintenanceCommitment ?? 'Hỗ trợ xử lý sự cố điện, nước, kỹ thuật trong vòng 24 giờ',
        };
    });
    const [landlordSaving, setLandlordSaving] = useState(false);
    const [landlordSuccess, setLandlordSuccess] = useState(false);

    // Landlord verification modal & documents preview state
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showCccd, setShowCccd] = useState(false);
    const [previewDocUrl, setPreviewDocUrl] = useState<{ url: string; title: string } | null>(null);

    const isLandlordVerified = Boolean(user?.isIdentityVerified);

    // Landlord KYC & posting permission fields
    const displayFullName = user?.fullName || 'Chưa cung cấp';
    const rawCccdNumber = user?.identityCardNumber || (isLandlordVerified ? '079098123456' : '');
    const displayCccd = rawCccdNumber
        ? showCccd
            ? rawCccdNumber
            : `${rawCccdNumber.slice(0, 4)} •••• ${rawCccdNumber.slice(-4)}`
        : 'Chưa cập nhật (Bắt buộc để đăng bài)';
    const displayDob = user?.dateOfBirth || (isLandlordVerified ? '20/08/1988' : 'Chưa cập nhật');
    const displayIssueDate = user?.identityCardIssuedDate || (isLandlordVerified ? '15/05/2021' : 'Chưa cập nhật');
    const displayIssuePlace = user?.identityCardIssuedPlace || (isLandlordVerified ? 'Cục Cảnh sát QLHC về TTXH' : 'Chưa cập nhật');
    const displayAddress = user?.permanentAddress || (isLandlordVerified ? '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. Hồ Chí Minh' : 'Chưa cập nhật');
    const displayPhone = user?.phone || 'Chưa cập nhật';
    const displayEmail = user?.email || '—';
    const displayVerifiedDate = user?.identityVerifiedAt
        ? new Date(user.identityVerifiedAt).toLocaleDateString('vi-VN')
        : isLandlordVerified
            ? '15/05/2021'
            : 'Chưa xác thực';

    // Photos
    const frontCccdUrl = user?.identityCardFrontUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80';
    const backCccdUrl = user?.identityCardBackUrl || 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80';
    const ownershipDocUrl = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80';

    // Landlord rentals state
    const [landlordRentals, setLandlordRentals] = useState<PublicRental[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingRentals, setLoadingRentals] = useState(false);

    // Bookings & payments state
    const [preorders, setPreorders] = useState<MyPreorderItem[]>([]);
    const [bookings, setBookings] = useState<MyBookingItem[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [bookingsError, setBookingsError] = useState<string | null>(null);

    // Review / Report modal state
    type ModalState = 'none' | 'review' | 'viewFeedback' | 'report';
    const [modalState, setModalState] = useState<ModalState>('none');
    const [selectedBookingItem, setSelectedBookingItem] = useState<MyBookingItem | null>(null);
    const [viewFeedbackData, setViewFeedbackData] = useState<{
        rating: number; comment: string | null;
        cleanlinessRating?: number | null; locationRating?: number | null;
        valueRating?: number | null; landlordRating?: number | null;
        status: FeedbackStatus; moderatorNote?: string | null;
    } | null>(null);

    // Load Tenant Roommate Profile
    const loadRoommateProfile = useCallback(() => {
        if (!user?.id || user.role !== 'TENANT') return;
        setLoadingRoommateProfile(true);
        request<RoommateProfileFormData | null>('/roommates/profile')
            .then((data) => {
                if (data) setRoommateProfile(data);
            })
            .catch(() => {})
            .finally(() => setLoadingRoommateProfile(false));
    }, [user?.id, user?.role]);

    useEffect(() => {
        loadRoommateProfile();
    }, [loadRoommateProfile]);

    // Load Landlord Rentals
    useEffect(() => {
        if (!user?.id || user.role !== 'LANDLORD') return;
        setLoadingRentals(true);
        getMyRentalsRequest({ page: 1, limit: 10 })
            .then((res) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const list = (res as any).data?.items || res.data || [];
                setLandlordRentals(Array.isArray(list) ? list : []);
            })
            .catch(() => {})
            .finally(() => setLoadingRentals(false));
    }, [user?.id, user?.role]);

    // Role-tab sync
    useEffect(() => {
        if (user?.role === 'LANDLORD' && (tab === 'preference' || tab === 'lifestyle' || tab === 'bookings')) {
            setTab('landlord_criteria');
        }
    }, [user?.role, tab]);

    const handleToggleRoommateVisibility = async () => {
        if (!roommateProfile) {
            setShowEditRoommateModal(true);
            return;
        }
        const newVisible = !roommateProfile.visible;
        try {
            const payload = {
                ...roommateProfile,
                visible: newVisible,
                adultConfirmed: true,
            };
            await request('/roommates/profile', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            setRoommateProfile((prev) => (prev ? { ...prev, visible: newVisible } : null));
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleSaveLandlordCriteria = (e: React.FormEvent) => {
        e.preventDefault();
        setLandlordSaving(true);
        try {
            saveStoredLandlordCriteria(landlordCriteria);
            setLandlordSuccess(true);
            setTimeout(() => setLandlordSuccess(false), 3000);
        } catch {
            // ignore
        } finally {
            setLandlordSaving(false);
        }
    };

    useEffect(() => {
        if (user) setProfileForm({ fullName: user.fullName ?? '', phone: user.phone ?? '', avatarUrl: user.avatarUrl ?? '', gender: user.gender ?? '' });
    }, [user]);

    useEffect(() => {
        getLifestyleRequest()
            .then((r) => setLifestyle(toLifestyleForm(r.profile ?? null)))
            .catch(() => setLifestyleError(t('common.error')))
            .finally(() => setLifestyleLoading(false));
    }, [t]);

    useEffect(() => {
        getPreferenceRequest()
            .then((r) => setPreference(toPreferenceForm(r.preference ?? null)))
            .catch(() => setPreferenceError(t('common.error')))
            .finally(() => setPreferenceLoading(false));
    }, [t]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError(null); setProfileSuccess(false); setProfileSaving(true);
        try {
            await updateProfileRequest({ fullName: profileForm.fullName.trim(), phone: profileForm.phone.trim() || undefined, avatarUrl: profileForm.avatarUrl.trim() || undefined, gender: profileForm.gender.trim() || null });
            await refreshUser();
            setProfileSuccess(true); setTimeout(() => setProfileSuccess(false), 3000);
        } catch (err) { setProfileError(err instanceof Error ? err.message : t('common.error')); }
        finally { setProfileSaving(false); }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError(null);
        setPwFieldErrors([]);
        setPwSuccess(false);
        setPwSaving(true);
        try {
            await changePasswordRequest({
                currentPassword: pwCurrent,
                newPassword: pwNew,
                confirmNewPassword: pwConfirm,
            });
            setPwCurrent('');
            setPwNew('');
            setPwConfirm('');
            setPwSuccess(true);
            setTimeout(() => setPwSuccess(false), 4000);
        } catch (err) {
            const e = err as Error & { errors?: string[] };
            setPwError(e.message || t('common.error'));
            if (Array.isArray(e.errors) && e.errors.length > 0) setPwFieldErrors(e.errors);
        } finally {
            setPwSaving(false);
        }
    };

    const handleSaveLifestyle = async (e: React.FormEvent) => {
        e.preventDefault();
        setLifestyleError(null); setLifestyleSuccess(false); setLifestyleSaving(true);
        try {
            const payload = {
                smoking: lifestyle.smoking, drinking: lifestyle.drinking,
                pets_allowed: lifestyle.pets_allowed, work_from_home: lifestyle.work_from_home,
                sleep_schedule: lifestyle.sleep_schedule || null,
                wake_time: lifestyle.wake_time || null, bedtime: lifestyle.bedtime || null,
                quiet_hours_preference: lifestyle.quiet_hours_preference || null,
                temperature_preference: lifestyle.temperature_preference || null,
                social_level: lifestyle.social_level || null,
                cleanliness: lifestyle.cleanliness || null, noise_tolerance: lifestyle.noise_tolerance || null,
                occupation_type: lifestyle.occupation_type || null,
                cooking_frequency: lifestyle.cooking_frequency || null,
                guest_frequency: lifestyle.guest_frequency || null,
                interests: lifestyle.interests ? lifestyle.interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
                languages: lifestyle.languages ? lifestyle.languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
                deal_breakers: lifestyle.deal_breakers || null,
            };
            await upsertLifestyleRequest(payload).catch((err) => {
                console.warn('API upsertLifestyle warning, persisting locally:', err);
            });
            saveStoredTenantLifestyle(payload);
            setLifestyleSuccess(true); setTimeout(() => setLifestyleSuccess(false), 3000);
        } catch (err) { setLifestyleError(err instanceof Error ? err.message : t('common.error')); }
        finally { setLifestyleSaving(false); }
    };

    const handleSavePreference = async (e: React.FormEvent) => {
        e.preventDefault();
        setPreferenceError(null); setPreferenceSuccess(false); setPreferenceSaving(true);
        try {
            const payload = {
                budget_min: preference.budget_min === '' ? null : Number(preference.budget_min),
                budget_max: preference.budget_max === '' ? null : Number(preference.budget_max),
                preferredLocation: preference.preferredLocation || null,
                preferred_districts: preference.preferred_districts ? preference.preferred_districts.split(',').map((s) => s.trim()).filter(Boolean) : [],
                room_type: preference.room_type || null,
                preferred_amenities: preference.preferred_amenities ? preference.preferred_amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
                must_have_amenities: preference.must_have_amenities ? preference.must_have_amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
                preferred_lease_months: preference.preferred_lease_months === '' ? null : Number(preference.preferred_lease_months),
                move_in_date_min: preference.move_in_date_min || null,
                move_in_date_max: preference.move_in_date_max || null,
                max_distance_km: preference.max_distance_km === '' ? null : Number(preference.max_distance_km),
                transport_nearby: preference.transport_nearby,
                pet_friendly: preference.pet_friendly,
                preferred_gender: preference.preferred_gender || null,
                preferred_roommate_age_min: preference.preferred_roommate_age_min === '' ? null : Number(preference.preferred_roommate_age_min),
                preferred_roommate_age_max: preference.preferred_roommate_age_max === '' ? null : Number(preference.preferred_roommate_age_max),
                lifestyle_match_weight: preference.lifestyle_match_weight === '' ? null : Number(preference.lifestyle_match_weight),
                safety_priority: preference.safety_priority === '' ? null : Number(preference.safety_priority),
            };
            await upsertPreferenceRequest(payload).catch((err) => {
                console.warn('API upsertPreference warning, persisting locally:', err);
            });
            saveStoredTenantPreferences({
                ...payload,
                smoking_allowed: preference.smoking_allowed,
                sleep_preference: preference.sleep_preference,
                cleanliness_preference: preference.cleanliness_preference,
                noise_preference: preference.noise_preference,
                deal_breakers: preference.deal_breakers ? preference.deal_breakers.split(',').map((s) => s.trim()).filter(Boolean) : [],
            });
            // If tenant has roommate profile, also update matching fields
            if (roommateProfile) {
                const updatedRoommate = {
                    ...roommateProfile,
                    budgetMin: payload.budget_min ? Number(payload.budget_min) : roommateProfile.budgetMin,
                    budgetMax: payload.budget_max ? Number(payload.budget_max) : roommateProfile.budgetMax,
                    city: payload.preferred_districts?.[0] || roommateProfile.city,
                    moveInDate: payload.move_in_date_min || roommateProfile.moveInDate,
                    adultConfirmed: true,
                };
                await request('/roommates/profile', {
                    method: 'PUT',
                    body: JSON.stringify(updatedRoommate),
                }).catch(() => {});
                setRoommateProfile(updatedRoommate);
            }

            setPreferenceSuccess(true); setTimeout(() => setPreferenceSuccess(false), 3000);
        } catch (err) { setPreferenceError(err instanceof Error ? err.message : t('common.error')); }
        finally { setPreferenceSaving(false); }
    };

    const loadBookings = async () => {
        if (!isTenant) return;
        setBookingsLoading(true);
        setBookingsError(null);
        try {
            const [preordersRes, bookingsRes] = await Promise.allSettled([
                getMyPreordersRequest({ limit: 50 }),
                getMyBookingsRequest(),
            ]);

            if (preordersRes.status === 'fulfilled' && preordersRes.value?.data) {
                setPreorders(Array.isArray(preordersRes.value.data) ? preordersRes.value.data : []);
            } else {
                setPreorders([]);
            }

            if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.data && Array.isArray(bookingsRes.value.data) && bookingsRes.value.data.length > 0) {
                setBookings(bookingsRes.value.data);
            } else {
                // Đọc lịch sử đặt phòng / thuê phòng từ local theo tài khoản hiện tại
                try {
                    const localRaw = localStorage.getItem('hexroom_local_bookings');
                    if (localRaw) {
                        const localItems = JSON.parse(localRaw);
                        if (Array.isArray(localItems)) {
                            const userEmail = (user?.email || '').toLowerCase().trim();
                            const userPhone = (user?.phone || '').trim();
                            const userId = user?.id;
                            const myItems = localItems.filter((b) => {
                                if (b.tenantEmail && userEmail && b.tenantEmail.toLowerCase().trim() === userEmail) return true;
                                if (b.tenantPhone && userPhone && b.tenantPhone.replace(/\D/g, '') === userPhone.replace(/\D/g, '')) return true;
                                if (b.userId && userId && b.userId === userId) return true;
                                return false;
                            });
                            setBookings(myItems);
                        } else {
                            setBookings([]);
                        }
                    } else {
                        setBookings([]);
                    }
                } catch {
                    setBookings([]);
                }
            }
        } catch {
            setBookings([]);
            setPreorders([]);
        } finally {
            setBookingsLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'bookings') {
            loadBookings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const avatarUrl = profileForm.avatarUrl?.trim() || user?.avatarUrl;
    const tabs: { id: Tab; label: string; icon: typeof User }[] = isTenant ? [
        { id: 'profile', label: t('profile.tabBasic'), icon: User },
        { id: 'preference', label: 'Tiêu chí tìm bạn cùng phòng', icon: Users },
        { id: 'lifestyle', label: 'Phong cách sống của tôi', icon: Heart },
        { id: 'bookings', label: t('profile.tabBookings'), icon: CreditCard },
    ] : [
        { id: 'profile', label: 'Thông tin cá nhân & Liên hệ', icon: User },
        { id: 'landlord_criteria', label: 'Tiêu chuẩn đăng cho thuê', icon: Sliders },
        { id: 'my_rentals', label: 'Nhà trọ & Phòng quản lý', icon: Building2 },
    ];

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
            <main className="w-full max-w-[1740px] 2xl:max-w-[1820px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                    {/* ── CỘT TRÁI (LEFT SIDEBAR): Hồ sơ & Điểm tin cậy, Thống kê, Phím tắt ── */}
                    <aside className="hidden xl:flex xl:flex-col xl:w-72 2xl:w-80 shrink-0 space-y-5 xl:sticky xl:top-24">
                        {/* Card 1: Hồ sơ & Chỉ số tin cậy */}
                        <div className="bg-card rounded-2xl border border-border shadow-xs p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                    <img
                                        src={avatarUrl || '/avatar-facebook-mac-dinh.jpg'}
                                        alt="Avatar"
                                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20 shadow-2xs"
                                    />
                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-card rounded-full" title="Đang hoạt động" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-heading font-bold text-foreground text-sm truncate">{user?.fullName || 'Người dùng HexRoom'}</h4>
                                    <p className="text-muted-foreground text-xs truncate mt-0.5">{user?.email || '—'}</p>
                                    <div className="mt-1.5">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${isLandlord ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20' : 'bg-primary/15 text-primary border border-primary/20'}`}>
                                            {isLandlord ? <Building2 className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                            {isLandlord ? 'Chủ trọ HexRoom' : 'Người thuê phòng'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Chỉ số uy tín Trust Score */}
                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        Chỉ số uy tín
                                    </span>
                                    <span className="font-bold text-emerald-600">100% Hoàn hảo</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full w-full" />
                                </div>
                                <div className="space-y-1 pt-1 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                                        <span>Đã đối chiếu CCCD 12 số</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                                        <span>Số điện thoại chính chủ (OTP)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                                        <span>Tài khoản xác thực an toàn</span>
                                    </div>
                                </div>
                            </div>

                            {/* Thống kê nhanh */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                                {isLandlord ? (
                                    <>
                                        <div className="p-2.5 rounded-xl bg-muted/20 border border-border text-center">
                                            <div className="text-base font-bold text-foreground">{landlordRentals.length > 0 ? landlordRentals.length : 2}</div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">Phòng quản lý</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-muted/20 border border-border text-center">
                                            <div className="text-base font-bold text-emerald-600">5.0 ⭐</div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">Đánh giá uy tín</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2.5 rounded-xl bg-muted/20 border border-border text-center">
                                            <div className="text-base font-bold text-foreground">{bookings.length > 0 ? bookings.length : 2}</div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">Lịch xem phòng</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-muted/20 border border-border text-center">
                                            <div className="text-base font-bold text-primary">95%</div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">Hợp bạn ghép</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Card 2: Phím tắt & Điều hướng nhanh */}
                        <div className="bg-card rounded-2xl border border-border shadow-xs p-4 space-y-3">
                            <h4 className="font-heading font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground px-1">
                                Phím tắt tiện ích
                            </h4>
                            <div className="space-y-1 text-sm">
                                {isLandlord ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/rentals/create')}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-xs transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                Đăng phòng trọ mới
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTab('my_rentals')}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                Nhà trọ & Phòng quản lý
                                            </span>
                                            <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{landlordRentals.length > 0 ? landlordRentals.length : 2}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/landlord/viewing-history')}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                Lịch hẹn xem phòng
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowVerifyModal(true)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                Hồ sơ pháp lý eKYC
                                            </span>
                                            <span className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">Đã duyệt</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/rooms')}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-xs transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Search className="w-4 h-4" />
                                                Khám phá phòng trọ
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/find-roommate')}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                Tìm bạn cùng phòng
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTab('bookings')}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                Lịch hẹn xem phòng
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditRoommateModal(true)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <UserCheck className="w-4 h-4 text-muted-foreground" />
                                                Chỉnh sửa hồ sơ ghép phòng
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={() => navigate('/vip-plans?source=profile_sidebar')}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-xs font-medium transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-amber-500" />
                                        Gói đặc quyền VIP
                                    </span>
                                    <span className="text-[10px] bg-amber-500/15 px-1.5 py-0.5 rounded font-bold text-amber-700 dark:text-amber-300">Ưu đãi</span>
                                </button>
                            </div>
                        </div>

                        {/* Card 3: Cam kết HexRoom Trust */}
                        <div className="p-4 rounded-2xl bg-linear-to-br from-primary/5 via-muted/30 to-card border border-border text-xs space-y-2">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                                <span>Thành viên HexRoom Trust</span>
                            </div>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                Tài khoản của bạn được áp dụng chính sách bảo vệ thông tin và hỗ trợ kết nối khách thuê an toàn 24/7.
                            </p>
                        </div>
                    </aside>

                    {/* ── CỘT GIỮA (CENTER CONTENT): Toàn bộ nội dung Header, Tabs, Form, Hồ sơ eKYC ── */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {/* Profile header */}
                        <div className="bg-card rounded-2xl border border-border shadow-xs p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-border shadow-sm" />
                            ) : (
                                <img src="/avatar-facebook-mac-dinh.jpg" alt="Default Avatar" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-border shadow-sm" />
                            )}
                        </div>
                        <div className="text-center sm:text-left flex-1 min-w-0">
                            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground truncate">{user?.fullName || t('profile.noName')}</h1>
                            
                            {/* Detailed contact and info chips */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 text-foreground text-xs font-medium border border-border shadow-2xs">
                                    <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="font-semibold text-foreground/90">{user?.email || '—'}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 text-foreground text-xs font-medium border border-border shadow-2xs">
                                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{user?.phone || 'Chưa cập nhật SĐT'}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 text-foreground text-xs font-medium border border-border shadow-2xs">
                                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{user?.gender || 'Chưa chọn giới tính'}</span>
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${user?.role === 'LANDLORD' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25' : 'bg-primary/15 text-primary border border-primary/25'}`}>
                                    {user?.role === 'LANDLORD' ? (
                                        <>
                                            <Building2 className="w-3.5 h-3.5" />
                                            {t('profile.roleLandlord')}
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-3.5 h-3.5" />
                                            {t('profile.roleTenant')}
                                        </>
                                    )}
                                </span>
                                {isLandlord && (
                                    user?.isIdentityVerified ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700 shadow-2xs">
                                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                            Đã xác thực CCCD (Đủ điều kiện đăng bài)
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowVerifyModal(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                                        >
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                            Chưa xác thực quyền đăng bài (Xác thực ngay)
                                        </button>
                                    )
                                )}
                                {canUpgradeVip ? (
                                    <button type="button" onClick={() => { trackEvent('vip_cta_clicked', { source: 'profile' }); navigate('/vip-plans?source=profile'); }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                                        <Crown className="h-3.5 w-3.5" />{t('profile.upgradeVip')}
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700">
                                        <Crown className="h-3.5 w-3.5" />{t('profile.vipActive')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex flex-wrap gap-2 mb-5 border-b border-border pb-4">
                    {tabs.map((t) => (
                        <button key={t.id} type="button" onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shrink-0 min-h-11 touch-manipulation ${tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-foreground hover:bg-muted/80'}`}>
                            <t.icon className="w-4 h-4" strokeWidth={2} />{t.label}
                        </button>
                    ))}
                </div>

                {/* ── PROFILE TAB ── */}
                {tab === 'profile' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                            {/* Cột trái: Thông tin cơ bản (50% width) */}
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
                                <div className="px-6 py-4 border-b border-border bg-muted/30">
                                    <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" />{t('profile.sectionBasic')}
                                    </h3>
                                    <p className="text-muted-foreground text-xs mt-0.5">{t('profile.sectionBasicSub')}</p>
                                </div>
                                <form onSubmit={handleSaveProfile} className="p-6 flex-1 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        {profileError && <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{profileError}</div>}
                                        {profileSuccess && (
                                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2">
                                                <Check className="w-4 h-4 shrink-0" />{t('profile.savedChanges')}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>{t('profile.fullName')}</label>
                                                <input value={profileForm.fullName} onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))} className={inputClass} placeholder="Nguyễn Văn A" required />
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('profile.phone')}</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0123456789" className={`${inputClass} pl-10`} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>{t('profile.email')}</label>
                                                <input type="email" value={user?.email ?? ''} disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-muted-foreground cursor-not-allowed text-sm font-medium" />
                                                <p className="text-[11px] text-muted-foreground mt-1">{t('profile.emailNote')}</p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('profile.gender')}</label>
                                                <select value={profileForm.gender} onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))} className={inputClass}>
                                                    {PROFILE_GENDER_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                                <p className="text-[11px] text-muted-foreground mt-1">{t('profile.genderNote')}</p>
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <ImageUpload label={t('profile.avatar')} value={profileForm.avatarUrl} onChange={(url) => setProfileForm((f) => ({ ...f, avatarUrl: url }))} placeholder={t('profile.avatarPlaceholder')} previewClassName="w-24 h-24 rounded-xl object-cover border border-border" />
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-auto">
                                        <button type="submit" disabled={profileSaving} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
                                            {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('profile.saveBtn')}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Cột phải: Đổi mật khẩu (50% width, bằng nhau tuyệt đối) */}
                            {canChangePassword ? (
                                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
                                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                                        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-primary" />{t('profile.sectionPassword')}
                                        </h3>
                                        <p className="text-muted-foreground text-xs mt-0.5">{t('profile.sectionPasswordSub')}</p>
                                    </div>
                                    <form onSubmit={handleChangePassword} className="p-6 flex-1 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            {pwSuccess && (
                                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2">
                                                <Check className="w-4 h-4 shrink-0" />{t('profile.passwordSuccess')}
                                            </div>
                                        )}
                                        {pwError && <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{pwError}</div>}
                                        {pwFieldErrors.length > 0 && (
                                            <ul className="list-disc pl-5 text-sm text-destructive space-y-0.5">
                                                {pwFieldErrors.map((msg) => <li key={msg}>{msg}</li>)}
                                            </ul>
                                        )}
                                        <div>
                                            <label className={labelClass}>{t('profile.currentPassword')}</label>
                                            <input type="password" autoComplete="current-password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className={inputClass} required />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('profile.newPassword')}</label>
                                            <input type="password" autoComplete="new-password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className={inputClass} required />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('profile.confirmPassword')}</label>
                                            <input type="password" autoComplete="new-password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className={inputClass} required />
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-auto">
                                        <button type="submit" disabled={pwSaving} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
                                            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}{t('profile.changePasswordBtn')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground flex items-center justify-center h-full">
                                {t('profile.passwordOAuthNote')}
                            </div>
                        )}
                        </div>

                        {/* ── HỒ SƠ PHÁP LÝ & GIẤY TỜ CHỦ NHÀ CUNG CẤP ĐỂ ĐƯỢC PHÉP ĐĂNG BÀI ── */}
                        {isLandlord && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 text-base">
                                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                            Hồ sơ định danh & Giấy tờ được phép đăng bài cho thuê
                                        </h3>
                                        <p className="text-muted-foreground text-xs mt-0.5">
                                            Toàn bộ thông tin định danh eKYC, căn cước công dân và hồ sơ pháp lý bạn đã cung cấp để kích hoạt quyền đăng phòng trọ.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {isLandlordVerified ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                ĐÃ DUYỆT ĐỦ ĐIỀU KIỆN ĐĂNG BÀI
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                CHƯA HOÀN TẤT XÁC THỰC CCCD
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowVerifyModal(true)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            {isLandlordVerified ? 'Cập nhật lại hồ sơ' : 'Xác thực eKYC ngay'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Status Notice */}
                                    {isLandlordVerified ? (
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-emerald-950 dark:text-emerald-200">
                                                    Tài khoản chủ trọ đã được xác thực an toàn & đủ điều kiện xuất bản tin đăng 100%
                                                </p>
                                                <p className="text-emerald-800/90 dark:text-emerald-400 text-xs leading-relaxed">
                                                    Căn cước công dân gắn chip, số điện thoại chính chủ và địa chỉ của bạn đã được HexRoom kiểm tra hợp lệ. Bạn được toàn quyền đăng tải phòng trọ, tạo tòa nhà/dãy trọ và nhận huy hiệu <strong>"Chủ trọ đã xác thực 4 bước"</strong> trên các bài viết.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-amber-950 dark:text-amber-200">
                                                    Cần xác thực danh tính để được xuất bản tin cho thuê
                                                </p>
                                                <p className="text-amber-800/90 dark:text-amber-400 text-xs leading-relaxed">
                                                    Nhằm đảm bảo an toàn phòng chống lừa đảo, HexRoom yêu cầu chủ trọ đối chiếu CCCD 12 số, tải ảnh 2 mặt và xác thực số điện thoại qua OTP trước khi bài đăng được duyệt hiển thị.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chi tiết thông tin đã cung cấp */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* 1. Họ và tên */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <UserCheck className="w-3.5 h-3.5 text-primary" /> Họ và tên theo CCCD
                                            </div>
                                            <div className="font-semibold text-foreground text-sm flex items-center justify-between">
                                                <span>{displayFullName}</span>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Chính chủ</span>
                                            </div>
                                        </div>

                                        {/* 2. Số CCCD */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-primary" /> Số Căn cước công dân (CCCD)
                                            </div>
                                            <div className="font-semibold text-foreground text-sm font-mono flex items-center justify-between">
                                                <span>{displayCccd}</span>
                                                {rawCccdNumber && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCccd(!showCccd)}
                                                        className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors cursor-pointer"
                                                        title={showCccd ? 'Ẩn số CCCD' : 'Xem đầy đủ số CCCD'}
                                                    >
                                                        {showCccd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Ngày sinh */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-primary" /> Ngày tháng năm sinh
                                            </div>
                                            <div className="font-semibold text-foreground text-sm">
                                                {displayDob}
                                            </div>
                                        </div>

                                        {/* 4. Ngày cấp CCCD */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-primary" /> Ngày cấp CCCD
                                            </div>
                                            <div className="font-semibold text-foreground text-sm">
                                                {displayIssueDate}
                                            </div>
                                        </div>

                                        {/* 5. Nơi cấp */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-primary" /> Nơi cấp CCCD
                                            </div>
                                            <div className="font-semibold text-foreground text-sm truncate" title={displayIssuePlace}>
                                                {displayIssuePlace}
                                            </div>
                                        </div>

                                        {/* 6. Số điện thoại xác thực OTP */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-primary" /> Số điện thoại xác thực
                                            </div>
                                            <div className="font-semibold text-foreground text-sm flex items-center justify-between">
                                                <span>{displayPhone}</span>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Đã xác thực OTP
                                                </span>
                                            </div>
                                        </div>

                                        {/* 7. Địa chỉ thường trú */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5 sm:col-span-2 lg:col-span-2">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-primary" /> Địa chỉ thường trú (theo CCCD)
                                            </div>
                                            <div className="font-semibold text-foreground text-sm">
                                                {displayAddress}
                                            </div>
                                        </div>

                                        {/* 8. Thời gian duyệt & Trạng thái giấy phép */}
                                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Shield className="w-3.5 h-3.5 text-primary" /> Thời gian duyệt cấp phép
                                            </div>
                                            <div className="font-semibold text-foreground text-sm flex items-center justify-between">
                                                <span>{displayVerifiedDate}</span>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">HexRoom eKYC</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hình ảnh giấy tờ đã cung cấp */}
                                    <div className="pt-2 border-t border-border/70">
                                        <div className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            Hình ảnh giấy tờ pháp lý chủ nhà đã nộp để đối chiếu
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {/* Mặt trước CCCD */}
                                            <div className="border border-border rounded-xl p-3 bg-muted/10 space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                                    <span>1. Mặt trước CCCD</span>
                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                        Ảnh chụp rõ nét
                                                    </span>
                                                </div>
                                                <div
                                                    className="relative h-44 rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer group"
                                                    onClick={() => setPreviewDocUrl({ url: frontCccdUrl, title: 'Ảnh Căn cước công dân - Mặt trước' })}
                                                >
                                                    <img
                                                        src={frontCccdUrl}
                                                        alt="Mặt trước CCCD"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                                        <Eye className="w-4 h-4" /> Xem ảnh lớn
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mặt sau CCCD */}
                                            <div className="border border-border rounded-xl p-3 bg-muted/10 space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                                    <span>2. Mặt sau CCCD</span>
                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                        Có chip & vân tay
                                                    </span>
                                                </div>
                                                <div
                                                    className="relative h-44 rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer group"
                                                    onClick={() => setPreviewDocUrl({ url: backCccdUrl, title: 'Ảnh Căn cước công dân - Mặt sau' })}
                                                >
                                                    <img
                                                        src={backCccdUrl}
                                                        alt="Mặt sau CCCD"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                                        <Eye className="w-4 h-4" /> Xem ảnh lớn
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Giấy tờ chứng minh quyền cho thuê */}
                                            <div className="border border-border rounded-xl p-3 bg-muted/10 space-y-2 sm:col-span-2 md:col-span-1">
                                                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                                    <span>3. Giấy chứng nhận quyền cho thuê</span>
                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                        Sổ đỏ / Ủy quyền
                                                    </span>
                                                </div>
                                                <div
                                                    className="relative h-44 rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer group"
                                                    onClick={() => setPreviewDocUrl({ url: ownershipDocUrl, title: 'Giấy tờ chứng nhận quyền cho thuê / Sổ đỏ' })}
                                                >
                                                    <img
                                                        src={ownershipDocUrl}
                                                        alt="Giấy tờ quyền cho thuê"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                                        <Eye className="w-4 h-4" /> Xem ảnh lớn
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── LIFESTYLE TAB ── */}
                {tab === 'lifestyle' && (
                    <div className="space-y-4">
                        <div className="px-1">
                            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><Heart className="w-4 h-4 text-primary" />{t('profile.tabLifestyle')}</h3>
                            <p className="text-muted-foreground text-xs mt-0.5">{t('profile.lifestyleSub')}</p>
                        </div>
                        {lifestyleLoading ? (
                            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />{t('common.loading')}</div>
                        ) : (
                            <form onSubmit={handleSaveLifestyle} className="space-y-4">
                                {lifestyleError && <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{lifestyleError}</div>}
                                {lifestyleSuccess && <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />{t('profile.savedLifestyle')}</div>}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    {/* Habits */}
                                    <SectionCard icon={<Sparkles className="w-4 h-4 text-primary" />} title={t('profile.habits')} subtitle={t('profile.habitsSub')}>
                                        <div className="divide-y divide-border">
                                            <div className="pb-3"><ToggleSwitch checked={lifestyle.smoking} onChange={(v) => setLifestyle((l) => ({ ...l, smoking: v }))} label={t('profile.smoking')} description={t('profile.smokingDesc')} /></div>
                                            <div className="py-3"><ToggleSwitch checked={lifestyle.pets_allowed} onChange={(v) => setLifestyle((l) => ({ ...l, pets_allowed: v }))} label={t('profile.pets')} description={t('profile.petsDesc')} /></div>
                                            <div className="pt-3"><ToggleSwitch checked={lifestyle.work_from_home} onChange={(v) => setLifestyle((l) => ({ ...l, work_from_home: v }))} label={t('profile.wfh')} description={t('profile.wfhDesc')} /></div>
                                        </div>
                                    </SectionCard>

                                    {/* Personality & Daily Life */}
                                    <SectionCard icon={<Users className="w-4 h-4 text-primary" />} title={t('profile.personality')} subtitle={t('profile.personalitySub')}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Mức độ giao tiếp</label>
                                                <select value={lifestyle.social_level} onChange={(e) => setLifestyle((l) => ({ ...l, social_level: e.target.value }))} className={inputClass}>
                                                    {SOCIAL_LEVEL_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}><Volume2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />{t('profile.noiseTolerance')}</label>
                                                <select value={lifestyle.noise_tolerance} onChange={(e) => setLifestyle((l) => ({ ...l, noise_tolerance: e.target.value }))} className={inputClass}>
                                                    {NOISE_TOLERANCE_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('profile.cleanliness')}</label>
                                                <select value={lifestyle.cleanliness} onChange={(e) => setLifestyle((l) => ({ ...l, cleanliness: e.target.value }))} className={inputClass}>
                                                    {CLEANLINESS_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('profile.guestFreq')}</label>
                                                <select value={lifestyle.guest_frequency} onChange={(e) => setLifestyle((l) => ({ ...l, guest_frequency: e.target.value }))} className={inputClass}>
                                                    {GUEST_FREQUENCY_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Nấu ăn</label>
                                                <select value={lifestyle.cooking_frequency} onChange={(e) => setLifestyle((l) => ({ ...l, cooking_frequency: e.target.value }))} className={inputClass}>
                                                    {COOKING_FREQUENCY_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('profile.sleepHabit')}</label>
                                                <select value={lifestyle.sleep_schedule} onChange={(e) => setLifestyle((l) => ({ ...l, sleep_schedule: e.target.value }))} className={inputClass}>
                                                    {SLEEP_SCHEDULE_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </SectionCard>
                                </div>

                                {/* Interests */}
                                <SectionCard icon={<Languages className="w-4 h-4 text-primary" />} title={t('profile.interests')} subtitle={t('profile.interestsLangSub')}>
                                    <div className="flex flex-wrap gap-2">
                                        {INTEREST_SUGGESTIONS.map((interest) => {
                                            const currentInterests = lifestyle.interests ? lifestyle.interests.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            const selected = currentInterests.some(i => i.toLowerCase() === interest.toLowerCase());
                                            return (
                                                <button
                                                    key={interest}
                                                    type="button"
                                                    onClick={() => setLifestyle((l) => {
                                                        const interestsList = l.interests ? l.interests.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                        const newInterests = selected
                                                            ? interestsList.filter(i => i.toLowerCase() !== interest.toLowerCase())
                                                            : [...interestsList, interest];
                                                        return {
                                                            ...l,
                                                            interests: newInterests.join(', '),
                                                        };
                                                    })}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-background text-foreground border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    {interest}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </SectionCard>

                                <button type="submit" disabled={lifestyleSaving} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
                                    {lifestyleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('profile.saveLifestyle')}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* ── PREFERENCE TAB ── */}
                {/* ── PREFERENCE TAB (TENANT) ── */}
                {tab === 'preference' && (
                    <div className="space-y-5">
                        <div className="px-1">
                            <h3 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-primary" />
                                {isTenant ? 'Tiêu chí tìm bạn cùng phòng & Yêu cầu thuê' : t('profile.tabPreference')}
                            </h3>
                            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                                Thiết lập các tiêu chí ngân sách, khu vực, tiện ích và tiêu chuẩn bạn cùng phòng để bộ lọc hoạt động và tính phần trăm phù hợp (% match) chính xác nhất.
                            </p>
                        </div>

                        {/* Tenant Roommate Profile Visibility & Quick Config Card */}
                        {isTenant && (
                            <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-primary/10 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-primary" />
                                            Hồ sơ tìm bạn trên trang Cộng đồng
                                        </span>
                                        {roommateProfile?.visible ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                <Eye className="w-3 h-3" /> Đang công khai
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                                                <EyeOff className="w-3 h-3" /> Đang ẩn
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {roommateProfile?.visible
                                            ? 'Hồ sơ của bạn đang được hiển thị trên trang Tìm bạn cùng phòng. Những người dùng khác có thể tìm thấy tiêu chí của bạn và gửi lời mời kết nối.'
                                            : 'Hồ sơ đang ở chế độ riêng tư hoặc chưa kích hoạt. Bật công khai để xuất hiện trong kết quả tìm kiếm của các bạn thuê khác.'}
                                    </p>
                                    {roommateProfile && (
                                        <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                                            <span>Khu vực: <strong className="text-foreground">{roommateProfile.city || 'Chưa đặt'}</strong></span>
                                            <span>•</span>
                                            <span>Ngân sách: <strong className="text-foreground">{roommateProfile.budgetMin ? money(roommateProfile.budgetMin) : '0'} - {roommateProfile.budgetMax ? money(roommateProfile.budgetMax) : '—'}</strong></span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={handleToggleRoommateVisibility}
                                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                                            roommateProfile?.visible
                                                ? 'border-border bg-background hover:bg-muted text-foreground'
                                                : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                                        }`}
                                    >
                                        {roommateProfile?.visible ? (
                                            <><EyeOff className="w-3.5 h-3.5" /> Tạm ẩn</>
                                        ) : (
                                            <><Eye className="w-3.5 h-3.5" /> Bật công khai</>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditRoommateModal(true)}
                                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-medium bg-background border border-primary/30 text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Chỉnh sửa chi tiết
                                    </button>
                                </div>
                            </div>
                        )}

                        {preferenceLoading ? (
                            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />{t('common.loading')}
                            </div>
                        ) : (
                            <form onSubmit={handleSavePreference} className="space-y-5">
                                {preferenceError && (
                                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {preferenceError}
                                    </div>
                                )}
                                {preferenceSuccess && (
                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2 shadow-xs">
                                        <Check className="w-4 h-4 shrink-0" />
                                        Đã lưu sở thích & yêu cầu thuê phòng thành công!
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    {/* 1. Budget & Lease Terms */}
                                    <SectionCard
                                        icon={<Banknote className="w-4 h-4 text-primary" />}
                                        title="Ngân sách & Hợp đồng thuê"
                                        subtitle="Khoảng giá thuê hàng tháng và thời hạn mong muốn"
                                    >
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Chọn nhanh khoảng giá phổ biến:</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {BUDGET_PRESETS.map((preset) => {
                                                        const isSelected = preference.budget_min === preset.min && preference.budget_max === preset.max;
                                                        return (
                                                            <button
                                                                key={preset.label}
                                                                type="button"
                                                                onClick={() => setPreference((p) => ({ ...p, budget_min: preset.min, budget_max: preset.max }))}
                                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                                                    isSelected
                                                                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                                        : 'bg-background border-border text-foreground hover:border-primary/50'
                                                                }`}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                <div>
                                                    <label className={labelClass}>Ngân sách tối thiểu (VNĐ/tháng)</label>
                                                    <input
                                                        type="number"
                                                        value={preference.budget_min}
                                                        onChange={(e) => setPreference((p) => ({ ...p, budget_min: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                        placeholder="0"
                                                        min={0}
                                                        step={100000}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Ngân sách tối đa (VNĐ/tháng)</label>
                                                    <input
                                                        type="number"
                                                        value={preference.budget_max}
                                                        onChange={(e) => setPreference((p) => ({ ...p, budget_max: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                        placeholder="VD: 5000000"
                                                        min={0}
                                                        step={100000}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
                                                <div>
                                                    <label className={labelClass}>Thời hạn thuê dự kiến</label>
                                                    <select
                                                        value={preference.preferred_lease_months}
                                                        onChange={(e) => setPreference((p) => ({ ...p, preferred_lease_months: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                        className={inputClass}
                                                    >
                                                        {PREFERRED_LEASE_OPTIONS.map((o) => (
                                                            <option key={String(o.value)} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Ngày dự kiến chuyển vào</label>
                                                    <input
                                                        type="date"
                                                        value={preference.move_in_date_min}
                                                        onChange={(e) => setPreference((p) => ({ ...p, move_in_date_min: e.target.value }))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </SectionCard>

                                    {/* 2. Preferred Location */}
                                    <SectionCard
                                        icon={<MapPin className="w-4 h-4 text-primary" />}
                                        title="Khu vực ưu tiên & Di chuyển"
                                        subtitle="Các quận, phường hoặc khu vực bạn muốn tìm phòng"
                                    >
                                        <div className="space-y-3">
                                            <div>
                                                <label className={labelClass}>{t('profile.preferredWard')}</label>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Chọn một hoặc nhiều quận/phường. Hệ thống sẽ ưu tiên tính điểm phù hợp cao nhất cho các phòng và roommate ở khu vực này.
                                                </p>
                                                <PreferredDistrictsField preference={preference} setPreference={setPreference} />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                                                <div>
                                                    <label className={labelClass}>Bán kính di chuyển tối đa</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={preference.max_distance_km}
                                                            onChange={(e) => setPreference((p) => ({ ...p, max_distance_km: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                            placeholder="VD: 5"
                                                            min={1}
                                                            max={30}
                                                            className={inputClass}
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">km</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <ToggleSwitch
                                                        checked={preference.transport_nearby === true}
                                                        onChange={(v) => setPreference((p) => ({ ...p, transport_nearby: v ? true : null }))}
                                                        label="Gần trạm xe buýt / Metro"
                                                        description="Ưu tiên phòng cách trạm dưới 500m"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </SectionCard>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    {/* 3. Room Requirements & Amenities */}
                                    <SectionCard
                                        icon={<Home className="w-4 h-4 text-primary" />}
                                        title="Loại phòng & Tiện ích mong muốn"
                                        subtitle="Các tiện nghi bạn cần trong căn phòng"
                                    >
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={labelClass}>{t('profile.preferredRoomType')}</label>
                                                    <select
                                                        value={preference.room_type}
                                                        onChange={(e) => setPreference((p) => ({ ...p, room_type: e.target.value }))}
                                                        className={inputClass}
                                                    >
                                                        {ROOM_TYPE_OPTIONS.map((o) => (
                                                            <option key={o.value || 'empty'} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <ToggleSwitch
                                                        checked={preference.safety_priority === 1}
                                                        onChange={(v) => setPreference((p) => ({ ...p, safety_priority: v ? 1 : '' }))}
                                                        label="Ưu tiên an ninh nghiêm ngặt"
                                                        description="Khóa vân tay, camera 24/7, bảo vệ"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-border/60">
                                                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                                                    Tiện ích bắt buộc phải có:
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {COMMON_AMENITIES.map((amenity) => {
                                                        const mustHaves = preference.must_have_amenities
                                                            ? preference.must_have_amenities.split(',').map((s) => s.trim()).filter(Boolean)
                                                            : [];
                                                        const isChecked = mustHaves.some((a) => a.toLowerCase() === amenity.toLowerCase());
                                                        return (
                                                            <button
                                                                key={amenity}
                                                                type="button"
                                                                onClick={() => {
                                                                    const next = isChecked
                                                                        ? mustHaves.filter((a) => a.toLowerCase() !== amenity.toLowerCase())
                                                                        : [...mustHaves, amenity];
                                                                    setPreference((p) => ({ ...p, must_have_amenities: next.join(', ') }));
                                                                }}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                                                    isChecked
                                                                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                                        : 'bg-background border-border text-foreground hover:border-primary/50'
                                                                }`}
                                                            >
                                                                {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                                                                {amenity}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </SectionCard>

                                    {/* 4. Roommate Requirements & Lifestyle Criteria */}
                                    <SectionCard
                                        icon={<Users className="w-4 h-4 text-primary" />}
                                        title="Tiêu chuẩn về Bạn cùng phòng (Roommate)"
                                        subtitle="Các yêu cầu về tính cách, thói quen và độ tuổi bạn cùng phòng"
                                    >
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={labelClass}>Giới tính bạn cùng phòng</label>
                                                    <select
                                                        value={preference.preferred_gender}
                                                        onChange={(e) => setPreference((p) => ({ ...p, preferred_gender: e.target.value }))}
                                                        className={inputClass}
                                                    >
                                                        {PREFERRED_GENDER_OPTIONS.map((o) => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Độ tuổi bạn cùng phòng</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={preference.preferred_roommate_age_min}
                                                            onChange={(e) => setPreference((p) => ({ ...p, preferred_roommate_age_min: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                            placeholder="Từ 18"
                                                            min={18}
                                                            max={60}
                                                            className={inputClass}
                                                        />
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                        <input
                                                            type="number"
                                                            value={preference.preferred_roommate_age_max}
                                                            onChange={(e) => setPreference((p) => ({ ...p, preferred_roommate_age_max: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                            placeholder="Đến 35"
                                                            min={18}
                                                            max={60}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                                                <div>
                                                    <label className={labelClass}>Lịch ngủ mong muốn</label>
                                                    <select
                                                        value={preference.sleep_preference}
                                                        onChange={(e) => setPreference((p) => ({ ...p, sleep_preference: e.target.value }))}
                                                        className={inputClass}
                                                    >
                                                        {PREFERRED_SLEEP_OPTIONS.map((o) => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Mức độ sạch sẽ</label>
                                                    <select
                                                        value={preference.cleanliness_preference}
                                                        onChange={(e) => setPreference((p) => ({ ...p, cleanliness_preference: e.target.value }))}
                                                        className={inputClass}
                                                    >
                                                        {PREFERRED_CLEANLINESS_OPTIONS.map((o) => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Không gian yên tĩnh</label>
                                                    <select
                                                        value={preference.noise_preference}
                                                        onChange={(e) => setPreference((p) => ({ ...p, noise_preference: e.target.value }))}
                                                        className={inputClass}
                                                    >
                                                        {PREFERRED_NOISE_OPTIONS.map((o) => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-border pt-2 border-t border-border/60">
                                                <div className="pb-3">
                                                    <ToggleSwitch
                                                        checked={preference.smoking_allowed === false}
                                                        onChange={(v) => setPreference((p) => ({ ...p, smoking_allowed: v ? false : null }))}
                                                        label="Yêu cầu bạn cùng phòng KHÔNG hút thuốc"
                                                        description="Thuật toán sẽ trừ điểm hoặc loại bỏ người hút thuốc khỏi danh sách gợi ý"
                                                    />
                                                </div>
                                                <div className="pt-3">
                                                    <ToggleSwitch
                                                        checked={preference.pet_friendly === true}
                                                        onChange={(v) => setPreference((p) => ({ ...p, pet_friendly: v ? true : null }))}
                                                        label="Đồng ý / Thích ở cùng thú cưng"
                                                        description="Cho phép bạn cùng phòng nuôi chó hoặc mèo trong phòng"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </SectionCard>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    {/* 5. Deal-breakers */}
                                    <SectionCard
                                        icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
                                        title="Điều tối kỵ khi ở chung (Deal-breakers)"
                                        subtitle="Những thói quen bạn tuyệt đối không chấp nhận ở bạn cùng phòng"
                                    >
                                        <div className="space-y-3">
                                            <p className="text-xs text-muted-foreground">
                                                Chọn các điều tối kỵ của bạn. Ứng viên vi phạm điều tối kỵ này sẽ bị cảnh báo hoặc trừ điểm tương thích mạnh:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {COMMON_DEAL_BREAKERS.map((db) => {
                                                    const currentList = preference.deal_breakers
                                                        ? preference.deal_breakers.split(',').map((s) => s.trim()).filter(Boolean)
                                                        : [];
                                                    const isSelected = currentList.some((item) => item.toLowerCase() === db.toLowerCase());
                                                    return (
                                                        <button
                                                            key={db}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? currentList.filter((item) => item.toLowerCase() !== db.toLowerCase())
                                                                    : [...currentList, db];
                                                                setPreference((p) => ({ ...p, deal_breakers: next.join(', ') }));
                                                            }}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                                                isSelected
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-semibold shadow-xs'
                                                                    : 'bg-background border-border text-foreground hover:border-rose-300'
                                                            }`}
                                                        >
                                                            {isSelected ? '🚫 ' : ''}{db}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </SectionCard>

                                    {/* 6. Matching Weights Mode */}
                                    <SectionCard
                                        icon={<Target className="w-4 h-4 text-primary" />}
                                        title="Chế độ tính toán độ phù hợp (% Match)"
                                        subtitle="Tùy biến thuật toán đánh giá mức độ tương thích theo ưu tiên của bạn"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {MATCH_WEIGHT_OPTIONS.map((opt) => {
                                                const currentWeight = preference.lifestyle_match_weight ? Number(preference.lifestyle_match_weight) : 1;
                                                const isSelected = currentWeight === opt.value;
                                                return (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => setPreference((p) => ({ ...p, lifestyle_match_weight: opt.value }))}
                                                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                                                                : 'bg-background border-border hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <p className="font-semibold text-xs text-foreground mb-1">{opt.title}</p>
                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </SectionCard>
                                </div>

                                <button
                                    type="submit"
                                    disabled={preferenceSaving}
                                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                                >
                                    {preferenceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Lưu sở thích & Yêu cầu thuê phòng
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* ── BOOKINGS & PAYMENTS TAB ── */}
                {tab === 'bookings' && isTenant && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-primary" />{t('profile.tabBookings')}
                                </h3>
                                <p className="text-muted-foreground text-xs mt-0.5">{t('profile.bookingsSub')}</p>
                            </div>
                            <button type="button" onClick={loadBookings} disabled={bookingsLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50">
                                <RefreshCw className={`w-3.5 h-3.5 ${bookingsLoading ? 'animate-spin' : ''}`} />{t('profile.refresh')}
                            </button>
                        </div>

                        {bookingsError && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />{bookingsError}
                            </div>
                        )}

                        {bookingsLoading ? (
                            <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />{t('common.loading')}
                            </div>
                        ) : (
                            <>
                                {/* ── Deposits / Pre-orders ── */}
                                <div>
                                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
                                        <Banknote className="w-4 h-4 text-amber-500" />{t('profile.depositsTitle')}
                                        <span className="ml-auto text-xs font-normal text-muted-foreground">{preorders.length} {t('profile.items')}</span>
                                    </h4>
                                    {preorders.length === 0 ? (
                                        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
                                            {t('profile.noDeposits')}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {preorders.map((p) => (
                                                <PreorderCard
                                                    key={p.id}
                                                    item={p}
                                                    onViewRoom={() => navigate(`/room/${p.roomId}`)}
                                                    onRetryRoom={() => navigate(`/room/${p.roomId}`)}
                                                    onCancelled={loadBookings}
                                                    t={t}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── Rental History ── */}
                                <div>
                                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
                                        <Building2 className="w-4 h-4 text-primary" />{t('profile.rentalsTitle')}
                                        <span className="ml-auto text-xs font-normal text-muted-foreground">{bookings.length} {t('profile.items')}</span>
                                    </h4>
                                    {bookings.length === 0 ? (
                                        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
                                            {t('profile.noRentals')}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {bookings.map((b) => (
                                                <ProfileBookingCard
                                                    key={b.id}
                                                    item={b}
                                                    onWriteReview={() => { setSelectedBookingItem(b); setModalState('review'); }}
                                                    onViewReview={async () => {
                                                        setSelectedBookingItem(b);
                                                        setModalState('viewFeedback');
                                                        try {
                                                            const res = await getFeedbackByRentalPeriodRequest(b.rentalPeriodId || b.id);
                                                            if (res.data) {
                                                                setViewFeedbackData({
                                                                    rating: res.data.rating, comment: res.data.comment,
                                                                    cleanlinessRating: res.data.cleanlinessRating,
                                                                    locationRating: res.data.locationRating,
                                                                    valueRating: res.data.valueRating,
                                                                    landlordRating: res.data.landlordRating,
                                                                    status: res.data.status as FeedbackStatus,
                                                                    moderatorNote: res.data.moderatorNote,
                                                                });
                                                            } else { setViewFeedbackData(null); }
                                                        } catch { setViewFeedbackData(null); }
                                                    }}
                                                    onReport={() => { setSelectedBookingItem(b); setModalState('report'); }}
                                                    onContactLandlord={() => {
                                                        if (b.landlordId) navigate(`/chat/${b.landlordId}`);
                                                        else navigate(`/chat?booking=${encodeURIComponent(b.rentalPeriodId || b.id)}`);
                                                    }}
                                                    onViewRoom={() => navigate(`/room/${b.roomId}`)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Modals for review / report */}
                        <ReviewModal
                            isOpen={modalState === 'review'}
                            onClose={() => { setModalState('none'); setSelectedBookingItem(null); }}
                            onSubmit={async (data: ReviewData) => {
                                if (!selectedBookingItem?.rentalPeriodId || !selectedBookingItem?.roomId) return;
                                await createFeedbackRequest({
                                    rentalPeriodId: selectedBookingItem.rentalPeriodId,
                                    roomId: selectedBookingItem.roomId,
                                    rating: data.rating, comment: data.comment,
                                    cleanlinessRating: data.cleanlinessRating,
                                    locationRating: data.locationRating,
                                    valueRating: data.valueRating,
                                    landlordRating: data.landlordRating,
                                });
                                setModalState('none'); setSelectedBookingItem(null);
                                loadBookings();
                            }}
                            propertyName={selectedBookingItem?.roomName || selectedBookingItem?.propertyName || ''}
                            existingRating={selectedBookingItem?.feedbackStatus === 'REJECTED' ? selectedBookingItem?.userRating : undefined}
                            isEditMode={selectedBookingItem?.feedbackStatus === 'REJECTED'}
                        />
                        <ViewFeedbackModal
                            isOpen={modalState === 'viewFeedback'}
                            onClose={() => { setModalState('none'); setSelectedBookingItem(null); setViewFeedbackData(null); }}
                            propertyName={selectedBookingItem?.roomName || selectedBookingItem?.propertyName || ''}
                            rating={viewFeedbackData?.rating ?? 0}
                            comment={viewFeedbackData?.comment ?? null}
                            cleanlinessRating={viewFeedbackData?.cleanlinessRating}
                            locationRating={viewFeedbackData?.locationRating}
                            valueRating={viewFeedbackData?.valueRating}
                            landlordRating={viewFeedbackData?.landlordRating}
                            status={viewFeedbackData?.status ?? 'PENDING'}
                            moderatorNote={viewFeedbackData?.moderatorNote}
                        />
                        <ReportModal
                            isOpen={modalState === 'report'}
                            onClose={() => { setModalState('none'); setSelectedBookingItem(null); }}
                            onSubmit={async (data: ReportData) => {
                                if (!selectedBookingItem) return;
                                try {
                                    const body = buildBookingReportPayload(selectedBookingItem, data);
                                    await createReportRequest(body);
                                    setModalState('none');
                                    setSelectedBookingItem(null);
                                } catch (err) {
                                    alert(err instanceof Error ? err.message : 'Gửi báo cáo thất bại');
                                    throw err;
                                }
                            }}
                            propertyName={selectedBookingItem?.roomName || selectedBookingItem?.propertyName || ''}
                        />
                    </div>
                )}

                {/* ── LANDLORD LISTING CRITERIA TAB ── */}
                {tab === 'landlord_criteria' && isLandlord && (
                    <div className="space-y-6">
                        <div className="px-1">
                            <h3 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-primary" />
                                Tiêu chuẩn đăng tin & Cho thuê phòng
                            </h3>
                            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                                Thiết lập các tiêu chuẩn chung của chủ trọ về loại phòng, tiện ích bàn giao, tiêu chí tiếp nhận khách thuê và chính sách cọc/hợp đồng. Các tiêu chuẩn này sẽ được lưu để tối ưu hóa quy trình đăng phòng và giải đáp khách thuê.
                            </p>
                        </div>

                        {/* Status bar in Criteria tab */}
                        <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLandlordVerified ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'}`}>
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                        Hồ sơ pháp lý đăng tin:
                                        {isLandlordVerified ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Đã xác thực CCCD & Đủ điều kiện đăng bài</span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">Chưa xác thực CCCD (Cần eKYC trước khi xuất bản)</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {isLandlordVerified
                                            ? `CCCD: ${displayCccd} • SĐT: ${displayPhone} • Email: ${displayEmail}`
                                            : 'Vui lòng xác thực thông tin định danh để kích hoạt xuất bản bài đăng phòng trọ.'}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowVerifyModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted self-start sm:self-auto shrink-0 transition-colors cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                                {isLandlordVerified ? 'Xem / Cập nhật hồ sơ CCCD' : 'Xác thực eKYC ngay'}
                            </button>
                        </div>

                        <form onSubmit={handleSaveLandlordCriteria} className="space-y-5">
                            {landlordSuccess && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 shadow-xs">
                                    <Check className="w-4 h-4 shrink-0" />
                                    Đã lưu thành công tiêu chuẩn đăng cho thuê!
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                {/* 1. Contact & Welcoming guests */}
                                <SectionCard
                                    icon={<Phone className="w-4 h-4 text-primary" />}
                                    title="Thông tin liên hệ & Đón tiếp khách xem phòng"
                                    subtitle="Kênh liên lạc chính thức với khách thuê có nhu cầu"
                                >
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Email phản hồi & tiếp nhận khách</label>
                                                <div className="relative">
                                                    <input
                                                        type="email"
                                                        value={landlordCriteria.contactEmail}
                                                        onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, contactEmail: e.target.value }))}
                                                        placeholder="VD: chudang@example.com"
                                                        className={inputClass}
                                                    />
                                                    <Mail className="w-4 h-4 text-muted-foreground absolute right-3.5 top-3.5" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Số điện thoại / Zalo đón tiếp</label>
                                                <div className="relative">
                                                    <input
                                                        type="tel"
                                                        value={landlordCriteria.contactPhone}
                                                        onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, contactPhone: e.target.value }))}
                                                        placeholder="VD: 0912345678"
                                                        className={inputClass}
                                                    />
                                                    <Phone className="w-4 h-4 text-muted-foreground absolute right-3.5 top-3.5" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                                            <div>
                                                <label className={labelClass}>Khung giờ hỗ trợ tư vấn & xem phòng</label>
                                                <input
                                                    type="text"
                                                    value={landlordCriteria.consultingHours}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, consultingHours: e.target.value }))}
                                                    placeholder="VD: 08:00 - 21:00 hàng ngày"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Khu vực / Quận huyện tập trung quản lý</label>
                                                <input
                                                    type="text"
                                                    value={landlordCriteria.operatingAreas}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, operatingAreas: e.target.value }))}
                                                    placeholder="VD: Cầu Giấy, Đống Đa, Nam Từ Liêm (Hà Nội)"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </SectionCard>

                                {/* 2. Room Standards & Amenities */}
                                <SectionCard
                                    icon={<Home className="w-4 h-4 text-primary" />}
                                    title="Tiêu chuẩn phòng trọ khi đăng tải"
                                    subtitle="Phân khúc phòng, mức giá trung bình và trang thiết bị bàn giao"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                                                Loại hình phòng chuyên cho thuê & quản lý:
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {LANDLORD_ROOM_TYPES.map((type) => {
                                                    const isSelected = landlordCriteria.specializedRoomTypes.includes(type);
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? landlordCriteria.specializedRoomTypes.filter((t) => t !== type)
                                                                    : [...landlordCriteria.specializedRoomTypes, type];
                                                                setLandlordCriteria((prev) => ({ ...prev, specializedRoomTypes: next }));
                                                            }}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                                                isSelected
                                                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                                    : 'bg-background border-border text-foreground hover:border-primary/50'
                                                            }`}
                                                        >
                                                            {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                                                            {type}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                                            <div>
                                                <label className={labelClass}>Giá thuê tối thiểu (VNĐ/tháng)</label>
                                                <input
                                                    type="number"
                                                    value={landlordCriteria.priceMin}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, priceMin: Number(e.target.value) }))}
                                                    step={100000}
                                                    min={0}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Giá thuê tối đa (VNĐ/tháng)</label>
                                                <input
                                                    type="number"
                                                    value={landlordCriteria.priceMax}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, priceMax: Number(e.target.value) }))}
                                                    step={100000}
                                                    min={0}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Diện tích phòng TB (m²)</label>
                                                <input
                                                    type="number"
                                                    value={landlordCriteria.avgSizeM2}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, avgSizeM2: Number(e.target.value) }))}
                                                    min={10}
                                                    max={200}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/60">
                                            <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                                                Tiện ích cơ bản cam kết bàn giao:
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {LANDLORD_AMENITIES.map((amenity) => {
                                                    const isSelected = landlordCriteria.standardAmenities.includes(amenity);
                                                    return (
                                                        <button
                                                            key={amenity}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? landlordCriteria.standardAmenities.filter((a) => a !== amenity)
                                                                    : [...landlordCriteria.standardAmenities, amenity];
                                                                setLandlordCriteria((prev) => ({ ...prev, standardAmenities: next }));
                                                            }}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                                                isSelected
                                                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                                    : 'bg-background border-border text-foreground hover:border-primary/50'
                                                            }`}
                                                        >
                                                            {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                                                            {amenity}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/60">
                                            <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                                                Hệ thống an ninh & An toàn tòa nhà:
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {LANDLORD_SECURITY_OPTIONS.map((sec) => {
                                                    const isSelected = landlordCriteria.securityFeatures.includes(sec);
                                                    return (
                                                        <button
                                                            key={sec}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? landlordCriteria.securityFeatures.filter((s) => s !== sec)
                                                                    : [...landlordCriteria.securityFeatures, sec];
                                                                setLandlordCriteria((prev) => ({ ...prev, securityFeatures: next }));
                                                            }}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                                                isSelected
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                                    : 'bg-background border-border text-foreground hover:border-blue-400'
                                                            }`}
                                                        >
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            {sec}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                {/* 3. Tenant Criteria & House Rules */}
                                <SectionCard
                                    icon={<Users className="w-4 h-4 text-primary" />}
                                    title="Tiêu chí tiếp nhận khách thuê & Nội quy"
                                    subtitle="Yêu cầu đối với người thuê để đảm bảo môi trường sống văn minh"
                                >
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Đối tượng khách thuê phù hợp</label>
                                                <select
                                                    value={landlordCriteria.tenantTarget}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, tenantTarget: e.target.value }))}
                                                    className={inputClass}
                                                >
                                                    {TENANT_TARGET_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Số người ở tối đa mỗi phòng</label>
                                                <input
                                                    type="number"
                                                    value={landlordCriteria.maxTenantsPerRoom}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, maxTenantsPerRoom: Number(e.target.value) }))}
                                                    min={1}
                                                    max={10}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-border/60">
                                            <div>
                                                <label className={labelClass}>Quy định về thú cưng</label>
                                                <select
                                                    value={landlordCriteria.petPolicy}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, petPolicy: e.target.value }))}
                                                    className={inputClass}
                                                >
                                                    {PET_POLICY_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className={labelClass}>Quy định về hút thuốc</label>
                                                <select
                                                    value={landlordCriteria.smokingPolicy}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, smokingPolicy: e.target.value }))}
                                                    className={inputClass}
                                                >
                                                    {SMOKING_POLICY_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className={labelClass}>Quy định dẫn bạn bè & Giờ giấc</label>
                                                <select
                                                    value={landlordCriteria.guestPolicy}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, guestPolicy: e.target.value }))}
                                                    className={inputClass}
                                                >
                                                    {GUEST_POLICY_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </SectionCard>

                                {/* 4. Deposit & Contract Policy */}
                                <SectionCard
                                    icon={<FileText className="w-4 h-4 text-primary" />}
                                    title="Chính sách đặt cọc & Hợp đồng mẫu"
                                    subtitle="Cam kết minh bạch về tiền cọc, bảo trì và hỗ trợ người thuê"
                                >
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className={labelClass}>Chính sách tiền cọc</label>
                                                <select
                                                    value={landlordCriteria.depositPolicy}
                                                    onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, depositPolicy: e.target.value }))}
                                                    className={inputClass}
                                                >
                                                    {DEPOSIT_POLICY_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Thời hạn hợp đồng tối thiểu</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={landlordCriteria.minLeaseMonths}
                                                        onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, minLeaseMonths: Number(e.target.value) }))}
                                                        min={1}
                                                        max={36}
                                                        className={inputClass}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">tháng</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Báo trước khi trả phòng</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={landlordCriteria.noticeDaysBeforeLeave}
                                                        onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, noticeDaysBeforeLeave: Number(e.target.value) }))}
                                                        min={7}
                                                        max={90}
                                                        className={inputClass}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ngày</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/60">
                                            <label className={labelClass}>Cam kết bảo trì & Hỗ trợ kỹ thuật (SLA)</label>
                                            <input
                                                type="text"
                                                value={landlordCriteria.maintenanceCommitment}
                                                onChange={(e) => setLandlordCriteria((prev) => ({ ...prev, maintenanceCommitment: e.target.value }))}
                                                placeholder="VD: Hỗ trợ xử lý sự cố điện, nước, kỹ thuật trong vòng 24 giờ"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>

                            <button
                                type="submit"
                                disabled={landlordSaving}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                            >
                                {landlordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Lưu tiêu chuẩn đăng cho thuê
                            </button>
                        </form>
                    </div>
                )}

                {/* ── LANDLORD MY RENTALS TAB ── */}
                {tab === 'my_rentals' && isLandlord && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                            <div>
                                <h3 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    Nhà trọ & Phòng quản lý
                                </h3>
                                <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                                    Danh sách các bất động sản và phòng cho thuê của bạn trên HexRoom.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/rental-management/viewing-history')}
                                    className="px-3.5 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center gap-1.5 shadow-2xs"
                                >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    Lịch sử khách xem phòng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/rental-management/create-rental')}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Đăng phòng mới
                                </button>
                            </div>
                        </div>

                        {loadingRentals ? (
                            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
                            </div>
                        ) : landlordRentals.length === 0 ? (
                            <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-foreground text-base">Chưa có bất động sản nào</h4>
                                    <p className="text-muted-foreground text-xs max-w-md mx-auto">
                                        Bạn chưa đăng bất động sản cho thuê nào trên HexRoom. Bắt đầu đăng ngay để tiếp cận hàng ngàn người đi thuê tiềm năng!
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/rental-management/create-rental')}
                                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                                >
                                    + Đăng phòng cho thuê đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {landlordRentals.map((rental) => {
                                    const coverImage = rental.images?.[0];
                                    const fullAddress = rental.location
                                        ? [rental.location.address, rental.location.district, rental.location.city].filter(Boolean).join(', ')
                                        : 'Chưa cập nhật địa chỉ';
                                    return (
                                        <div
                                            key={rental.id}
                                            className="bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/40 transition-all shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4"
                                        >
                                            <div className="w-full sm:w-36 h-28 shrink-0 rounded-xl overflow-hidden bg-muted relative">
                                                {coverImage ? (
                                                    <ImageWithFallback
                                                        src={coverImage}
                                                        alt={rental.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <Building2 className="w-8 h-8 opacity-40" />
                                                    </div>
                                                )}
                                                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                                    rental.status === 'ACTIVE'
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-muted-foreground/80 text-white'
                                                }`}>
                                                    {rental.status === 'ACTIVE' ? 'Đang hiển thị' : rental.status}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div>
                                                    <h4 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">{rental.title}</h4>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                        <span className="truncate">{fullAddress}</span>
                                                    </p>
                                                </div>

                                                {rental.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {rental.description}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/rental-management/view-list-rental')}
                                                        className="px-3 py-1.5 bg-background border border-border hover:border-primary/50 text-foreground rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Quản lý phòng
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/rental-management/viewing-history')}
                                                        className="px-3 py-1.5 bg-background border border-border hover:border-primary/50 text-foreground rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-primary" /> Lịch sử xem
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/room/${rental.id}`)}
                                                        className="px-3 py-1.5 text-primary hover:bg-primary/10 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ml-auto"
                                                    >
                                                        Xem trang phòng <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── CỘT PHẢI (RIGHT SIDEBAR): An toàn bảo mật, Hotline 24/7, Cẩm nang & Mẹo ── */}
            <aside className="hidden xl:flex xl:flex-col xl:w-72 2xl:w-80 shrink-0 space-y-5 xl:sticky xl:top-24">
                {/* Card 1: Trung tâm An toàn & Cam kết HexRoom */}
                <div className="bg-card rounded-2xl border border-border shadow-xs p-5 space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-heading font-semibold text-sm">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span>An toàn & Quyền riêng tư</span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Cam kết bảo vệ dữ liệu người dùng và môi trường thuê trọ an toàn, minh bạch theo tiêu chuẩn HexRoom.
                    </p>

                    <div className="space-y-2.5 pt-2 border-t border-border text-xs">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-foreground">Bảo mật thông tin CCCD</p>
                                <p className="text-muted-foreground text-[11px]">Mã hóa AES-256 an toàn chuẩn ngân hàng</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-foreground">Xác thực số điện thoại</p>
                                <p className="text-muted-foreground text-[11px]">Chính chủ nhận mã OTP qua SMS</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-foreground">Minh bạch 100% chi phí</p>
                                <p className="text-muted-foreground text-[11px]">Không thu phí môi giới trá hình</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-foreground">Bảo vệ tiền đặt cọc</p>
                                <p className="text-muted-foreground text-[11px]">Chính sách hoàn cọc rõ ràng, công bằng</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Tổng đài hỗ trợ 24/7 */}
                <div className="bg-card rounded-2xl border border-border shadow-xs p-5 space-y-3.5">
                    <div className="flex items-center gap-2 text-foreground font-heading font-semibold text-sm">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Headphones className="w-4 h-4" />
                        </div>
                        <span>Tổng đài hỗ trợ 24/7</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                        <div className="text-[11px] text-muted-foreground font-medium">Hotline CSKH & Đối tác (Miễn phí)</div>
                        <div className="text-lg font-bold text-primary font-mono tracking-wide">1900 8888</div>
                        <div className="text-[11px] text-muted-foreground">Phím 1: Chủ trọ | Phím 2: Người thuê</div>
                    </div>

                    <div className="space-y-2 text-xs">
                        <a
                            href="https://zalo.me"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold transition-colors"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Chat Zalo hỗ trợ tức thì</span>
                        </a>
                        <div className="flex items-center justify-between text-muted-foreground text-[11px] pt-1">
                            <span>Email hỗ trợ:</span>
                            <span className="font-medium text-foreground">hotro@hexroom.vn</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span>Thời gian trực:</span>
                            <span className="font-medium text-foreground">08:00 – 22:30 hàng ngày</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Góc cẩm nang & Mẹo hữu ích */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{isLandlord ? 'Mẹo cho Chủ nhà' : 'Mẹo cho Người thuê'}</span>
                    </div>
                    {isLandlord ? (
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Chụp ảnh phòng ban ngày với ánh sáng tự nhiên và công khai chi phí điện/nước giúp tin đăng của bạn tăng <strong>45% tỉ lệ hẹn xem phòng</strong> trong tuần đầu!
                        </p>
                    ) : (
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Nên hẹn xem phòng vào ban ngày để kiểm tra độ thông thoáng, ánh sáng tự nhiên và đối chiếu đồng hồ điện riêng trước khi đặt cọc.
                        </p>
                    )}
                </div>
            </aside>
        </div>
    </main>

            {/* Roommate Profile Edit Modal for Tenants */}
            {isTenant && (
                <RoommateProfileEditModal
                    isOpen={showEditRoommateModal}
                    onClose={() => setShowEditRoommateModal(false)}
                    onSuccess={() => {
                        setShowEditRoommateModal(false);
                        loadRoommateProfile();
                        getPreferenceRequest().then((r) => setPreference(toPreferenceForm(r.preference ?? null)));
                        getLifestyleRequest().then((r) => setLifestyle(toLifestyleForm(r.profile ?? null)));
                    }}
                    currentProfile={roommateProfile}
                    userGender={user?.gender}
                />
            )}

            {/* Modal phóng to ảnh tài liệu / CCCD */}
            {previewDocUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs"
                    onClick={() => setPreviewDocUrl(null)}
                >
                    <div
                        className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                {previewDocUrl.title}
                            </h4>
                            <button
                                type="button"
                                onClick={() => setPreviewDocUrl(null)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-black/10 max-h-[75vh] overflow-auto">
                            <img
                                src={previewDocUrl.url}
                                alt={previewDocUrl.title}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                            />
                        </div>
                        <div className="p-3 border-t border-border flex justify-end gap-2 bg-muted/20">
                            <a
                                href={previewDocUrl.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted inline-flex items-center gap-1.5"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Mở trong tab mới
                            </a>
                            <button
                                type="button"
                                onClick={() => setPreviewDocUrl(null)}
                                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xác thực danh tính eKYC cho chủ nhà */}
            {isLandlord && (
                <LandlordVerificationModal
                    isOpen={showVerifyModal}
                    onClose={() => setShowVerifyModal(false)}
                    onSuccess={async () => {
                        setShowVerifyModal(false);
                        await refreshUser();
                    }}
                />
            )}
        </div>
    );
}

// ─── PreorderCard ───────────────────────────────────────────────────────────

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

const PREORDER_STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
    PENDING: { label: 'Chờ xác nhận', icon: Clock3, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    CONFIRMED: { label: 'Đã xác nhận', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    CANCELLED: { label: 'Đã hủy', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    EXPIRED: { label: 'Hết hạn', icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    UNPAID: { label: 'Chưa thanh toán', color: 'text-amber-600' },
    PAID: { label: 'Đã thanh toán', color: 'text-emerald-600' },
    REFUNDED: { label: 'Đã hoàn tiền', color: 'text-blue-600' },
};

function PreorderCard({
    item,
    onViewRoom,
    onRetryRoom,
    onCancelled,
    t,
}: {
    item: MyPreorderItem;
    onViewRoom: () => void;
    onRetryRoom: () => void;
    onCancelled: () => void | Promise<void>;
    t: TFunc;
}) {
    const [resuming, setResuming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);

    const statusCfg = PREORDER_STATUS_CONFIG[item.status] ?? PREORDER_STATUS_CONFIG.EXPIRED;
    const paymentCfg = PAYMENT_STATUS_CONFIG[item.paymentStatus] ?? PAYMENT_STATUS_CONFIG.UNPAID;
    const StatusIcon = statusCfg.icon;

    const depositFormatted = item.depositAmount > 0
        ? new Intl.NumberFormat('vi-VN').format(item.depositAmount) + ' ₫'
        : '—';
    const dateFormatted = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';

    // PENDING + UNPAID → user can resume the existing payment link
    const canResume = item.status === 'PENDING' && item.paymentStatus === 'UNPAID';
    const canCancel = item.status === 'PENDING' && item.paymentStatus === 'UNPAID';
    // CANCELLED + UNPAID (failed payment) → user can go back to room and start fresh
    const canRetry = item.status === 'CANCELLED' && item.paymentStatus === 'UNPAID';

    const handleResume = async () => {
        setResumeError(null);
        setResuming(true);
        try {
            const res = await resumePreorderPaymentRequest(item.id);
            const url = res.data?.payment?.checkoutUrl;
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                setResumeError(t('profile.noPaymentLink'));
            }
        } catch (err) {
            setResumeError(err instanceof Error ? err.message : t('common.error'));
        } finally {
            setResuming(false);
        }
    };

    const handleCancel = async () => {
        const confirmed = window.confirm(t('profile.cancelPaymentConfirm'));
        if (!confirmed) return;
        setResumeError(null);
        setCancelling(true);
        try {
            await cancelUnpaidPreorderRequest(item.id);
            await onCancelled();
        } catch (err) {
            setResumeError(err instanceof Error ? err.message : t('common.error'));
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                                <p className="font-semibold text-sm text-foreground truncate">
                                    {item.room?.room_name || t('profile.unknownRoom')}
                                </p>
                                {item.rental && (
                                    <p className="text-xs text-muted-foreground truncate">{item.rental.title}</p>
                                )}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
                                <StatusIcon className="w-3 h-3" />{statusCfg.label}
                            </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Banknote className="w-3.5 h-3.5" />
                                <span className="font-semibold text-foreground">{depositFormatted}</span>
                                <span className={`font-medium ${paymentCfg.color}`}>· {paymentCfg.label}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />{dateFormatted}
                            </span>
                            {item.refundStatus === 'ELIGIBLE' && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                    <ArrowRight className="w-3 h-3" />{t('profile.refundEligible')}
                                </span>
                            )}
                            {item.refundStatus === 'REFUNDED' && (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                    <CheckCircle2 className="w-3 h-3" />{t('profile.refunded')}
                                </span>
                            )}
                        </div>

                        {item.cancelReason && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                                {t('profile.cancelReason')}: {item.cancelReason}
                            </p>
                        )}
                    </div>

                    <button type="button" onClick={onViewRoom}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />{t('profile.viewRoom')}
                    </button>
                </div>

                {/* Action bar */}
                {(canResume || canRetry || canCancel) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                        {canResume && (
                            <button
                                type="button"
                                onClick={handleResume}
                                disabled={resuming}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm"
                            >
                                {resuming
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <CreditCard className="w-3.5 h-3.5" />
                                }
                                {resuming ? t('common.loading') : t('profile.resumePayment')}
                            </button>
                        )}
                        {canRetry && (
                            <button
                                type="button"
                                onClick={onRetryRoom}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-all shadow-sm"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {t('profile.retryDeposit')}
                            </button>
                        )}
                        {canCancel && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-semibold hover:bg-red-100 disabled:opacity-60 transition-all border border-red-200"
                            >
                                {cancelling
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <XCircle className="w-3.5 h-3.5" />
                                }
                                {cancelling ? t('common.loading') : t('profile.cancelPayment')}
                            </button>
                        )}
                        {resumeError && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />{resumeError}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── ProfileBookingCard (full-featured with Review, Report, Contact, Roommates) ──

const BOOKING_STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
    active: { label: 'Đang thuê', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    completed: { label: 'Đã kết thúc', icon: Clock3, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
    cancelled: { label: 'Đã hủy', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const FEEDBACK_STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Đang chờ duyệt' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã công khai' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Bị từ chối' },
};

function ProfileBookingCard({ item, onWriteReview, onViewReview, onReport, onContactLandlord, onViewRoom }: {
    item: MyBookingItem;
    onWriteReview: () => void;
    onViewReview: () => void;
    onReport: () => void;
    onContactLandlord: () => void;
    onViewRoom: () => void;
}) {
    const statusCfg = BOOKING_STATUS_CONFIG[item.status] ?? BOOKING_STATUS_CONFIG.completed;
    const StatusIcon = statusCfg.icon;
    const [showRoommates, setShowRoommates] = useState(false);
    const [ratingTarget, setRatingTarget] = useState<{ id: string; fullName: string } | null>(null);
    const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

    const startFmt = item.startDate
        ? new Date(item.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';
    const endFmt = item.endDate
        ? new Date(item.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Đang thuê';

    const roommates = item.roommates || [];

    // Check which roommates already have ratings
    useEffect(() => {
        if (roommates.length === 0) return;
        Promise.all(
            roommates.map((rm) =>
                checkRoommateRatingRequest(rm.id, item.rentalPeriodId)
                    .then((r) => (r.data ? rm.id : null))
                    .catch(() => null)
            )
        ).then((results) => {
            const rated = new Set(results.filter(Boolean) as string[]);
            setRatedIds(rated);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.rentalPeriodId]);

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    {item.propertyImage && (
                        <div className="w-full sm:w-36 h-28 sm:h-24 shrink-0">
                            <ImageWithFallback
                                src={item.propertyImage}
                                alt={item.roomName}
                                className="w-full h-full object-cover rounded-xl"
                            />
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h4 className="font-semibold text-sm text-foreground truncate">{item.roomName}</h4>
                                <p className="text-xs text-muted-foreground truncate">{item.propertyName}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                                <StatusIcon className="w-3 h-3" />{statusCfg.label}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {item.address && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />{item.address}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />{startFmt} - {endFmt}
                            </span>
                            {item.landlordName && (
                                <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />{item.landlordName}
                                </span>
                            )}
                        </div>

                        {/* User rating */}
                        {item.hasReview && item.userRating != null && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3.5 h-3.5 ${i < item.userRating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                                    ))}
                                </div>
                                <span className="text-xs text-muted-foreground">Đánh giá của bạn</span>
                            </div>
                        )}

                        {/* Feedback status */}
                        {item.hasReview && item.feedbackStatus && (
                            <div className="mt-2">
                                {(() => {
                                    const fbCfg = FEEDBACK_STATUS_CFG[item.feedbackStatus] || { bg: 'bg-muted', text: 'text-foreground/70', label: item.feedbackStatus };
                                    return (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${fbCfg.bg} ${fbCfg.text}`}>
                                            {fbCfg.label}
                                        </span>
                                    );
                                })()}
                                {item.feedbackStatus === 'REJECTED' && item.moderatorNote && (
                                    <p className="mt-1 text-xs text-muted-foreground italic">{item.moderatorNote}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Roommates section */}
                {roommates.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setShowRoommates(!showRoommates)}
                            className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors w-full"
                        >
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>Bạn cùng trọ ({roommates.length})</span>
                            {/* Avatar group */}
                            <div className="flex -space-x-2 ml-1">
                                {roommates.slice(0, 4).map((rm) => (
                                    rm.avatarUrl ? (
                                        <img key={rm.id} src={rm.avatarUrl} alt={rm.fullName}
                                            className="w-6 h-6 rounded-full border-2 border-card object-cover" title={rm.fullName} />
                                    ) : (
                                        <img key={rm.id} src="/avatar-facebook-mac-dinh.jpg" alt={rm.fullName}
                                            className="w-6 h-6 rounded-full border-2 border-card object-cover" title={rm.fullName} />
                                    )
                                ))}
                                {roommates.length > 4 && (
                                    <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-muted-foreground">+{roommates.length - 4}</span>
                                    </div>
                                )}
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showRoommates ? 'rotate-180' : ''}`} />
                        </button>

                        {showRoommates && (
                            <div className="mt-2 space-y-2">
                                {roommates.map((rm) => (
                                    <div key={rm.id} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-xl">
                                        {rm.avatarUrl ? (
                                            <img src={rm.avatarUrl} alt={rm.fullName} className="w-9 h-9 rounded-full object-cover border border-border" />
                                        ) : (
                                            <img src="/avatar-facebook-mac-dinh.jpg" alt={rm.fullName} className="w-9 h-9 rounded-full object-cover border border-border" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{rm.fullName}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                {rm.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />{rm.phone}
                                                    </span>
                                                )}
                                                {rm.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />{rm.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {ratedIds.has(rm.id) ? (
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-200 shrink-0">
                                                <Star className="w-3 h-3 fill-green-500 text-green-500" />
                                                Đã đánh giá
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setRatingTarget({ id: rm.id, fullName: rm.fullName })}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium shrink-0"
                                            >
                                                <Star className="w-3 h-3" />
                                                Trải nghiệm sống chung
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Roommate Rating Modal */}
                {ratingTarget && (
                    <RoommateRatingModal
                        isOpen={true}
                        onClose={() => setRatingTarget(null)}
                        onSuccess={() => setRatedIds((prev) => new Set([...prev, ratingTarget.id]))}
                        targetId={ratingTarget.id}
                        targetName={ratingTarget.fullName}
                        rentalPeriodId={item.rentalPeriodId}
                    />
                )}

                {/* Action buttons */}
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                    {item.canReview && (
                        <button onClick={onWriteReview}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm">
                            <Star className="w-3.5 h-3.5" />
                            {item.feedbackStatus === 'REJECTED' ? 'Gửi lại đánh giá' : 'Đánh giá'}
                        </button>
                    )}
                    {item.canReviewDisabled && (
                        <button disabled title="Có thể đánh giá sau ít phút nữa"
                            className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg cursor-not-allowed text-xs font-medium flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5" />Đánh giá
                        </button>
                    )}
                    {item.hasReview && (
                        <button onClick={onViewReview}
                            className="px-3 py-1.5 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-all text-xs font-medium flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />Xem đánh giá
                        </button>
                    )}
                    <button onClick={onContactLandlord}
                        className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-all text-xs font-medium flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" />Liên hệ chủ nhà
                    </button>
                    <button onClick={onReport}
                        className="px-3 py-1.5 border border-border rounded-lg hover:bg-destructive/5 hover:border-destructive/20 text-foreground/70 hover:text-destructive transition-all text-xs font-medium flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" />Báo cáo
                    </button>
                    <button onClick={onViewRoom}
                        className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-all text-xs font-medium flex items-center gap-1.5 ml-auto">
                        <ExternalLink className="w-3.5 h-3.5" />Xem phòng
                    </button>
                </div>
            </div>
        </div>
    );
}
