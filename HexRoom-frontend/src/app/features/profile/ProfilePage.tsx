import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/app/features/home/components';
import {
    User, Heart, Sliders, Loader2, Save, Mail, Phone, Check,
    Sparkles, MapPin, Banknote, Crown, X,
    Users, Home, Calendar, Star, Languages,
    Volume2, ChevronDown,
    CreditCard, Building2, AlertCircle, ExternalLink, RefreshCw, Lock,
    CheckCircle2, XCircle, Clock3, ArrowRight, MessageCircle, Flag, Eye,
} from 'lucide-react';
import { useAuth } from '@/app/context/useAuth';
import { ImageUpload } from '@/app/components/ImageUpload';
import { useProvinces } from '@/app/hooks/useProvinces';
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
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { ReviewModal, ViewFeedbackModal, ReportModal } from '@/app/features/booking-history/components';
import { RoommateRatingModal } from './RoommateRatingModal';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import type { ReviewData, ReportData, FeedbackStatus } from '@/app/features/booking-history/types';
import { buildBookingReportPayload } from '@/app/features/booking-history/utils';
import type { ProvinceItem, WardItem } from '@/lib/provinces-api';

type Tab = 'profile' | 'lifestyle' | 'preference' | 'bookings';

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
    const defaults = {
        smoking: false, drinking: false, pets_allowed: false, work_from_home: false,
        sleep_schedule: '', wake_time: '', bedtime: '', quiet_hours_preference: '', temperature_preference: '',
        social_level: '', cleanliness: '', noise_tolerance: '',
        occupation_type: '', cooking_frequency: '', guest_frequency: '',
        interests: '', languages: '',
    };
    if (!p) return defaults;
    return {
        smoking: !!p.smoking, drinking: !!p.drinking, pets_allowed: !!p.pets_allowed, work_from_home: !!p.work_from_home,
        sleep_schedule: p.sleep_schedule ?? '', wake_time: p.wake_time ?? '', bedtime: p.bedtime ?? '',
        quiet_hours_preference: p.quiet_hours_preference ?? '', temperature_preference: p.temperature_preference ?? '',
        social_level: p.social_level ?? '',
        cleanliness: p.cleanliness ?? '', noise_tolerance: p.noise_tolerance ?? '',
        occupation_type: p.occupation_type ?? '', cooking_frequency: p.cooking_frequency ?? '',
        guest_frequency: p.guest_frequency ?? '',
        interests: (p.interests ?? []).filter(i => i !== 'Nấu ăn').join(', '), languages: (p.languages ?? []).join(', '),
    };
}

