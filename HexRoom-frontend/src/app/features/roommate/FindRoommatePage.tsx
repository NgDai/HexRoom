import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/app/features/home/components';
import { useAuth } from '@/app/context/useAuth';
import { useChatBox } from '@/app/context/useChatBox';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { useProvinces } from '@/app/hooks/useProvinces';
import { RoommateProfileModal } from './RoommateProfileModal';
import { RoommateProfileEditModal, type RoommateProfileFormData } from './RoommateProfileEditModal';
import { request, money } from '@/lib/hexroom-api';
import {
    Users,
    UserPlus,
    User,
    Loader2,
    Check,
    CheckCircle2,
    X,
    Sparkles,
    Heart,
    MessageCircle,
    Eye,
    EyeOff,
    Search,
    SlidersHorizontal,
    RotateCcw,
    MapPin,
    Banknote,
    Home,
    DoorOpen,
    Link2,
    Copy,
    ExternalLink,
    TrendingUp,
    Zap,
    ArrowUpDown,
    Cigarette,
    PawPrint,
    Moon,
    AlertCircle,
    Info,
} from 'lucide-react';
import {
    getRoommateSuggestionsRequest,
    getRoommateMatchesRequest,
    sendRoommateRequestRequest,
    updateRoommateMatchStatusRequest,
    getMyActiveRoomsRequest,
    inviteRoommateRequest,
    getTopSearchersByAreaRequest,
    getPreferenceRequest,
    getLifestyleRequest,
    fetchAuthMe,
    getPeopleYouMayKnowRequest,
    type RoommateSuggestionItem,
    type RoommateMatchItem,
    type MyActiveRoomItem,
    type AreaSearcherItem,
    type PeopleYouMayKnowItem,
} from '@/lib/api';
import {
    calculateRoommateCompatibility,
    getStoredTenantPreferences,
    getStoredTenantLifestyle,
    type TenantPreferencesData,
    type TenantLifestyleData,
} from '@/lib/roommate-compatibility';

const AVATAR_PLACEHOLDER = '/avatar-facebook-mac-dinh.jpg';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PymkCard({
    item,
    sendingId,
    onViewProfile,
    onSendRequest,
}: {
    item: PeopleYouMayKnowItem;
    sendingId: string | null;
    onViewProfile: (id: string) => void;
    onSendRequest: (id: string) => void;
}) {
    const reason = item.reasons[0];
    const activity = reason?.activity;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = item.lifestyle as Record<string, any>;

    // Build lifestyle tags
    const tags: { label: string; color?: string }[] = [];
    if (L) {
        if (L.smoking === true) tags.push({ label: 'Hút thuốc', color: 'warning' });
        else if (L.smoking === false && L.drinking === false) tags.push({ label: 'Không thuốc/rượu' });
        else if (L.smoking === false) tags.push({ label: 'Không hút thuốc' });
        if (L.pets_allowed) tags.push({ label: 'Nuôi thú cưng' });
        if (L.sleep_schedule) tags.push({ label: `Ngủ: ${L.sleep_schedule}` });
        if (L.social_level) tags.push({ label: `Giao tiếp: ${L.social_level}` });
        if (L.cleanliness) tags.push({ label: `Sạch sẽ: ${L.cleanliness}` });
        if (L.noise_tolerance) tags.push({ label: `Chịu ồn: ${L.noise_tolerance}` });
        if (L.guest_frequency) tags.push({ label: `Khách: ${L.guest_frequency}` });
    }

    const getTagStyle = (color?: string) => {
        switch (color) {
            case 'warning': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
                <ImageWithFallback
                    src={item.user.avatarUrl || AVATAR_PLACEHOLDER}
                    alt={item.user.fullName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-primary/20"
                />
                <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{item.user.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {item.user.gender && (
                            <span className="text-xs text-muted-foreground">{item.user.gender}</span>
                        )}
                        {item.matchScore > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {Math.round(item.matchScore)}% phù hợp
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Lifestyle tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {tags.slice(0, 4).map((t, idx) => (
                        <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded-full ${getTagStyle(t.color)}`}>
                            {t.label}
                        </span>
                    ))}
                </div>
            )}

            {/* Area + activity */}
            <div className="mb-3 flex-1">
                {reason?.type === 'same_area_search' && reason.area && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                            <MapPin className="w-3 h-3" />
                            {reason.area}
                        </span>
                        {activity && activity.totalScore > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 font-medium">
                                <TrendingUp className="w-3 h-3" />
                                {activity.totalScore} điểm
                            </span>
                        )}
                        {activity && activity.views > 0 && (
                            <span className="text-muted-foreground">👁️ {activity.views}</span>
                        )}
                        {activity && activity.favorites > 0 && (
                            <span className="text-muted-foreground">❤️ {activity.favorites}</span>
                        )}
                        {activity && activity.preorders > 0 && (
                            <span className="text-muted-foreground">📝 {activity.preorders}</span>
                        )}
                    </div>
                )}
                {reason?.type === 'random_suggestion' && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        <Sparkles className="w-3 h-3" />
                        Gợi ý cho bạn
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                <button
                    type="button"
                    onClick={() => onViewProfile(item.user.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <Eye className="w-3.5 h-3.5" />
                    Xem hồ sơ
                </button>
                {item.matchStatus === 'ACCEPTED' ? (
                    <span className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <Check className="w-3.5 h-3.5" />
                        Đã kết bạn
                    </span>
                ) : item.matchStatus === 'PENDING' ? (
                    <span className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Loader2 className="w-3.5 h-3.5" />
                        Đang chờ
                    </span>
                ) : (
                    <button
                        type="button"
                        disabled={sendingId === item.user.id}
                        onClick={() => onSendRequest(item.user.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {sendingId === item.user.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                        )}
                        Gửi lời mời
                    </button>
                )}
            </div>
        </div>
    );
}

function LifestyleTags({ item }: { item: RoommateSuggestionItem }) {
    const hasDynamicTags = (item.matchingTags && item.matchingTags.length > 0) || (item.warningTags && item.warningTags.length > 0);

    if (hasDynamicTags) {
        const matches = (item.matchingTags || []).slice(0, 3);
        const warnings = (item.warningTags || []).slice(0, 2);

        return (
            <div className="space-y-1.5 w-full mt-2">
                {matches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {matches.map((tag, idx) => (
                            <span
                                key={`m-${idx}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs leading-tight"
                            >
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{tag.replace(/^[✓✔]\s*/, '')}</span>
                            </span>
                        ))}
                    </div>
                )}
                {warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {warnings.map((tag, idx) => (
                            <span
                                key={`w-${idx}`}
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs leading-tight"
                            >
                                <Info className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{tag.replace(/^[⚠!]\s*/, '')}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const tags: { label: string; color?: string }[] = [];
    const L = item.lifestyle;

    // Habits
    if (L?.smoking === false && L?.drinking === false) tags.push({ label: 'Không thuốc/rượu' });
    else if (L?.smoking === false) tags.push({ label: 'Không hút thuốc' });
    else if (L?.smoking === true) tags.push({ label: 'Hút thuốc', color: 'warning' });
    if (L?.pets_allowed) tags.push({ label: 'Nuôi thú cưng' });

    // Core lifestyle
    if (L?.sleep_schedule) tags.push({ label: `Ngủ: ${L.sleep_schedule}` });
    if (L?.social_level) tags.push({ label: `Giao tiếp: ${L.social_level}` });
    if (L?.cleanliness) tags.push({ label: `Sạch sẽ: ${L.cleanliness}` });
    if (L?.noise_tolerance) tags.push({ label: `Chịu ồn: ${L.noise_tolerance}` });
    if (L?.guest_frequency) tags.push({ label: `Khách: ${L.guest_frequency}` });

    // Interests
    const interests = (L as Record<string, unknown>)?.interests as string[] | undefined;
    if (interests && interests.length > 0) {
        interests.slice(0, 3).forEach((i) => tags.push({ label: i, color: 'interest' }));
    }

    // Deal-breakers
    const dealBreakers = (L as Record<string, unknown>)?.deal_breakers as string | null | undefined;
    if (dealBreakers) {
        const dbItems = dealBreakers.split(/[,，、]+/).map((s) => s.trim()).filter(Boolean);
        if (dbItems.length > 0) {
            tags.push({ label: `⚠ ${dbItems.slice(0, 2).join(', ')}`, color: 'danger' });
        }
    }

    if (tags.length === 0) return null;

    const getTagStyle = (color?: string) => {
        switch (color) {
            case 'interest':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'danger':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'warning':
                return 'bg-amber-50 text-amber-900 border-amber-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.slice(0, 4).map((t, idx) => (
                <span
                    key={`${t.label}-${idx}`}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border shadow-2xs leading-tight ${getTagStyle(t.color)}`}
                >
                    {t.label}
                </span>
            ))}
        </div>
    );
}

export function FindRoommatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const chatBox = useChatBox();
    const [suggestions, setSuggestions] = useState<RoommateSuggestionItem[]>([]);
    const [matches, setMatches] = useState<RoommateMatchItem[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [viewingProfile, setViewingProfile] = useState<{
        userId: string;
        matchScore?: number;
        matchingTags?: string[];
        warningTags?: string[];
    } | null>(null);

    // Stored & fetched tenant preferences/lifestyle for compatibility calculation
    const [myPreferences, setMyPreferences] = useState<TenantPreferencesData>(() => getStoredTenantPreferences() || {});
    const [myLifestyle, setMyLifestyle] = useState<TenantLifestyleData>(() => getStoredTenantLifestyle() || {});

    // Invite roommate modal state
    const [inviteTarget, setInviteTarget] = useState<{ userId: string; fullName: string } | null>(null);
    const [activeRooms, setActiveRooms] = useState<MyActiveRoomItem[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [sendingInvite, setSendingInvite] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Area searcher state
    const [areaSearchResults, setAreaSearchResults] = useState<AreaSearcherItem[]>([]);
    const [areaSearching, setAreaSearching] = useState(false);
    const [areaSearchArea, setAreaSearchArea] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [areaSearchTotalRooms, setAreaSearchTotalRooms] = useState(0);
    const [areaSearchActive, setAreaSearchActive] = useState(false);

    // Current user's preferred districts (for quick-select chips)
    const [myPreferredDistricts, setMyPreferredDistricts] = useState<string[]>([]);

    // People You May Know
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [pymkList, setPymkList] = useState<PeopleYouMayKnowItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [pymkGrouped, setPymkGrouped] = useState<{ area: string; users: PeopleYouMayKnowItem[] }[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [pymkIsRandom, setPymkIsRandom] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingPymk, setLoadingPymk] = useState(true);

    // Pagination cho suggestions
    const PAGE_SIZE = 9;
    const [suggestionPage, setSuggestionPage] = useState(1);

    // Weights customization
    const DEFAULT_WEIGHTS: Record<string, number> = {
        smoking: 5, sleep_schedule: 5, pets_allowed: 5,
        noise_tolerance: 5, guest_frequency: 5, drinking: 5,
        cooking_frequency: 5, work_from_home: 5,
        social_level: 5, interests: 5,
    };
    const CRITERION_LABELS: Record<string, string> = {
        smoking: 'Hút thuốc',
        sleep_schedule: 'Giờ ngủ',
        pets_allowed: 'Thú cưng',
        noise_tolerance: 'Chịu ồn',
        guest_frequency: 'Tần suất có khách',
        drinking: 'Uống rượu bia',
        cooking_frequency: 'Nấu ăn',
        work_from_home: 'Làm việc tại nhà',
        social_level: 'Mức độ giao tiếp',
        interests: 'Sở thích',
    };
    const [customWeights, setCustomWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
    const [appliedWeights, setAppliedWeights] = useState<Record<string, number> | null>(null);
    const [showWeightsPanel, setShowWeightsPanel] = useState(false);
    const allWeightsZero = Object.values(customWeights).every((v) => v === 0);

    // Filter state (live inputs)
    const [filterArea, setFilterArea] = useState('');
    const [filterBudgetMax, setFilterBudgetMax] = useState<number | ''>('');
    const [filterRoomType, setFilterRoomType] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterNoSmoking, setFilterNoSmoking] = useState(false);
    const [filterPetFriendly, setFilterPetFriendly] = useState(false);
    const [filterSleep, setFilterSleep] = useState('');
    const [sortBy, setSortBy] = useState<'match' | 'budget_asc' | 'budget_desc' | 'rating'>('match');
    const [isMyPrefApplied, setIsMyPrefApplied] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    // Province/ward picker for area filter
    const { provinces, getWardsFor } = useProvinces();
    const [filterProvince, setFilterProvince] = useState('');
    const wardList = filterProvince ? getWardsFor(filterProvince) : [];

    // Applied filter state (only set when user clicks Search)
    const [appliedFilter, setAppliedFilter] = useState<{
        area: string;
        budgetMax: number | '';
        roomType: string;
        gender: string;
        noSmoking: boolean;
        petFriendly: boolean;
        sleep: string;
        sortBy: 'match' | 'budget_asc' | 'budget_desc' | 'rating';
    }>({
        area: '',
        budgetMax: '',
        roomType: '',
        gender: '',
        noSmoking: false,
        petFriendly: false,
        sleep: '',
        sortBy: 'match',
    });

    // Use a local fresh gender state so the banner hides immediately after a profile update
    // without requiring a full auth context refresh (cached user can be stale).
    const [myGender, setMyGender] = useState<string | null | undefined>(user?.gender);

    const hasGender = myGender && String(myGender).trim() && String(myGender).toLowerCase() !== 'không tiết lộ';

    // Tenant Roommate Profile state & visibility
    const [myRoommateProfile, setMyRoommateProfile] = useState<RoommateProfileFormData | null>(null);
    const [loadingMyProfile, setLoadingMyProfile] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);

    const hasMyCriteria = Boolean(
        myRoommateProfile?.city ||
        myRoommateProfile?.budgetMax ||
        myPreferences?.budget_max ||
        myPreferences?.preferred_districts ||
        myPreferences?.preferredLocation ||
        myLifestyle?.sleep_schedule ||
        myLifestyle?.smoking !== undefined
    );

    const loadMyProfile = useCallback(() => {
        if (!user?.id) {
            setMyRoommateProfile(null);
            return;
        }
        setLoadingMyProfile(true);
        request<RoommateProfileFormData | null>('/roommates/profile')
            .then((data) => {
                setMyRoommateProfile(data);
            })
            .catch(() => {
                setMyRoommateProfile(null);
            })
            .finally(() => {
                setLoadingMyProfile(false);
            });
    }, [user?.id]);

    useEffect(() => {
        loadMyProfile();
    }, [loadMyProfile]);

    // Check query params for opening edit profile modal
    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        if (search.get('createProfile') === 'true' || search.get('editProfile') === 'true') {
            setShowEditProfileModal(true);
        }
    }, []);

    const handleToggleVisibility = async () => {
        if (!myRoommateProfile) return;
        const newVisible = !myRoommateProfile.visible;
        try {
            const payload = {
                ...myRoommateProfile,
                visible: newVisible,
                adultConfirmed: true,
            };
            await request('/roommates/profile', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            setMyRoommateProfile((prev) => (prev ? { ...prev, visible: newVisible } : null));
            loadSuggestions();
            setMessage(newVisible ? 'Đã bật hiển thị hồ sơ tìm bạn ở ghép.' : 'Đã tạm ẩn hồ sơ khỏi mục tìm bạn.');
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage(e?.message || 'Không thể cập nhật trạng thái hiển thị');
        }
    };

    const hasActiveFilter = !!filterArea || filterBudgetMax !== '' || !!filterRoomType || !!filterGender || filterNoSmoking || filterPetFriendly || !!filterSleep || sortBy !== 'match';
    const hasAppliedFilter = !!appliedFilter.area || appliedFilter.budgetMax !== '' || !!appliedFilter.roomType || !!appliedFilter.gender || appliedFilter.noSmoking || appliedFilter.petFriendly || !!appliedFilter.sleep || appliedFilter.sortBy !== 'match';

    const resetFilters = () => {
        setFilterArea('');
        setFilterProvince('');
        setFilterBudgetMax('');
        setFilterRoomType('');
        setFilterGender('');
        setFilterNoSmoking(false);
        setFilterPetFriendly(false);
        setFilterSleep('');
        setSortBy('match');
        setIsMyPrefApplied(false);
        setAppliedFilter({
            area: '',
            budgetMax: '',
            roomType: '',
            gender: '',
            noSmoking: false,
            petFriendly: false,
            sleep: '',
            sortBy: 'match',
        });
        setAreaSearchActive(false);
        setAreaSearchResults([]);
        setSuggestionPage(1);
    };

    const handleApplyMyPreferences = () => {
        const pref = getStoredTenantPreferences() || myPreferences;
        const life = getStoredTenantLifestyle() || myLifestyle;

        const bMax = pref.budget_max ? Number(pref.budget_max) : '';
        const rType = pref.room_type || '';
        const g = pref.preferred_gender === 'SAME'
            ? (myGender || '')
            : (pref.preferred_gender === 'ANY' ? '' : (pref.preferred_gender || ''));
        const area = Array.isArray(pref.preferred_districts)
            ? (pref.preferred_districts[0] || '')
            : (pref.preferred_districts ? String(pref.preferred_districts).split(',')[0].trim() : '');
        const noSmoke = life.smoking === false || pref.smoking_allowed === false;
        const petOk = life.pets_allowed === true || pref.pet_friendly === true;
        const sleep = life.sleep_schedule || pref.sleep_preference || '';

        setFilterBudgetMax(bMax);
        setFilterRoomType(rType);
        setFilterGender(g);
        if (area) {
            setFilterArea(area);
        }
        setFilterNoSmoking(noSmoke);
        setFilterPetFriendly(petOk);
        setFilterSleep(sleep);

        setAppliedFilter({
            area,
            budgetMax: bMax,
            roomType: rType,
            gender: g,
            noSmoking: noSmoke,
            petFriendly: petOk,
            sleep,
            sortBy: 'match',
        });
        setIsMyPrefApplied(true);
        setSuggestionPage(1);
    };

    const handleApplyWeights = () => {
        if (allWeightsZero) return;
        setAppliedWeights(customWeights);
        setSuggestionPage(1);
        loadSuggestions(customWeights);
    };

    const handleResetWeights = () => {
        setCustomWeights(DEFAULT_WEIGHTS);
        setAppliedWeights(null);
        setSuggestionPage(1);
        loadSuggestions(null);
    };

    const handleSearch = async () => {
        // 1. Apply client-side filters
        setAppliedFilter({
            area: filterArea.trim(),
            budgetMax: filterBudgetMax,
            roomType: filterRoomType,
            gender: filterGender,
            noSmoking: filterNoSmoking,
            petFriendly: filterPetFriendly,
            sleep: filterSleep,
            sortBy,
        });
        setSuggestionPage(1);

        // 2. If area is set, also call area searcher API
        const area = filterArea.trim();
        if (area) {
            setAreaSearching(true);
            setAreaSearchActive(true);
            try {
                const r = await getTopSearchersByAreaRequest(area, 9);
                setAreaSearchResults(r.data || []);
                setAreaSearchArea(r.area || area);
                setAreaSearchTotalRooms(r.totalRoomsInArea || 0);
            } catch {
                setAreaSearchResults([]);
                setAreaSearchArea(area);
                setAreaSearchTotalRooms(0);
            } finally {
                setAreaSearching(false);
            }
        } else {
            setAreaSearchActive(false);
            setAreaSearchResults([]);
        }
    };

    const filteredSuggestions = useMemo(() => {
        let list = [...suggestions];

        if (hasAppliedFilter) {
            list = list.filter((item) => {
                // Area filter
                if (appliedFilter.area) {
                    const q = appliedFilter.area.toLowerCase();
                    const districts = item.preference?.preferred_districts ?? [];
                    const location = item.preference?.preferredLocation ?? '';
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const profileCity = (item as any).profile?.city ?? '';
                    const areaMatch =
                        districts.some((d) => d.toLowerCase().includes(q)) ||
                        location.toLowerCase().includes(q) ||
                        profileCity.toLowerCase().includes(q);
                    if (!areaMatch) return false;
                }
                // Budget filter
                if (appliedFilter.budgetMax !== '') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const candidateBudgetMax = item.preference?.budget_max ?? (item as any).profile?.budgetMax;
                    if (candidateBudgetMax != null && Number(candidateBudgetMax) > Number(appliedFilter.budgetMax)) {
                        return false;
                    }
                }
                // Room type filter
                if (appliedFilter.roomType) {
                    if (item.preference?.room_type && item.preference.room_type !== appliedFilter.roomType) return false;
                }
                // Gender filter
                if (appliedFilter.gender) {
                    const g = (item.user?.gender ?? '').toLowerCase();
                    if (g && g !== appliedFilter.gender.toLowerCase()) return false;
                }
                // Lifestyle: No smoking
                if (appliedFilter.noSmoking) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (item.lifestyle?.smoking === true || (item as any).profile?.smoking === true) return false;
                }
                // Lifestyle: Pet friendly
                if (appliedFilter.petFriendly) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (item.lifestyle?.pets_allowed === false || (item as any).profile?.acceptPets === false) return false;
                }
                // Lifestyle: Sleep schedule
                if (appliedFilter.sleep) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sleep = item.lifestyle?.sleep_schedule || (item as any).profile?.sleepSchedule;
                    if (sleep && sleep !== appliedFilter.sleep) return false;
                }
                return true;
            });
        }

        // Sort order
        const currentSort = appliedFilter.sortBy || sortBy;
        if (currentSort === 'match') {
            list.sort((a, b) => b.matchScore - a.matchScore);
        } else if (currentSort === 'budget_asc') {
            list.sort((a, b) => (Number(a.preference?.budget_max) || 0) - (Number(b.preference?.budget_max) || 0));
        } else if (currentSort === 'budget_desc') {
            list.sort((a, b) => (Number(b.preference?.budget_max) || 0) - (Number(a.preference?.budget_max) || 0));
        } else if (currentSort === 'rating') {
            list.sort((a, b) => (b.experienceScore || 0) - (a.experienceScore || 0));
        }

        return list;
    }, [suggestions, appliedFilter, hasAppliedFilter, sortBy]);

    const loadSuggestions = useCallback((weights?: Record<string, number> | null) => {
        setLoadingSuggestions(true);
        getRoommateSuggestionsRequest(24, weights ?? undefined)
            .then((r) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawList: any[] = (r.data && Array.isArray(r.data))
                    ? r.data
                    : [];

                const currentPref: TenantPreferencesData = {
                    budget_min: myRoommateProfile?.budgetMin != null ? Number(myRoommateProfile.budgetMin) : (myPreferences?.budget_min ? Number(myPreferences.budget_min) : undefined),
                    budget_max: myRoommateProfile?.budgetMax != null ? Number(myRoommateProfile.budgetMax) : (myPreferences?.budget_max ? Number(myPreferences.budget_max) : undefined),
                    preferredLocation: myRoommateProfile?.city || myPreferences?.preferredLocation || undefined,
                    preferred_districts: (myRoommateProfile?.districts && myRoommateProfile.districts.length > 0)
                        ? myRoommateProfile.districts
                        : (myRoommateProfile?.city ? [myRoommateProfile.city] : (myPreferences?.preferred_districts || [])),
                    preferred_gender: myPreferences?.preferred_gender || (myGender === 'Nam' ? 'MALE' : myGender === 'Nữ' ? 'FEMALE' : 'SAME'),
                    pet_friendly: myRoommateProfile?.acceptPets ?? myPreferences?.pet_friendly,
                    smoking_allowed: myRoommateProfile?.acceptSmoking ?? myPreferences?.smoking_allowed,
                    deal_breakers: myRoommateProfile?.deal_breakers || myPreferences?.deal_breakers,
                };

                const currentLife: TenantLifestyleData = {
                    smoking: myRoommateProfile?.smoking ?? myLifestyle?.smoking,
                    pets_allowed: myRoommateProfile?.hasPets ?? myLifestyle?.pets_allowed,
                    sleep_schedule: myRoommateProfile?.sleepSchedule === 'EARLY' ? 'Ngủ sớm' : myRoommateProfile?.sleepSchedule === 'LATE' ? 'Ngủ muộn' : (myRoommateProfile?.sleepSchedule ? 'Linh hoạt' : myLifestyle?.sleep_schedule),
                    cleanliness: myRoommateProfile?.cleanliness || myLifestyle?.cleanliness,
                    noise_tolerance: myRoommateProfile?.noise_tolerance || myLifestyle?.noise_tolerance,
                    social_level: myRoommateProfile?.social_level || myLifestyle?.social_level,
                    deal_breakers: myRoommateProfile?.deal_breakers || myLifestyle?.deal_breakers,
                    interests: myLifestyle?.interests || [],
                };

                const scoredList = rawList.map((raw) => {
                    const u = raw.user || {
                        id: raw.profile?.id || raw.id || '',
                        fullName: raw.profile?.nickname || raw.fullName || 'Bạn cùng phòng',
                        gender: raw.gender || null,
                        avatarUrl: raw.avatarUrl || null,
                    };
                    const item: RoommateSuggestionItem = {
                        ...raw,
                        user: {
                            id: String(u.id || raw.profile?.id || ''),
                            fullName: u.fullName || raw.profile?.nickname || 'Bạn cùng phòng',
                            gender: u.gender ?? null,
                            avatarUrl: u.avatarUrl ?? null,
                        },
                        lifestyle: raw.lifestyle || {
                            smoking: raw.profile?.smoking ?? null,
                            drinking: null,
                            pets_allowed: raw.profile?.hasPets ?? null,
                            sleep_schedule: raw.profile?.sleepSchedule ?? null,
                            work_from_home: null,
                            personalityType: null,
                            social_level: null,
                            cleanliness: null,
                            noise_tolerance: null,
                            guest_frequency: null,
                            interests: [],
                            deal_breakers: null,
                            languages: [],
                        },
                        preference: raw.preference || {
                            budget_min: raw.profile?.budgetMin ? Number(raw.profile.budgetMin) : null,
                            budget_max: raw.profile?.budgetMax ? Number(raw.profile.budgetMax) : null,
                            preferredLocation: raw.profile?.city ?? null,
                            preferred_districts: raw.profile?.city ? [raw.profile.city] : [],
                            room_type: null,
                        },
                        matchScore: raw.matchScore ?? 50,
                    };

                    const res = calculateRoommateCompatibility(currentPref, currentLife, item, myGender);
                    const calculatedScore = res.matchScore !== undefined ? res.matchScore : item.matchScore;
                    return {
                        ...item,
                        matchScore: calculatedScore,
                        matchingTags: res.matchingTags?.length ? res.matchingTags : (raw.matches || []).filter((m: string) => m.length <= 35),
                        warningTags: res.warningTags?.length ? res.warningTags : (raw.discuss || []).filter((d: string) => d.length <= 30 && !d.toLowerCase().includes('thống nhất khu vực')),
                    };
                });
                scoredList.sort((a, b) => b.matchScore - a.matchScore);
                setSuggestions(scoredList);
            })
            .catch(() => {
                setSuggestions([]);
            })
            .finally(() => setLoadingSuggestions(false));
    }, [myPreferences, myLifestyle, myRoommateProfile, myGender]);

    const loadMatches = () => {
        setLoadingMatches(true);
        getRoommateMatchesRequest()
            .then((r) => setMatches(r.data || []))
            .catch(() => setMatches([]))
            .finally(() => setLoadingMatches(false));
    };

    useEffect(() => {
        loadSuggestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Fetch fresh user data to ensure gender check is not stale after a profile update
    useEffect(() => {
        if (!user?.id) return;
        fetchAuthMe()
            .then((r) => { if (r.user?.gender !== undefined) setMyGender(r.user.gender ?? null); })
            .catch(() => { });
    }, [user?.id]);

    // Fetch tenant preferences and lifestyle for compatibility calculation
    useEffect(() => {
        if (!user?.id) return;
        Promise.all([
            getPreferenceRequest().catch(() => null),
            getLifestyleRequest().catch(() => null),
        ]).then(([prefRes, lifeRes]) => {
            if (prefRes?.preference) {
                setMyPreferences((prev) => ({ ...prev, ...prefRes.preference }));
            }
            if (lifeRes?.profile) {
                setMyLifestyle((prev) => ({ ...prev, ...lifeRes.profile }));
            }
        });
    }, [user?.id]);

    // Fetch current user's preferred_districts for quick-select chips
    useEffect(() => {
        if (!user?.id) return;
        getPreferenceRequest()
            .then((r) => {
                const districts = r.preference?.preferred_districts;
                if (Array.isArray(districts) && districts.length > 0) {
                    setMyPreferredDistricts(districts);
                }
            })
            .catch(() => { });
    }, [user?.id]);

    useEffect(() => {
        loadMatches();
    }, []);

    // Load People You May Know
    useEffect(() => {
        if (!user?.id) return;
        setLoadingPymk(true);
        getPeopleYouMayKnowRequest()
            .then((r) => {
                setPymkList(r.data || []);
                setPymkGrouped(r.groupedByArea || []);
                setPymkIsRandom(r.isRandom || false);
            })
            .catch(() => {
                setPymkList([]);
                setPymkGrouped([]);
            })
            .finally(() => setLoadingPymk(false));
    }, [user?.id]);

    const handleSendRequest = (targetId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }
        setSendingId(targetId);
        setMessage(null);
        sendRoommateRequestRequest(targetId)
            .then(() => {
                // Cập nhật matchStatus trong tất cả các danh sách
                setSuggestions((prev) => prev.map((s) =>
                    s.user.id === targetId ? { ...s, matchStatus: 'PENDING' as const } : s
                ));
                setAreaSearchResults((prev) => prev.map((s) =>
                    s.user.id === targetId ? { ...s, matchStatus: 'PENDING' as const } : s
                ));
                loadMatches();
            })
            .catch((e) => setMessage(e instanceof Error ? e.message : 'Gửi thất bại'))
            .finally(() => setSendingId(null));
    };

    const handleAcceptReject = (matchId: string, status: 'ACCEPTED' | 'REJECTED') => {
        setUpdatingId(matchId);
        setMessage(null);
        updateRoommateMatchStatusRequest(matchId, status)
            .then(() => loadMatches())
            .catch((e) => setMessage(e instanceof Error ? e.message : 'Cập nhật thất bại'))
            .finally(() => setUpdatingId(null));
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const openInviteModal = (userId: string, fullName: string) => {
        setInviteTarget({ userId, fullName });
        setSelectedRoomId(null);
        setInviteSuccess(null);
        setLoadingRooms(true);
        getMyActiveRoomsRequest()
            .then((r) => setActiveRooms(r.data || []))
            .catch(() => setActiveRooms([]))
            .finally(() => setLoadingRooms(false));
    };

    const closeInviteModal = () => {
        setInviteTarget(null);
        setActiveRooms([]);
        setSelectedRoomId(null);
        setInviteSuccess(null);
    };

    const handleSendInvite = () => {
        if (!inviteTarget || !selectedRoomId) return;
        setSendingInvite(true);
        setMessage(null);
        inviteRoommateRequest(inviteTarget.userId, selectedRoomId)
            .then((r) => {
                setInviteSuccess(r.message || 'Đã tạo link giới thiệu phòng!');
            })
            .catch((e) => setMessage(e instanceof Error ? e.message : 'Có lỗi xảy ra'))
            .finally(() => setSendingInvite(false));
    };

    const sentPending = matches.filter((m) => m.isRequester && m.status === 'PENDING');
    const receivedPending = matches.filter((m) => !m.isRequester && m.status === 'PENDING');
    const accepted = matches.filter((m) => m.status === 'ACCEPTED');

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-12">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                            <Users className="w-8 h-8 text-primary" />
                            Tìm bạn ở ghép
                        </h1>
                        <p className="text-muted-foreground">
                            Ghép phòng với người cùng giới tính và có phong cách sống tương đồng
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {user ? (
                            <button
                                type="button"
                                onClick={() => setShowEditProfileModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] rounded-xl font-semibold shadow-sm transition-all text-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                {myRoommateProfile ? 'Quản lý hồ sơ ở ghép' : 'Đăng hồ sơ tìm bạn ở ghép'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow hover:bg-primary/90 transition-all text-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                Đăng nhập để đăng hồ sơ
                            </button>
                        )}
                    </div>
                </div>

                {message && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center justify-between">
                        <span>{message}</span>
                        <button type="button" onClick={() => setMessage(null)} className="text-xs hover:underline">
                            Đóng
                        </button>
                    </div>
                )}

                {/* Banner 1: User not logged in */}
                {!user && (
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 mb-1">
                                    Bạn đang tìm kiếm bạn cùng phòng phù hợp?
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                                    Đăng nhập và hoàn thành hồ sơ cá nhân để được đăng lên mục Tìm bạn ở ghép, giúp những người cùng lối sống dễ dàng tìm thấy và kết nối với bạn.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="shrink-0 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-xs text-xs sm:text-sm"
                        >
                            Đăng nhập để đăng hồ sơ
                        </button>
                    </div>
                )}

                {/* Banner 2: Logged in, but profile is missing or hidden */}
                {user && (!myRoommateProfile || !myRoommateProfile.visible) && (
                    <div className="mb-8 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-5 sm:p-6 shadow-xs">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900">
                                            {!myRoommateProfile
                                                ? 'Yêu cầu: Nhập thông tin hồ sơ để đăng lên mục Tìm bạn ở ghép'
                                                : 'Hồ sơ tìm bạn ở ghép của bạn đang tạm ẩn'}
                                        </h2>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                            {!myRoommateProfile ? 'Chưa đăng hồ sơ' : 'Đang ẩn'}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                                        {!myRoommateProfile
                                            ? 'Để bảo đảm cộng đồng ghép phòng minh bạch và an toàn, người thuê cần hoàn tất các thông tin về ngân sách, khu vực, giờ giấc, thói quen sinh hoạt (hút thuốc, thú cưng...) để có thể xuất hiện trên bảng tin tìm bạn.'
                                            : 'Hồ sơ của bạn hiện đang ở trạng thái ẩn, người khác sẽ không thấy bạn trong danh sách tìm bạn ở ghép. Hãy bật hiển thị hoặc cập nhật lại thông tin để bắt đầu tìm kiếm bạn cùng phòng.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                {myRoommateProfile && (
                                    <button
                                        type="button"
                                        onClick={handleToggleVisibility}
                                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                                        Bật hiển thị hồ sơ
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(true)}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs transition-all text-xs flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {!myRoommateProfile ? 'Nhập hồ sơ & Đăng tìm bạn ngay' : 'Chỉnh sửa & Đăng lại'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Banner 3: Profile is active and published */}
                {user && myRoommateProfile?.visible && (
                    <div className="mb-8 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-5 sm:p-6 shadow-xs">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                            Hồ sơ tìm bạn ở ghép của bạn đang hoạt động
                                        </h2>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                            Đang hiển thị công khai
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-900 font-bold text-xs border border-emerald-200/80 shadow-2xs">
                                            <User className="w-3.5 h-3.5 text-emerald-600" />
                                            {myRoommateProfile.nickname || user.fullName || 'Bạn'}
                                        </span>
                                        {myRoommateProfile.city && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-800 font-medium text-xs border border-slate-200 shadow-2xs">
                                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>{myRoommateProfile.city}</span>
                                                {myRoommateProfile.districts && myRoommateProfile.districts.length > 0 && (
                                                    <span className="text-slate-500 font-normal">({myRoommateProfile.districts.join(', ')})</span>
                                                )}
                                            </span>
                                        )}
                                        {(myRoommateProfile.budgetMin || myRoommateProfile.budgetMax) ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-emerald-800 font-semibold text-xs border border-emerald-200/80 shadow-2xs">
                                                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                                {myRoommateProfile.budgetMin ? money(myRoommateProfile.budgetMin) : '0đ'} - {myRoommateProfile.budgetMax ? money(myRoommateProfile.budgetMax) : 'Tùy ý'}
                                            </span>
                                        ) : null}
                                        {myRoommateProfile.sleepSchedule && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-800 font-medium text-xs border border-slate-200 shadow-2xs">
                                                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                                                {myRoommateProfile.sleepSchedule === 'EARLY' ? 'Ngủ sớm' : myRoommateProfile.sleepSchedule === 'LATE' ? 'Ngủ muộn' : 'Linh hoạt'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleToggleVisibility}
                                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                                    title="Tạm thời không hiển thị trên danh sách tìm bạn"
                                >
                                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                    Tạm ẩn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(true)}
                                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Chỉnh sửa hồ sơ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notice 4: Logged in, active profile, but missing gender */}
                {user && !hasGender && myRoommateProfile?.visible && (
                    <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" />
                            <span>Bổ sung giới tính để hệ thống ưu tiên lọc người ở ghép cùng giới tính chính xác nhất.</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowEditProfileModal(true)}
                            className="font-semibold text-primary hover:underline text-xs"
                        >
                            Cập nhật ngay
                        </button>
                    </div>
                )}

                <>
                    {/* AI Personality Search (VIP) - Temporarily hidden */}
                    {/* <section className="mb-8">
                        <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                <h2 className="font-heading text-lg font-semibold text-foreground">
                                    Tìm roommate AI
                                </h2>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                    VIP
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Mô tả tính cách bạn muốn tìm, AI sẽ tìm roommate phù hợp nhất.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    placeholder="VD: Tìm bạn chill chill, không hút thuốc..."
                                    className="flex-1 px-4 py-3 bg-white dark:bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                                />
                                {aiActive ? (
                                    <button
                                        type="button"
                                        onClick={clearAiSearch}
                                        className="px-4 py-3 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={handleAiSearch}
                                    disabled={aiSearching || aiQuery.trim().length < 3}
                                    className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {aiSearching ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                    Tìm
                                </button>
                            </div>
                            {aiError && (
                                <p className="text-sm text-red-500 mt-2">{aiError}</p>
                            )}
                        </div>
                    </section> */}

                    {/* AI Search Results - Temporarily hidden */}
                    {/* {aiActive && (
                        <section className="mb-12">
                            <h2 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                Kết quả AI
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                    ({aiResults.length} kết quả)
                                </span>
                            </h2>
                            {aiSearching ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                    <span className="ml-3 text-muted-foreground">Đang tìm kiếm AI...</span>
                                </div>
                            ) : aiResults.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p>Không tìm thấy roommate phù hợp. Thử mô tả khác nhé!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {aiResults.map((r) => (
                                        <div
                                            key={r.user.id}
                                            className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow relative"
                                        >
                                            <div className="absolute top-3 right-3">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.similarityScore >= 70
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                        : r.similarityScore >= 40
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {r.similarityScore}% phù hợp
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 mb-3">
                                                <ImageWithFallback
                                                    src={r.user.avatarUrl || AVATAR_PLACEHOLDER}
                                                    alt={r.user.fullName || ''}
                                                    className="w-14 h-14 rounded-full object-cover border-2 border-border"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground truncate">
                                                        {r.user.fullName}
                                                    </p>
                                                    {r.user.gender && (
                                                        <p className="text-xs text-muted-foreground">{r.user.gender}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {r.lifestyle && (
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {r.lifestyle.social_level && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                            Giao tiếp: {r.lifestyle.social_level}
                                                        </span>
                                                    )}
                                                    {r.lifestyle.smoking === false && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                            Không hút thuốc
                                                        </span>
                                                    )}
                                                    {r.lifestyle.smoking === true && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                            Hút thuốc
                                                        </span>
                                                    )}
                                                    {r.lifestyle.cleanliness && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                            Sạch sẽ: {r.lifestyle.cleanliness}
                                                        </span>
                                                    )}
                                                    {r.lifestyle.noise_tolerance && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                            Chịu ồn: {r.lifestyle.noise_tolerance}
                                                        </span>
                                                    )}
                                                    {r.lifestyle.interests.slice(0, 3).map((i) => (
                                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            {i}
                                                        </span>
                                                    ))}
                                                    {r.lifestyle.deal_breakers && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                                                            ⚠ {r.lifestyle.deal_breakers.split(/[,，、]+/)[0]?.trim()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {r.aiReason && (
                                                <p className="text-xs italic text-primary/80 mb-3 leading-relaxed bg-primary/5 rounded-lg px-3 py-2">
                                                    💡 {r.aiReason}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingProfile({ userId: r.user.id, matchScore: r.similarityScore })}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" /> Xem hồ sơ
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSendingId(r.user.id);
                                                        sendRoommateRequestRequest(r.user.id)
                                                            .then(() => setMessage('Đã gửi lời mời!'))
                                                            .catch((e) => setMessage(e instanceof Error ? e.message : 'Lỗi'))
                                                            .finally(() => setSendingId(null));
                                                    }}
                                                    disabled={sendingId === r.user.id}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                                                >
                                                    {sendingId === r.user.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <UserPlus className="w-4 h-4" />
                                                    )}
                                                    Gửi lời mời
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )} */}

                    {/* Suggestions */}
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-accent" />
                                Gợi ý roommate
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWeightsPanel((v) => !v)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${showWeightsPanel
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                        }`}
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Độ ưu tiên
                                    {appliedWeights && (
                                        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFilters((v) => !v)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${showFilters
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                        }`}
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Bộ lọc
                                    {hasActiveFilter && (
                                        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                                    )}
                                </button>
                            </div>
                        </div>                        <p className="text-muted-foreground text-sm mb-4">
                            {areaSearchActive
                                ? <>Ưu tiên người đang tìm phòng ở <strong className="text-primary">{areaSearchArea}</strong> — xếp hạng theo lượt tương tác từ cao đến thấp</>
                                : hasGender
                                    ? 'Ưu tiên người cùng giới và có phong cách sống phù hợp với bạn'
                                    : 'Tenant phù hợp được sắp xếp theo điểm match cao đến thấp'}
                        </p>

                        {/* WeightsPanel */}
                        {showWeightsPanel && (
                            <div className="mb-6 p-4 bg-card rounded-2xl border border-border shadow-sm">
                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                                    Tùy chỉnh độ ưu tiên
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                    {Object.keys(DEFAULT_WEIGHTS).map((key) => (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground w-36 shrink-0">{CRITERION_LABELS[key]}</span>
                                            <input
                                                type="range"
                                                min={1}
                                                max={10}
                                                step={1}
                                                value={customWeights[key]}
                                                onChange={(e) => setCustomWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                                                className="flex-1 accent-primary"
                                            />
                                            <span className="text-xs font-semibold text-foreground w-4 text-right shrink-0">{customWeights[key]}</span>
                                        </div>
                                    ))}
                                </div>
                                {allWeightsZero && (
                                    <p className="mt-3 text-xs text-destructive">Vui lòng đặt ít nhất một tiêu chí &gt; 0</p>
                                )}
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={handleApplyWeights}
                                        disabled={allWeightsZero || loadingSuggestions}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                    >
                                        {loadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Áp dụng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetWeights}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Đặt lại
                                    </button>
                                    {appliedWeights && (
                                        <span className="text-xs text-primary ml-auto">Đang dùng độ ưu tiên tùy chỉnh</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Profile Preferences Status Banner */}
                        {hasMyCriteria ? (
                            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-primary flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" /> Đang tính % phù hợp theo Hồ sơ & Yêu cầu của bạn:
                                    </span>
                                    {(myRoommateProfile?.budgetMax || myPreferences.budget_max) ? (
                                        <span className="px-2.5 py-1 rounded-full bg-background border border-border text-foreground font-medium">
                                            Ngân sách &le; {Number(myRoommateProfile?.budgetMax || myPreferences.budget_max).toLocaleString('vi-VN')} đ
                                        </span>
                                    ) : null}
                                    {(myRoommateProfile?.city || myPreferences.preferred_districts || myPreferences.preferredLocation) ? (
                                        <span className="px-2.5 py-1 rounded-full bg-background border border-border text-foreground font-medium">
                                            Khu vực: {myRoommateProfile?.city || (Array.isArray(myPreferences.preferred_districts) ? myPreferences.preferred_districts.slice(0, 2).join(', ') : (myPreferences.preferred_districts || myPreferences.preferredLocation))}
                                        </span>
                                    ) : null}
                                    {(myRoommateProfile?.smoking === false || myLifestyle.smoking === false) ? (
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium border border-emerald-200">
                                            Không thuốc lá
                                        </span>
                                    ) : null}
                                    {(myRoommateProfile?.hasPets || myLifestyle.pets_allowed) ? (
                                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium border border-blue-200">
                                            Nuôi thú cưng OK
                                        </span>
                                    ) : null}
                                    {(myRoommateProfile?.sleepSchedule || myLifestyle.sleep_schedule) ? (
                                        <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-medium border border-purple-200">
                                            {myRoommateProfile?.sleepSchedule === 'EARLY' ? 'Ngủ sớm' : myRoommateProfile?.sleepSchedule === 'LATE' ? 'Ngủ muộn' : (myRoommateProfile?.sleepSchedule || myLifestyle.sleep_schedule)}
                                        </span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(true)}
                                    className="font-semibold text-primary hover:underline hover:text-primary/80 shrink-0"
                                >
                                    Chỉnh sửa hồ sơ &rarr;
                                </button>
                            </div>
                        ) : (
                            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" /> Bạn chưa nhập hồ sơ tìm bạn ở ghép:
                                    </span>
                                    <span className="text-muted-foreground">
                                        Hãy đăng hồ sơ tìm bạn để hệ thống tính % độ tương thích chính xác hơn thay vì điểm mặc định.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(true)}
                                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                                >
                                    Đăng hồ sơ ngay &rarr;
                                </button>
                            </div>
                        )}

                        {/* Filter bar */}
                        {showFilters && (
                            <div className="mb-6 p-4 bg-card rounded-2xl border border-border shadow-sm">
                                {/* Row 1: Basic criteria */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Area */}
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            Khu vực
                                        </label>
                                        {filterArea ? (
                                            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-primary/10 border border-primary/30 rounded-xl text-sm text-primary font-medium">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                <span className="flex-1 truncate">{filterArea}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => { setFilterArea(''); setFilterProvince(''); }}
                                                    className="shrink-0 hover:bg-primary/20 rounded-full p-0.5"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <select
                                                    value={filterProvince}
                                                    onChange={(e) => { setFilterProvince(e.target.value); setFilterArea(''); }}
                                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                >
                                                    <option value="">Chọn tỉnh / thành phố</option>
                                                    {provinces.map((p) => (
                                                        <option key={p.code} value={p.name}>{p.name}</option>
                                                    ))}
                                                </select>
                                                {filterProvince && wardList.length > 0 && (
                                                    <select
                                                        value=""
                                                        onChange={(e) => { if (e.target.value) setFilterArea(e.target.value); }}
                                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                    >
                                                        <option value="">Chọn quận / phường</option>
                                                        {wardList.map((w) => (
                                                            <option key={w.code} value={w.name}>{w.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {filterProvince && wardList.length === 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFilterArea(filterProvince)}
                                                        className="w-full px-3 py-2 text-xs text-primary hover:bg-primary/5 border border-dashed border-primary/30 rounded-xl transition-colors"
                                                    >
                                                        Tìm theo tỉnh: {filterProvince}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Budget max */}
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Banknote className="w-3.5 h-3.5" />
                                            Ngân sách tối đa (VNĐ)
                                        </label>
                                        <input
                                            type="number"
                                            value={filterBudgetMax}
                                            onChange={(e) => setFilterBudgetMax(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="VD: 5000000"
                                            min={0}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                    {/* Room type */}
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Home className="w-3.5 h-3.5" />
                                            Loại phòng
                                        </label>
                                        <select
                                            value={filterRoomType}
                                            onChange={(e) => setFilterRoomType(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        >
                                            <option value="">Tất cả</option>
                                            <option value="PRIVATE">Phòng riêng</option>
                                            <option value="SHARED">Ở ghép</option>
                                            <option value="STUDIO">Studio</option>
                                            <option value="APARTMENT">Căn hộ</option>
                                        </select>
                                    </div>
                                    {/* Gender */}
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            Giới tính
                                        </label>
                                        <select
                                            value={filterGender}
                                            onChange={(e) => setFilterGender(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        >
                                            <option value="">Tất cả</option>
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Lifestyle & Sorting */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/60">
                                    {/* Sleep Schedule */}
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <Moon className="w-3.5 h-3.5" />
                                            Giờ giấc ngủ
                                        </label>
                                        <select
                                            value={filterSleep}
                                            onChange={(e) => setFilterSleep(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        >
                                            <option value="">Tất cả</option>
                                            <option value="Ngủ sớm (trước 23h)">Ngủ sớm (trước 23h)</option>
                                            <option value="Cú đêm (sau 0h)">Cú đêm (sau 0h)</option>
                                            <option value="Linh hoạt">Linh hoạt</option>
                                        </select>
                                    </div>

                                    {/* Sort by */}
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                            Sắp xếp theo
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as 'match' | 'budget_asc' | 'budget_desc' | 'rating')}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        >
                                            <option value="match">Độ phù hợp cao nhất</option>
                                            <option value="budget_asc">Ngân sách: Thấp đến cao</option>
                                            <option value="budget_desc">Ngân sách: Cao đến thấp</option>
                                            <option value="rating">Đánh giá tốt nhất</option>
                                        </select>
                                    </div>

                                    {/* Checkbox: No smoking */}
                                    <div className="flex items-end pb-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={filterNoSmoking}
                                                onChange={(e) => setFilterNoSmoking(e.target.checked)}
                                                className="w-4 h-4 rounded text-primary accent-primary"
                                            />
                                            <span className="flex items-center gap-1.5">
                                                <Cigarette className="w-4 h-4 text-muted-foreground" />
                                                Không hút thuốc
                                            </span>
                                        </label>
                                    </div>

                                    {/* Checkbox: Pet friendly */}
                                    <div className="flex items-end pb-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={filterPetFriendly}
                                                onChange={(e) => setFilterPetFriendly(e.target.checked)}
                                                className="w-4 h-4 rounded text-primary accent-primary"
                                            />
                                            <span className="flex items-center gap-1.5">
                                                <PawPrint className="w-4 h-4 text-muted-foreground" />
                                                Thân thiện thú cưng
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Search button, profile auto-apply & result count */}
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        disabled={!hasActiveFilter || areaSearching}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 transition-all shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:translate-y-0"
                                    >
                                        {areaSearching ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Search className="w-4 h-4 stroke-[2.5]" />
                                        )}
                                        Tìm kiếm
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleApplyMyPreferences}
                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                                        title="Tự động điền bộ lọc theo sở thích & phong cách sống trong Hồ sơ của bạn"
                                    >
                                        <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                                        Áp dụng theo hồ sơ của tôi
                                    </button>

                                    {hasAppliedFilter && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border-2 border-slate-300 shadow-xs hover:shadow transition-all hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                            Xóa bộ lọc
                                        </button>
                                    )}

                                    {isMyPrefApplied && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border-2 border-emerald-400 shadow-sm">
                                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                            Đã lọc theo hồ sơ cá nhân
                                        </span>
                                    )}

                                    {hasAppliedFilter && !areaSearchActive && (
                                        <p className="text-sm text-muted-foreground ml-auto">
                                            Tìm thấy <span className="font-semibold text-foreground">{filteredSuggestions.length}</span> roommate phù hợp
                                        </p>
                                    )}
                                    {areaSearchActive && (
                                        <p className="text-sm text-muted-foreground ml-auto">
                                            Tìm thấy <span className="font-semibold text-foreground">{areaSearchResults.length}</span> roommate ở <span className="font-semibold text-primary">{areaSearchArea}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Quick-select: preferred districts from user's profile */}
                                {myPreferredDistricts.length > 0 && (
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                            <MapPin className="w-3 h-3" />
                                            Khu vực muốn tìm roommate của bạn:
                                        </span>
                                        {myPreferredDistricts.map((district) => (
                                            <button
                                                key={district}
                                                type="button"
                                                onClick={async () => {
                                                    setFilterArea(district);
                                                    setAppliedFilter({
                                                        area: district,
                                                        budgetMax: filterBudgetMax,
                                                        roomType: filterRoomType,
                                                        gender: filterGender,
                                                        noSmoking: filterNoSmoking,
                                                        petFriendly: filterPetFriendly,
                                                        sleep: filterSleep,
                                                        sortBy,
                                                    });
                                                    setAreaSearching(true);
                                                    setAreaSearchActive(true);
                                                    try {
                                                        const r = await getTopSearchersByAreaRequest(district, 9);
                                                        setAreaSearchResults(r.data || []);
                                                        setAreaSearchArea(r.area || district);
                                                        setAreaSearchTotalRooms(r.totalRoomsInArea || 0);
                                                    } catch {
                                                        setAreaSearchResults([]);
                                                        setAreaSearchArea(district);
                                                        setAreaSearchTotalRooms(0);
                                                    } finally {
                                                        setAreaSearching(false);
                                                    }
                                                }}
                                                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${filterArea === district
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5'
                                                    }`}
                                            >
                                                <MapPin className="w-2.5 h-2.5" />
                                                {district}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Main Results: Area-based OR general suggestions ── */}
                        {areaSearchActive ? (
                            /* Area-based: show users ranked by activity in area */
                            areaSearching ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="ml-3 text-muted-foreground">Đang tìm người cùng khu vực...</span>
                                </div>
                            ) : areaSearchResults.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 p-12 text-center">
                                    <TrendingUp className="w-10 h-10 mx-auto mb-3 text-orange-400 opacity-60" />
                                    <p className="text-muted-foreground">
                                        Chưa có ai tương tác với phòng ở khu vực "<strong>{areaSearchArea}</strong>". Thử khu vực khác.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {areaSearchResults.map((item, index) => (
                                        <div
                                            key={item.user.id}
                                            className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-stretch">
                                                {/* Rank badge */}
                                                <div className={`flex items-center justify-center px-4 shrink-0 ${index === 0 ? 'bg-linear-to-b from-amber-400 to-orange-500 text-white' :
                                                    index === 1 ? 'bg-linear-to-b from-slate-300 to-slate-400 text-white' :
                                                        index === 2 ? 'bg-linear-to-b from-amber-600 to-amber-700 text-white' :
                                                            'bg-muted/50 text-muted-foreground'
                                                    }`}>
                                                    <span className="text-lg font-bold">{index + 1}</span>
                                                </div>

                                                {/* Main content */}
                                                <div className="flex-1 p-5">
                                                    <div className="flex gap-4">
                                                        <button
                                                            type="button"
                                                            className="shrink-0 group relative"
                                                            onClick={() => setViewingProfile({ userId: item.user.id, matchScore: item.matchScore })}
                                                            title="Xem hồ sơ"
                                                        >
                                                            <ImageWithFallback
                                                                src={item.user.avatarUrl || AVATAR_PLACEHOLDER}
                                                                alt={item.user.fullName}
                                                                className="w-14 h-14 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors"
                                                            />
                                                            <span className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Eye className="w-5 h-5 text-white" />
                                                            </span>
                                                        </button>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="font-semibold text-foreground truncate block hover:text-primary transition-colors text-left"
                                                                    onClick={() => setViewingProfile({ userId: item.user.id, matchScore: item.matchScore })}
                                                                    title="Xem hồ sơ"
                                                                >
                                                                    {item.user.fullName}
                                                                </button>
                                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                                                                    !hasMyCriteria
                                                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                        : item.matchScore >= 80
                                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                            : item.matchScore >= 60
                                                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                                }`}>
                                                                    {hasMyCriteria ? `${item.matchScore}% phù hợp` : 'Chưa đối chiếu'}
                                                                </span>
                                                            </div>

                                                            {/* Activity badges */}
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                                    <TrendingUp className="w-3 h-3" />
                                                                    {item.activityInArea.totalScore} điểm tương tác
                                                                </span>
                                                                {item.activityInArea.views > 0 && (
                                                                    <span className="text-xs text-muted-foreground">👁️ {item.activityInArea.views}</span>
                                                                )}
                                                                {item.activityInArea.favorites > 0 && (
                                                                    <span className="text-xs text-muted-foreground">❤️ {item.activityInArea.favorites}</span>
                                                                )}
                                                                {item.activityInArea.preorders > 0 && (
                                                                    <span className="text-xs text-muted-foreground">📝 {item.activityInArea.preorders}</span>
                                                                )}
                                                            </div>

                                                            {/* Lifestyle tags */}
                                                            {item.lifestyle && (() => {
                                                                const L = item.lifestyle;
                                                                const tags: { label: string; color?: string }[] = [];
                                                                if (L.smoking === true) tags.push({ label: 'Hút thuốc', color: 'warning' });
                                                                else if (L.smoking === false && L.drinking === false) tags.push({ label: 'Không thuốc/rượu' });
                                                                else if (L.smoking === false) tags.push({ label: 'Không hút thuốc' });
                                                                if (L.pets_allowed) tags.push({ label: 'Nuôi thú cưng' });
                                                                if (L.sleep_schedule) tags.push({ label: `Ngủ: ${L.sleep_schedule}` });
                                                                if (L.personalityType) tags.push({ label: L.personalityType });
                                                                if (L.cleanliness) tags.push({ label: `Sạch sẽ: ${L.cleanliness}` });
                                                                if (L.noise_tolerance) tags.push({ label: `Chịu ồn: ${L.noise_tolerance}` });
                                                                if (L.guest_frequency) tags.push({ label: `Khách: ${L.guest_frequency}` });
                                                                if (tags.length === 0) return null;
                                                                return (
                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        {tags.slice(0, 5).map((t, idx) => (
                                                                            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.color === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                                                                                {t.label}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center gap-2 px-5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingProfile({ userId: item.user.id, matchScore: item.matchScore })}
                                                        className="py-2.5 px-4 rounded-xl font-medium text-sm border border-border hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" /> Hồ sơ
                                                    </button>
                                                    {item.matchStatus === 'ACCEPTED' ? (
                                                        <span className="py-2.5 px-4 rounded-xl font-medium text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center justify-center gap-1.5">
                                                            <Check className="w-4 h-4" /> Đã kết bạn
                                                        </span>
                                                    ) : item.matchStatus === 'PENDING' ? (
                                                        <span className="py-2.5 px-4 rounded-xl font-medium text-sm bg-muted text-muted-foreground flex items-center justify-center gap-1.5">
                                                            <Loader2 className="w-4 h-4" /> Đang chờ
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={!!sendingId}
                                                            onClick={() => handleSendRequest(item.user.id)}
                                                            className="py-2.5 px-4 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors"
                                                        >
                                                            {sendingId === item.user.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <UserPlus className="w-4 h-4" />
                                                            )}
                                                            Gửi lời mời
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : null}

                        {/* Secondary section: people whose preferred_districts matches the area */}
                        {/* {areaSearchActive && !areaSearching && (() => {
                            const areaLower = areaSearchArea.toLowerCase();
                            const activityIds = new Set(areaSearchResults.map((r) => r.user.id));
                            const matched = suggestions.filter((s) => {
                                if (activityIds.has(s.user.id)) return false; // already shown above
                                const districts: string[] = s.preference?.preferred_districts ?? [];
                                return districts.some((d) => d.toLowerCase().includes(areaLower) || areaLower.includes(d.toLowerCase()));
                            });
                            if (matched.length === 0) return null;
                            return (
                                <div className="mt-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <h3 className="font-semibold text-foreground text-sm">
                                            Người có sở thích khu vực <span className="text-primary">"{areaSearchArea}"</span>
                                        </h3>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {matched.length} người
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Những người này đã khai báo <strong>{areaSearchArea}</strong> là khu vực ưa thích trong hồ sơ tìm phòng — chưa có tương tác thực tế nhưng đang tìm cùng khu vực với bạn.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {matched.map((item) => (
                                            <div
                                                key={item.user.id}
                                                className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
                                            >
                                                <div className="p-5 flex gap-4 flex-1">
                                                    <button
                                                        type="button"
                                                        className="shrink-0 group relative self-start"
                                                        onClick={() => setViewingProfile({ userId: item.user.id, matchScore: item.matchScore })}
                                                        title="Xem hồ sơ"
                                                    >
                                                        <ImageWithFallback
                                                            src={item.user.avatarUrl || AVATAR_PLACEHOLDER}
                                                            alt={item.user.fullName}
                                                            className="w-14 h-14 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors"
                                                        />
                                                        <span className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Eye className="w-4 h-4 text-white" />
                                                        </span>
                                                    </button>
                                                    <div className="min-w-0 flex-1 flex flex-col">
                                                        <button
                                                            type="button"
                                                            className="font-semibold text-foreground truncate block hover:text-primary transition-colors text-left text-sm"
                                                            onClick={() => setViewingProfile({ userId: item.user.id, matchScore: item.matchScore })}
                                                        >
                                                            {item.user.fullName}
                                                        </button>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                {item.matchScore}% phù hợp
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                                <MapPin className="w-2.5 h-2.5" />
                                                                Sở thích khu vực
                                                            </span>
                                                        </div>
                                                        <LifestyleTags item={item} />
                                                    </div>
                                                </div>
                                                <div className="px-5 pb-5 pt-1 flex items-center gap-2 mt-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingProfile({ userId: item.user.id, matchScore: item.matchScore })}
                                                        className="flex-1 min-w-0 h-9 px-2.5 rounded-xl font-medium border border-border hover:bg-muted flex items-center justify-center gap-1.5 text-sm transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">Hồ sơ</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!!sendingId}
                                                        onClick={() => handleSendRequest(item.user.id)}
                                                        className="flex-1 min-w-0 h-9 px-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm transition-colors"
                                                    >
                                                        {sendingId === item.user.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                                        ) : (
                                                            <UserPlus className="w-3.5 h-3.5 shrink-0" />
                                                        )}
                                                        <span className="truncate">Gửi lời mời</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()} */}

                        {/* General suggestions (no area filter) */}
                        {!areaSearchActive ? (
                            loadingSuggestions ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                                            <div className="flex gap-4">
                                                <div className="w-16 h-16 rounded-full bg-muted" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-5 bg-muted rounded w-2/3" />
                                                    <div className="h-4 bg-muted rounded w-1/2" />
                                                    <div className="h-10 bg-muted rounded-xl w-full mt-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredSuggestions.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12 text-center text-muted-foreground">
                                    {hasActiveFilter
                                        ? 'Không tìm thấy roommate phù hợp với bộ lọc. Thử thay đổi tiêu chí lọc.'
                                        : 'Chưa có gợi ý phù hợp. Hãy cập nhật Phong cách sống và Sở thích tìm phòng trong Hồ sơ để nhận gợi ý tốt hơn.'}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                                        {filteredSuggestions.slice((suggestionPage - 1) * PAGE_SIZE, suggestionPage * PAGE_SIZE).map((item) => (
                                            <div
                                                key={item.user.id}
                                                className="bg-card rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 flex flex-col h-full overflow-hidden shadow-xs bg-white"
                                            >
                                                {/* 1. Header with Avatar, User Info & Match Badge */}
                                                <div className="p-5 pb-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <button
                                                                type="button"
                                                                className="shrink-0 relative group/avatar self-start"
                                                                onClick={() => setViewingProfile({
                                                                    userId: item.user.id,
                                                                    matchScore: item.matchScore,
                                                                    matchingTags: item.matchingTags,
                                                                    warningTags: item.warningTags,
                                                                })}
                                                                title="Xem hồ sơ"
                                                            >
                                                                <ImageWithFallback
                                                                    src={item.user.avatarUrl || AVATAR_PLACEHOLDER}
                                                                    alt={item.user.fullName}
                                                                    className="w-13 h-13 rounded-2xl object-cover ring-2 ring-emerald-500/15 group-hover/avatar:ring-emerald-500 transition-all shadow-xs"
                                                                />
                                                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" />
                                                            </button>
                                                            <div className="min-w-0">
                                                                <button
                                                                    type="button"
                                                                    className="font-bold text-foreground text-base truncate block hover:text-primary transition-colors text-left"
                                                                    onClick={() => setViewingProfile({
                                                                        userId: item.user.id,
                                                                        matchScore: item.matchScore,
                                                                        matchingTags: item.matchingTags,
                                                                        warningTags: item.warningTags,
                                                                    })}
                                                                    title="Xem hồ sơ"
                                                                >
                                                                    {item.user.fullName}
                                                                </button>
                                                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground truncate">
                                                                    {item.user.gender && (
                                                                        <span className="font-medium text-slate-600 shrink-0">{item.user.gender}</span>
                                                                    )}
                                                                    {(item.preference?.preferredLocation || item.preference?.preferred_districts?.[0]) && (
                                                                        <>
                                                                            {item.user.gender && <span className="text-slate-300">•</span>}
                                                                            <span className="inline-flex items-center gap-0.5 truncate text-slate-600 font-medium">
                                                                                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                                <span className="truncate">{item.preference.preferredLocation || item.preference.preferred_districts?.[0]}</span>
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Match score badge on top-right */}
                                                        <div className="shrink-0">
                                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                                                                !hasMyCriteria
                                                                    ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                                    : item.matchScore >= 80
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : item.matchScore >= 60
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                                                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                            }`}>
                                                                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                {hasMyCriteria ? `${item.matchScore}% phù hợp` : 'Chưa đối chiếu'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Quick meta row (budget) */}
                                                    {(item.preference?.budget_min || item.preference?.budget_max) && (
                                                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 font-medium border border-slate-200/60 truncate">
                                                                <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <span className="truncate">
                                                                    Ngân sách: <strong>{money(Number(item.preference.budget_min || 0))} - {money(Number(item.preference.budget_max || 0))}</strong>
                                                                </span>
                                                            </span>
                                                            {item.experienceScore >= 8 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200/60 shrink-0">
                                                                    ⭐ Đánh giá tốt
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. Full-width Tags Section */}
                                                <div className="px-5 pb-4 pt-1 flex-1 flex flex-col justify-start">
                                                    <LifestyleTags item={item} />
                                                </div>

                                                {/* 3. Action Buttons */}
                                                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 mt-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingProfile({
                                                            userId: item.user.id,
                                                            matchScore: item.matchScore,
                                                            matchingTags: item.matchingTags,
                                                            warningTags: item.warningTags,
                                                        })}
                                                        className="flex-1 min-w-0 h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                                                    >
                                                        <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                                                        <span className="truncate">Xem hồ sơ</span>
                                                    </button>
                                                    {item.matchStatus === 'ACCEPTED' ? (
                                                        <span className="flex-1 min-w-0 h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1.5 shadow-2xs">
                                                            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                                                            <span className="truncate">Đã kết bạn</span>
                                                        </span>
                                                    ) : item.matchStatus === 'PENDING' ? (
                                                        <span className="flex-1 min-w-0 h-10 px-3 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center gap-1.5">
                                                            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-500" />
                                                            <span className="truncate">Đang chờ</span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={!!sendingId}
                                                            onClick={() => handleSendRequest(item.user.id)}
                                                            className="flex-1 min-w-0 h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                                        >
                                                            {sendingId === item.user.id ? (
                                                                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                                                            ) : (
                                                                <UserPlus className="w-4 h-4 shrink-0" />
                                                            )}
                                                            <span className="truncate">Gửi lời mời</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Pagination */}
                                    {filteredSuggestions.length > PAGE_SIZE && (() => {
                                        const totalPages = Math.ceil(filteredSuggestions.length / PAGE_SIZE);
                                        const getPages = () => {
                                            if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
                                            if (suggestionPage <= 3) return [1, 2, 3, 4, 5];
                                            if (suggestionPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                                            return [suggestionPage - 2, suggestionPage - 1, suggestionPage, suggestionPage + 1, suggestionPage + 2];
                                        };
                                        return (
                                            <div className="flex justify-center items-center gap-2 mt-8">
                                                {/* Prev */}
                                                <button
                                                    type="button"
                                                    onClick={() => { setSuggestionPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    disabled={suggestionPage === 1}
                                                    className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                                >
                                                    ‹
                                                </button>
                                                {/* Page numbers */}
                                                {getPages().map((p) => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => { setSuggestionPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                        className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-colors ${p === suggestionPage
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                            : 'border-border bg-card text-foreground hover:bg-muted'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                                {/* Next */}
                                                <button
                                                    type="button"
                                                    onClick={() => { setSuggestionPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    disabled={suggestionPage === totalPages}
                                                    className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </>
                            )
                        ) : null}
                    </section>

                    {/* ── People You May Know ── */}
                    {/* {!loadingPymk && (pymkGrouped.length > 0 || (pymkIsRandom && pymkList.length > 0)) && (
                        <section className="mt-2 mb-12">
                            <h2 className="font-heading text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Có thể bạn sẽ quan tâm
                            </h2>
                            <p className="text-sm text-muted-foreground mb-5">
                                {pymkIsRandom
                                    ? 'Một số gợi ý dành cho bạn'
                                    : 'Những người đang tìm phòng cùng khu vực với bạn'}
                            </p>

                 
                            {pymkIsRandom && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {pymkList.map((item) => (
                                        <PymkCard
                                            key={item.user.id}
                                            item={item}
                                            sendingId={sendingId}
                                            onViewProfile={(id) => setViewingProfile({ userId: id })}
                                            onSendRequest={(id) => {
                                                setSendingId(id);
                                                sendRoommateRequestRequest(id)
                                                    .then(() => {
                                                        setPymkList((prev) => prev.map((p) => p.user.id === id ? { ...p, matchStatus: 'PENDING' as const } : p));
                                                        loadMatches();
                                                    })
                                                    .catch((e) => setMessage(e instanceof Error ? e.message : 'Lỗi gửi lời mời'))
                                                    .finally(() => setSendingId(null));
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {!pymkIsRandom && pymkGrouped.map((group) => (
                                <div key={group.area} className="mb-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <h3 className="font-semibold text-foreground">
                                            {group.area}
                                        </h3>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {group.users.length} người
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {group.users.map((item) => (
                                            <PymkCard
                                                key={item.user.id}
                                                item={item}
                                                sendingId={sendingId}
                                                onViewProfile={(id) => setViewingProfile({ userId: id })}
                                                onSendRequest={(id) => {
                                                    setSendingId(id);
                                                    sendRoommateRequestRequest(id)
                                                        .then(() => {
                                                            setPymkGrouped((prev) => prev.map((g) => ({
                                                                ...g,
                                                                users: g.users.map((u) => u.user.id === id ? { ...u, matchStatus: 'PENDING' as const } : u),
                                                            })));
                                                            loadMatches();
                                                        })
                                                        .catch((e) => setMessage(e instanceof Error ? e.message : 'Lỗi gửi lời mời'))
                                                        .finally(() => setSendingId(null));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )} */}

                    {/* My matches */}
                    <section>
                        <h2 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-accent" />
                            Lời mời của tôi
                        </h2>

                        {loadingMatches ? (
                            <div className="space-y-4">
                                <div className="h-24 bg-muted rounded-2xl animate-pulse" />
                                <div className="h-24 bg-muted rounded-2xl animate-pulse" />
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {receivedPending.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Lời mời nhận được</h3>
                                        <div className="space-y-3">
                                            {receivedPending.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="flex items-center justify-between gap-4 p-4 bg-card rounded-2xl border border-border"
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                                                        onClick={() => m.otherUser?.id && setViewingProfile({ userId: m.otherUser.id })}
                                                        title="Xem hồ sơ"
                                                    >
                                                        <ImageWithFallback
                                                            src={m.otherUser?.avatarUrl || AVATAR_PLACEHOLDER}
                                                            alt={m.otherUser?.fullName || ''}
                                                            className="w-12 h-12 rounded-full object-cover shrink-0"
                                                        />
                                                        <span className="font-medium text-foreground truncate">
                                                            {m.otherUser?.fullName || '—'}
                                                        </span>
                                                    </button>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={!!updatingId}
                                                            onClick={() => handleAcceptReject(m.id, 'ACCEPTED')}
                                                            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                                            title="Chấp nhận"
                                                        >
                                                            {updatingId === m.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!!updatingId}
                                                            onClick={() => handleAcceptReject(m.id, 'REJECTED')}
                                                            className="p-2.5 rounded-xl border border-border hover:bg-muted disabled:opacity-60"
                                                            title="Từ chối"
                                                        >
                                                            <X className="w-5 h-5 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sentPending.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Lời mời đã gửi</h3>
                                        <div className="space-y-3">
                                            {sentPending.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border"
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                                                        onClick={() => m.otherUser?.id && setViewingProfile({ userId: m.otherUser.id })}
                                                        title="Xem hồ sơ"
                                                    >
                                                        <ImageWithFallback
                                                            src={m.otherUser?.avatarUrl || AVATAR_PLACEHOLDER}
                                                            alt={m.otherUser?.fullName || ''}
                                                            className="w-12 h-12 rounded-full object-cover shrink-0"
                                                        />
                                                        <span className="font-medium text-foreground truncate">
                                                            {m.otherUser?.fullName || '—'}
                                                        </span>
                                                    </button>
                                                    <span className="text-sm text-muted-foreground ml-auto">Đang chờ phản hồi</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {accepted.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Đã kết nối</h3>
                                        <div className="space-y-3">
                                            {accepted.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/20"
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                                                        onClick={() => m.otherUser?.id && setViewingProfile({ userId: m.otherUser.id })}
                                                        title="Xem hồ sơ"
                                                    >
                                                        <ImageWithFallback
                                                            src={m.otherUser?.avatarUrl || AVATAR_PLACEHOLDER}
                                                            alt={m.otherUser?.fullName || ''}
                                                            className="w-12 h-12 rounded-full object-cover shrink-0"
                                                        />
                                                        <span className="font-medium text-foreground truncate flex-1 min-w-0">
                                                            {m.otherUser?.fullName || '—'}
                                                        </span>
                                                    </button>
                                                    <span className="text-sm text-primary font-medium flex items-center gap-1 shrink-0">
                                                        <Check className="w-4 h-4" /> Đã chấp nhận
                                                    </span>
                                                    {m.otherUser?.id && (
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => (chatBox ? chatBox.openChatWith(m.otherUser!.id) : navigate(`/chat/${m.otherUser!.id}`))}
                                                                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                                                                title="Nhắn tin"
                                                            >
                                                                <MessageCircle className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sentPending.length === 0 && receivedPending.length === 0 && accepted.length === 0 && (
                                    <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center text-muted-foreground">
                                        Chưa có lời mời nào. Gửi lời mời cho ai đó trong danh sách gợi ý phía trên.
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </>

                <RoommateProfileModal
                    userId={viewingProfile?.userId ?? null}
                    matchScore={viewingProfile?.matchScore}
                    matchingTags={viewingProfile?.matchingTags}
                    warningTags={viewingProfile?.warningTags}
                    onClose={() => setViewingProfile(null)}
                />

                <RoommateProfileEditModal
                    isOpen={showEditProfileModal}
                    onClose={() => setShowEditProfileModal(false)}
                    onSuccess={() => {
                        loadMyProfile();
                        getPreferenceRequest().then((r) => { if (r?.preference) setMyPreferences(r.preference); }).catch(() => {});
                        getLifestyleRequest().then((r) => { if (r?.profile) setMyLifestyle(r.profile); }).catch(() => {});
                        loadSuggestions();
                        fetchAuthMe().then((u) => {
                            if (u?.user?.gender) setMyGender(u.user.gender);
                        }).catch(() => {});
                    }}
                    currentProfile={myRoommateProfile}
                    userGender={myGender || user?.gender}
                />

                {/* Invite Roommate Modal */}
                {inviteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeInviteModal}>
                        <div
                            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                                    <DoorOpen className="w-5 h-5 text-accent" />
                                    Mời {inviteTarget.fullName} ở ghép
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeInviteModal}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 overflow-y-auto flex-1">
                                {inviteSuccess ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8 text-primary" />
                                        </div>
                                        <p className="text-lg font-semibold text-foreground mb-2">Thành công!</p>
                                        <p className="text-muted-foreground text-sm">{inviteSuccess}</p>

                                        {/* Shareable room link */}
                                        {selectedRoomId && (
                                            <div className="mt-5 bg-muted/50 rounded-xl p-4 text-left">
                                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                                    <Link2 className="w-3.5 h-3.5" />
                                                    Link phòng – gửi cho bạn bè để xem trực tiếp:
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${window.location.origin}/room/${selectedRoomId}`}
                                                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground select-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/room/${selectedRoomId}`);
                                                            setCopiedLink(true);
                                                            setTimeout(() => setCopiedLink(false), 2000);
                                                        }}
                                                        className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${copiedLink
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                            }`}
                                                    >
                                                        {copiedLink ? (
                                                            <><Check className="w-3.5 h-3.5" /> Đã sao chép</>
                                                        ) : (
                                                            <><Copy className="w-3.5 h-3.5" /> Sao chép</>
                                                        )}
                                                    </button>
                                                </div>
                                                <a
                                                    href={`/room/${selectedRoomId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-primary hover:underline"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Mở trang phòng
                                                </a>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={closeInviteModal}
                                            className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                                        >
                                            Đóng
                                        </button>
                                    </div>
                                ) : loadingRooms ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : activeRooms.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Home className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
                                        <p className="text-muted-foreground">Bạn chưa thuê phòng nào.</p>
                                        <p className="text-muted-foreground text-sm mt-1">Hãy thuê phòng trước khi mời ở ghép.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Chọn phòng bạn đang thuê để mời <strong>{inviteTarget.fullName}</strong> ở ghép:
                                        </p>
                                        <div className="space-y-3">
                                            {activeRooms.map((room) => (
                                                <label
                                                    key={room.roomId}
                                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedRoomId === room.roomId
                                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                        : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="invite-room"
                                                        checked={selectedRoomId === room.roomId}
                                                        onChange={() => setSelectedRoomId(room.roomId)}
                                                        className="w-4 h-4 text-primary accent-primary shrink-0"
                                                    />
                                                    {room.image && (
                                                        <ImageWithFallback
                                                            src={room.image}
                                                            alt={room.roomName}
                                                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-foreground truncate">
                                                            {room.roomName} – {room.propertyName}
                                                        </p>
                                                        {room.address && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />{room.address}
                                                            </p>
                                                        )}
                                                        {room.price != null && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                <Banknote className="w-3 h-3" />{Number(room.price).toLocaleString('vi-VN')} VNĐ/tháng
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            {!inviteSuccess && activeRooms.length > 0 && !loadingRooms && (
                                <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={closeInviteModal}
                                        className="px-5 py-2.5 rounded-xl font-medium border border-border hover:bg-muted transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedRoomId || sendingInvite}
                                        onClick={handleSendInvite}
                                        className="px-5 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 transition-colors"
                                    >
                                        {sendingInvite ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Link2 className="w-4 h-4" />
                                        )}
                                        Lấy nhanh link phòng đang thuê
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