function toPreferenceForm(p: UserPreferenceResponse | null) {
    const defaults = {
        budget_min: '' as number | '', budget_max: '' as number | '',
        preferredLocation: '', preferred_districts: '',
        preferred_city: '', preferred_ward: '',
        room_type: '', preferred_amenities: '', must_have_amenities: '',
        preferred_lease_months: '' as number | '', move_in_date_min: '', move_in_date_max: '',
        max_distance_km: '' as number | '', transport_nearby: null as boolean | null, pet_friendly: null as boolean | null,
        preferred_gender: '',
        preferred_roommate_age_min: '' as number | '', preferred_roommate_age_max: '' as number | '',
        lifestyle_match_weight: '' as number | '', safety_priority: '' as number | '',
    };
    if (!p) return defaults;
    // Parse city/ward from preferred_districts if available
    const districts = p.preferred_districts ?? [];
    return {
        budget_min: p.budget_min ?? ('' as number | ''), budget_max: p.budget_max ?? ('' as number | ''),
        preferredLocation: p.preferredLocation ?? '',
        preferred_districts: districts.join(', '),
        preferred_city: '',
        preferred_ward: districts[0] ?? '',
        room_type: p.room_type ?? '', preferred_amenities: (p.preferred_amenities ?? []).join(', '),
        must_have_amenities: (p.must_have_amenities ?? []).join(', '),
        preferred_lease_months: (p.preferred_lease_months ?? '') as number | '',
        move_in_date_min: p.move_in_date_min ?? '', move_in_date_max: p.move_in_date_max ?? '',
        max_distance_km: (p.max_distance_km ?? '') as number | '',
        transport_nearby: p.transport_nearby ?? null, pet_friendly: p.pet_friendly ?? null,
        preferred_gender: p.preferred_gender ?? '',
        preferred_roommate_age_min: (p.preferred_roommate_age_min ?? '') as number | '',
        preferred_roommate_age_max: (p.preferred_roommate_age_max ?? '') as number | '',
        lifestyle_match_weight: (p.lifestyle_match_weight ?? '') as number | '',
        safety_priority: (p.safety_priority ?? '') as number | '',
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

    const isTenant = user?.role === 'TENANT';
    const canUpgradeVip = user != null && (user.role === 'TENANT' || user.role === 'LANDLORD') && user.isVip !== true;

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
            await upsertLifestyleRequest({
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
            });
            setLifestyleSuccess(true); setTimeout(() => setLifestyleSuccess(false), 3000);
        } catch (err) { setLifestyleError(err instanceof Error ? err.message : t('common.error')); }
        finally { setLifestyleSaving(false); }
    };

    const handleSavePreference = async (e: React.FormEvent) => {
        e.preventDefault();
        setPreferenceError(null); setPreferenceSuccess(false); setPreferenceSaving(true);
        try {
            await upsertPreferenceRequest({
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
            });
            setPreferenceSuccess(true); setTimeout(() => setPreferenceSuccess(false), 3000);
        } catch (err) { setPreferenceError(err instanceof Error ? err.message : t('common.error')); }
        finally { setPreferenceSaving(false); }
    };

    const loadBookings = async () => {
        if (!isTenant) return;
        setBookingsLoading(true);
        setBookingsError(null);
        try {
            const [preordersRes, bookingsRes] = await Promise.all([
                getMyPreordersRequest({ limit: 50 }),
                getMyBookingsRequest(),
            ]);
            setPreorders(preordersRes.data);
            setBookings(bookingsRes.data);
        } catch (err) {
            setBookingsError(err instanceof Error ? err.message : t('common.error'));
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
    const tabs: { id: Tab; label: string; icon: typeof User }[] = [
        { id: 'profile', label: t('profile.tabBasic'), icon: User },
        { id: 'lifestyle', label: t('profile.tabLifestyle'), icon: Heart },
        { id: 'preference', label: t('profile.tabPreference'), icon: Sliders },
        ...(isTenant ? [{ id: 'bookings' as Tab, label: t('profile.tabBookings'), icon: CreditCard }] : []),
    ];

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">

                {/* Profile header */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-border" />
                            ) : (
                                <img src="/avatar-facebook-mac-dinh.jpg" alt="Default Avatar" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-border" />
                            )}
                        </div>
                        <div className="text-center sm:text-left flex-1 min-w-0">
                            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground truncate">{user?.fullName || t('profile.noName')}</h1>
                            <p className="text-muted-foreground text-sm mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                                <Mail className="w-4 h-4 shrink-0" /><span className="truncate">{user?.email || '—'}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user?.role === 'LANDLORD' ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'}`}>
                                    {user?.role === 'LANDLORD' ? t('profile.roleLandlord') : t('profile.roleTenant')}
                                </span>
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
                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-border bg-muted/30">
                                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary" />{t('profile.sectionBasic')}
                                </h3>
                                <p className="text-muted-foreground text-xs mt-0.5">{t('profile.sectionBasicSub')}</p>
                            </div>
                            <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
                                {profileError && <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{profileError}</div>}
                                {profileSuccess && (
                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2">
                                        <Check className="w-4 h-4 shrink-0" />{t('profile.savedChanges')}
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass}>{t('profile.fullName')}</label>
                                    <input value={profileForm.fullName} onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))} className={inputClass} placeholder="Nguyễn Văn A" required />
                                </div>
                                <div>
                                    <label className={labelClass}>{t('profile.email')}</label>
                                    <input type="email" value={user?.email ?? ''} disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-muted-foreground cursor-not-allowed text-sm" />
                                    <p className="text-xs text-muted-foreground mt-1">{t('profile.emailNote')}</p>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('profile.phone')}</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0123456789" className={`${inputClass} pl-11`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('profile.gender')}</label>
                                    <select value={profileForm.gender} onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))} className={inputClass}>
                                        {PROFILE_GENDER_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">{t('profile.genderNote')}</p>
                                </div>
                                <div>
                                    <ImageUpload label={t('profile.avatar')} value={profileForm.avatarUrl} onChange={(url) => setProfileForm((f) => ({ ...f, avatarUrl: url }))} placeholder={t('profile.avatarPlaceholder')} previewClassName="w-24 h-24 rounded-xl object-cover border border-border" />
                                </div>
                                <button type="submit" disabled={profileSaving} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
                                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('profile.saveBtn')}
                                </button>
                            </form>
                        </div>

                        {canChangePassword ? (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-border bg-muted/30">
                                    <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-primary" />{t('profile.sectionPassword')}
                                    </h3>
                                    <p className="text-muted-foreground text-xs mt-0.5">{t('profile.sectionPasswordSub')}</p>
                                </div>
                                <form onSubmit={handleChangePassword} className="p-6 space-y-5">
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
                                    <button type="submit" disabled={pwSaving} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
                                        {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}{t('profile.changePasswordBtn')}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
                                {t('profile.passwordOAuthNote')}
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
                {tab === 'preference' && (
                    <div className="space-y-4">
                        <div className="px-1">
                            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><Sliders className="w-4 h-4 text-primary" />{t('profile.tabPreference')}</h3>
                            <p className="text-muted-foreground text-xs mt-0.5">{t('profile.preferenceSub')}</p>
                        </div>
                        {preferenceLoading ? (
                            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />{t('common.loading')}</div>
                        ) : (
                            <form onSubmit={handleSavePreference} className="space-y-4">
                                {preferenceError && <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{preferenceError}</div>}
                                {preferenceSuccess && <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />{t('profile.savedPreference')}</div>}

                                {/* Budget */}
                                <SectionCard icon={<Banknote className="w-4 h-4 text-primary" />} title={t('profile.budget')} subtitle={t('profile.budgetSub')}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>{t('profile.budgetMin')}</label>
                                            <input type="number" value={preference.budget_min} onChange={(e) => setPreference((p) => ({ ...p, budget_min: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="0" min={0} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('profile.budgetMax')}</label>
                                            <input type="number" value={preference.budget_max} onChange={(e) => setPreference((p) => ({ ...p, budget_max: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="VD: 5000000" min={0} className={inputClass} />
                                        </div>
                                    </div>
                                </SectionCard>

                                {/* Location */}
                                <SectionCard icon={<MapPin className="w-4 h-4 text-primary" />} title={t('profile.location')} subtitle={t('profile.locationSub')}>
                                    <div>
                                        <label className={labelClass}>{t('profile.preferredWard')}</label>
                                        <p className="text-xs text-muted-foreground mb-2">{t('profile.preferredWardNote')}</p>
                                        <PreferredDistrictsField preference={preference} setPreference={setPreference} />
                                    </div>
                                </SectionCard>

                                {/* Room requirements */}
                                <SectionCard icon={<Home className="w-4 h-4 text-primary" />} title={t('profile.roomReq')} subtitle={t('profile.roomReqSub')}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>{t('profile.preferredRoomType')}</label>
                                            <select value={preference.room_type} onChange={(e) => setPreference((p) => ({ ...p, room_type: e.target.value }))} className={inputClass}>
                                                {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value || 'empty'} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <ToggleSwitch checked={preference.pet_friendly === true} onChange={(v) => setPreference((p) => ({ ...p, pet_friendly: v ? true : null }))} label={t('profile.petFriendly')} description={t('profile.petFriendlyDesc')} />
                                        </div>
                                    </div>
                                </SectionCard>



                                <button type="submit" disabled={preferenceSaving} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
                                    {preferenceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('profile.savePreference')}
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
            </main>
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
