/**
 * Roommate & Room Compatibility Scoring Engine
 * Computes accurate, multi-criteria compatibility scores between
 * tenant preferences/lifestyle requirements and candidate roommates/rooms.
 */

export interface TenantPreferencesData {
    budget_min?: number | '' | null;
    budget_max?: number | '' | null;
    preferred_districts?: string[] | string | null;
    preferredLocation?: string | null;
    preferred_city?: string | null;
    preferred_ward?: string | null;
    room_type?: string | null;
    preferred_gender?: string | null; // 'SAME' | 'Nam' | 'Nữ' | 'ANY' | ''
    preferred_roommate_age_min?: number | '' | null;
    preferred_roommate_age_max?: number | '' | null;
    must_have_amenities?: string[] | string | null;
    preferred_amenities?: string[] | string | null;
    preferred_lease_months?: number | '' | null;
    move_in_date_min?: string | null;
    move_in_date_max?: string | null;
    pet_friendly?: boolean | null;
    smoking_allowed?: boolean | null;
    sleep_preference?: string | null;
    cleanliness_preference?: string | null;
    noise_preference?: string | null;
    deal_breakers?: string[] | string | null;
    lifestyle_match_weight?: number | '' | null; // 1: Cân bằng, 2: Ưu tiên Ngân sách & Vị trí, 3: Ưu tiên Lối sống
    safety_priority?: number | '' | null;
    transport_nearby?: boolean | null;
    max_distance_km?: number | '' | null;
}

export interface TenantLifestyleData {
    smoking?: boolean | null;
    drinking?: boolean | null;
    pets_allowed?: boolean | null;
    sleep_schedule?: string | null;
    wake_time?: string | null;
    bedtime?: string | null;
    quiet_hours_preference?: string | null;
    temperature_preference?: string | null;
    social_level?: string | null;
    cleanliness?: string | null;
    noise_tolerance?: string | null;
    occupation_type?: string | null;
    cooking_frequency?: string | null;
    guest_frequency?: string | null;
    work_from_home?: boolean | null;
    interests?: string[] | string | null;
    languages?: string[] | string | null;
    deal_breakers?: string[] | string | null;
}

export interface CandidateRoommateData {
    user: {
        id: string;
        fullName: string;
        gender?: string | null;
        avatarUrl?: string | null;
        age?: number;
    };
    matchScore?: number;
    lifestyle?: {
        smoking?: boolean | null;
        drinking?: boolean | null;
        pets_allowed?: boolean | null;
        sleep_schedule?: string | null;
        cleanliness?: string | null;
        noise_tolerance?: string | null;
        social_level?: string | null;
        cooking_frequency?: string | null;
        work_from_home?: boolean | null;
        interests?: string[] | string;
        deal_breakers?: string | null;
    } | null;
    preference?: {
        preferred_districts?: string[] | string;
        preferredLocation?: string | null;
        budget_min?: number | null;
        budget_max?: number | null;
        room_type?: string | null;
    } | null;
}

export interface CompatibilityResult {
    score: number; // 0 - 100%
    matchScore: number; // alias to score for RoommateSuggestionItem compatibility
    breakdown: {
        budget: number;
        location: number;
        lifestyle: number;
        genderRoom: number;
        interests: number;
    };
    matchingTags: string[];
    warningTags: string[];
}

export const STORAGE_KEY_TENANT_PREF = 'hexroom_user_preference';
export const STORAGE_KEY_TENANT_LIFESTYLE = 'hexroom_user_lifestyle';

export const COMMON_AMENITIES = [
    'Máy lạnh',
    'Tủ lạnh',
    'Máy giặt',
    'Gác lửng',
    'Ban công',
    'WC riêng',
    'Khóa vân tay',
    'Bếp riêng',
    'Thang máy',
    'Bãi giữ xe',
    'Giờ giấc tự do',
    'Không chung chủ',
    'Wifi tốc độ cao',
    'Camera an ninh',
];

export const COMMON_DEAL_BREAKERS = [
    'Hút thuốc trong phòng',
    'Làm ồn sau 23h đêm',
    'Dẫn người lạ ngủ lại qua đêm',
    'Không dọn dẹp vệ sinh chung',
    'Chậm tiền phòng & điện nước',
    'Tự ý dùng đồ cá nhân không hỏi',
    'Nuôi thú cưng không vệ sinh',
];

export const BUDGET_PRESETS = [
    { label: '< 2.5 triệu', min: 0, max: 2500000 },
    { label: '2.5 - 4.5 triệu', min: 2500000, max: 4500000 },
    { label: '4.5 - 7 triệu', min: 4500000, max: 7000000 },
    { label: '7 - 10 triệu', min: 7000000, max: 10000000 },
    { label: '> 10 triệu', min: 10000000, max: 25000000 },
];

/** Get stored preferences with safe fallback */
export function getStoredTenantPreferences(): TenantPreferencesData | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TENANT_PREF);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/** Get stored lifestyle with safe fallback */
export function getStoredTenantLifestyle(): TenantLifestyleData | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TENANT_LIFESTYLE);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/** Persist preferences locally for instant offline / client-side calculation */
export function saveStoredTenantPreferences(pref: TenantPreferencesData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_TENANT_PREF, JSON.stringify(pref));
    } catch {
        // ignore quota errors
    }
}

export function saveStoredTenantLifestyle(lifestyle: TenantLifestyleData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_TENANT_LIFESTYLE, JSON.stringify(lifestyle));
    } catch {
        // ignore quota errors
    }
}

function parseArray(val: string[] | string | undefined | null): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
    return String(val)
        .split(/[,，;、]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Calculates compatibility between a tenant and candidate roommate.
 */
export function calculateRoommateCompatibility(
    tenantPref: TenantPreferencesData | null | undefined,
    tenantLifestyle: TenantLifestyleData | null | undefined,
    candidate: CandidateRoommateData,
    userGender?: string | null
): CompatibilityResult {
    const hasTenantCriteria = Boolean(
        tenantPref?.budget_max ||
        tenantPref?.budget_min ||
        tenantPref?.preferredLocation ||
        (tenantPref?.preferred_districts && parseArray(tenantPref.preferred_districts).length > 0) ||
        tenantPref?.preferred_gender ||
        tenantLifestyle?.smoking !== undefined ||
        tenantLifestyle?.pets_allowed !== undefined ||
        tenantLifestyle?.sleep_schedule
    );

    if (!hasTenantCriteria) {
        const baseScore = candidate.matchScore || 50;
        return {
            score: baseScore,
            matchScore: baseScore,
            breakdown: { budget: 15, location: 15, lifestyle: 15, genderRoom: 5, interests: 0 },
            matchingTags: ['Hồ sơ công khai'],
            warningTags: ['Chưa có hồ sơ đối chiếu'],
        };
    }

    let budgetScore = 20; // default neutral
    let locationScore = 20;
    let lifestyleScore = 28;
    let genderRoomScore = 8;
    let interestsScore = 0;
    const matchingTags: string[] = [];
    const warningTags: string[] = [];

    const candLifestyle = candidate.lifestyle;
    const candPref = candidate.preference;

    // ── 1. BUDGET MATCH (Max 25 pts) ──
    const tMin = tenantPref?.budget_min ? Number(tenantPref.budget_min) : 0;
    const tMax = tenantPref?.budget_max ? Number(tenantPref.budget_max) : 0;
    const cMin = candPref?.budget_min ? Number(candPref.budget_min) : 0;
    const cMax = candPref?.budget_max ? Number(candPref.budget_max) : 0;

    if (tMax > 0 && cMax > 0) {
        // Check overlap between [tMin, tMax] and [cMin, cMax]
        const effectiveTMin = tMin > 0 ? tMin : tMax * 0.5;
        const effectiveCMin = cMin > 0 ? cMin : cMax * 0.5;
        const overlapStart = Math.max(effectiveTMin, effectiveCMin);
        const overlapEnd = Math.min(tMax, cMax);

        if (overlapEnd >= overlapStart) {
            budgetScore = 25;
            matchingTags.push('✓ Đúng tầm giá');
        } else {
            const gap = overlapStart - overlapEnd;
            if (gap <= 1000000) {
                budgetScore = 17;
                matchingTags.push('✓ Giá thuê gần khớp');
            } else if (gap <= 2500000) {
                budgetScore = 10;
                warningTags.push('⚠ Chênh lệch ngân sách');
            } else {
                budgetScore = 2;
                warningTags.push('⚠ Khác mức ngân sách');
            }
        }
    } else if (tMax > 0 && cMax === 0) {
        budgetScore = 18;
    }

    // ── 2. LOCATION MATCH (Max 25 pts) ──
    const tenantDistricts = parseArray(tenantPref?.preferred_districts);
    const candDistricts = parseArray(candPref?.preferred_districts);
    const candLoc = (candPref?.preferredLocation || '').toLowerCase().trim();
    const tenantLoc = (tenantPref?.preferredLocation || '').toLowerCase().trim();

    if (tenantDistricts.length > 0) {
        let matchedDistrict = '';
        const hasDirectMatch = tenantDistricts.some((td) => {
            const tdLower = td.toLowerCase();
            const matched =
                candDistricts.some((cd) => cd.toLowerCase().includes(tdLower) || tdLower.includes(cd.toLowerCase())) ||
                candLoc.includes(tdLower);
            if (matched) matchedDistrict = td;
            return matched;
        });

        if (hasDirectMatch) {
            locationScore = 25;
            matchingTags.push(`✓ Cùng khu vực ${matchedDistrict}`);
        } else {
            // Check if common metropolitan city
            const isBothHCM =
                (tenantDistricts.some((d) => /quận|bình thạnh|thủ đức|gò vấp|tân bình|hồ chí minh/i.test(d)) || tenantLoc.includes('hồ chí minh') || tenantLoc.includes('hcm')) &&
                (candDistricts.some((d) => /quận|bình thạnh|thủ đức|gò vấp|tân bình|hồ chí minh/i.test(d)) || candLoc.includes('hồ chí minh') || candLoc.includes('hcm'));
            const isBothHN =
                (tenantDistricts.some((d) => /cầu giấy|đống đa|ba đình|hà nội/i.test(d)) || tenantLoc.includes('hà nội')) &&
                (candDistricts.some((d) => /cầu giấy|đống đa|ba đình|hà nội/i.test(d)) || candLoc.includes('hà nội'));

            if (isBothHCM || isBothHN) {
                locationScore = 16;
                matchingTags.push('✓ Cùng thành phố');
            } else {
                locationScore = 2;
                warningTags.push('⚠ Khác khu vực ưu tiên');
            }
        }
    } else if (tenantLoc) {
        if (candLoc && (candLoc.includes(tenantLoc) || tenantLoc.includes(candLoc))) {
            locationScore = 25;
            matchingTags.push(`✓ Cùng thành phố ${tenantPref?.preferredLocation}`);
        } else if (candDistricts.some((cd) => cd.toLowerCase().includes(tenantLoc) || tenantLoc.includes(cd.toLowerCase()))) {
            locationScore = 25;
            matchingTags.push(`✓ Cùng khu vực ${tenantPref?.preferredLocation}`);
        } else if (candLoc) {
            locationScore = 0;
            warningTags.push(`⚠ Khác thành phố`);
        } else {
            locationScore = 12;
        }
    } else {
        locationScore = 12;
    }

    // ── 3. LIFESTYLE HABITS (Max 35 pts) ──
    let habitPoints = 0;

    // A. Smoking (8 pts)
    const tenantSmokes = tenantLifestyle?.smoking === true;
    const candSmokes = candLifestyle?.smoking === true;
    const tenantPrefNoSmoking = tenantPref?.smoking_allowed === false || !tenantSmokes;

    if (!tenantSmokes && !candSmokes) {
        habitPoints += 8;
        matchingTags.push('✓ Không hút thuốc');
    } else if (tenantSmokes && candSmokes) {
        habitPoints += 6;
        matchingTags.push('✓ Thói quen hút thuốc tương đồng');
    } else if (tenantPrefNoSmoking && candSmokes) {
        habitPoints += 0;
        warningTags.push('⚠ Ứng viên có hút thuốc');
    } else {
        habitPoints += 4;
    }

    // B. Pets (7 pts)
    const tenantAllowsPets = tenantPref?.pet_friendly === true || tenantLifestyle?.pets_allowed === true;
    const candAllowsPets = candLifestyle?.pets_allowed === true;

    if (tenantAllowsPets && candAllowsPets) {
        habitPoints += 7;
        matchingTags.push('✓ Cho nuôi thú cưng');
    } else if (!tenantAllowsPets && !candAllowsPets) {
        habitPoints += 7;
        matchingTags.push('✓ Không nuôi thú cưng');
    } else if (!tenantAllowsPets && candAllowsPets) {
        habitPoints += 2;
        warningTags.push('⚠ Ứng viên có nuôi thú cưng');
    } else {
        habitPoints += 5;
    }

    // C. Sleep Schedule (7 pts)
    const tSleep = (tenantPref?.sleep_preference || tenantLifestyle?.sleep_schedule || '').toLowerCase();
    const cSleep = (candLifestyle?.sleep_schedule || '').toLowerCase();

    if (tSleep && cSleep) {
        const isTEarly = tSleep.includes('sớm') || tSleep.includes('trước 22h') || tSleep.includes('23h');
        const isCEarly = cSleep.includes('sớm') || cSleep.includes('trước 22h') || cSleep.includes('23h00') || cSleep.includes('22h30');
        const isTLate = tSleep.includes('khuya') || tSleep.includes('sau 0h') || tSleep.includes('01h') || tSleep.includes('24h');
        const isCLate = cSleep.includes('khuya') || cSleep.includes('sau 0h') || cSleep.includes('01h') || cSleep.includes('24h00');

        if ((isTEarly && isCEarly) || (isTLate && isCLate)) {
            habitPoints += 7;
            matchingTags.push(isTEarly ? '✓ Cùng giờ ngủ sớm' : '✓ Cùng giờ ngủ khuya');
        } else if ((isTEarly && isCLate) || (isTLate && isCEarly)) {
            habitPoints += 2;
            warningTags.push('⚠ Khác lịch ngủ');
        } else {
            habitPoints += 5;
            matchingTags.push('✓ Giờ giấc sinh hoạt ổn');
        }
    } else {
        habitPoints += 5;
    }

    // D. Cleanliness (5 pts)
    const tClean = (tenantPref?.cleanliness_preference || tenantLifestyle?.cleanliness || '').toLowerCase();
    const cClean = (candLifestyle?.cleanliness || '').toLowerCase();

    if (tClean && cClean) {
        if (tClean.includes('sạch') && cClean.includes('sạch')) {
            habitPoints += 5;
            matchingTags.push('✓ Cùng giữ vệ sinh sạch sẽ');
        } else if (tClean.includes('gọn') && cClean.includes('gọn')) {
            habitPoints += 5;
            matchingTags.push('✓ Gọn gàng ngăn nắp');
        } else {
            habitPoints += 4;
        }
    } else {
        habitPoints += 4;
    }

    // E. Noise Tolerance & Social (5 pts)
    const tNoise = (tenantPref?.noise_preference || tenantLifestyle?.noise_tolerance || '').toLowerCase();
    const cNoise = (candLifestyle?.noise_tolerance || '').toLowerCase();

    if (tNoise && cNoise) {
        if (tNoise.includes('thấp') || tNoise.includes('yên tĩnh')) {
            if (cNoise.includes('thấp') || cNoise.includes('yên tĩnh')) {
                habitPoints += 5;
                matchingTags.push('✓ Cần không gian yên tĩnh');
            } else {
                habitPoints += 2;
            }
        } else {
            habitPoints += 4;
        }
    } else {
        habitPoints += 4;
    }

    // F. Cooking & WFH (3 pts)
    if (tenantLifestyle?.work_from_home && candLifestyle?.work_from_home) {
        habitPoints += 3;
        matchingTags.push('✓ Cùng làm việc tại nhà (WFH)');
    } else {
        habitPoints += 3;
    }

    lifestyleScore = Math.min(35, habitPoints);

    // ── 4. GENDER & ROOM TYPE MATCH (Max 10 pts) ──
    let grPoints = 0;
    const prefGender = tenantPref?.preferred_gender || '';
    const candGender = candidate.user.gender;
    const myGender = userGender || '';

    if (prefGender === 'SAME') {
        if (myGender && candGender && myGender.toLowerCase() === candGender.toLowerCase()) {
            grPoints += 6;
            matchingTags.push('✓ Cùng giới tính');
        } else if (myGender && candGender && myGender.toLowerCase() !== candGender.toLowerCase()) {
            grPoints += 1;
            warningTags.push('⚠ Khác giới tính');
        } else {
            grPoints += 4;
        }
    } else if (prefGender && prefGender !== 'ANY') {
        if (candGender && candGender.toLowerCase() === prefGender.toLowerCase()) {
            grPoints += 6;
            matchingTags.push(`✓ Đúng giới tính (${candGender})`);
        } else if (candGender) {
            grPoints += 1;
            warningTags.push(`⚠ Khác giới tính mong muốn`);
        } else {
            grPoints += 4;
        }
    } else {
        grPoints += 6;
    }

    // Room type match (4 pts)
    const tRoomType = tenantPref?.room_type;
    const cRoomType = candPref?.room_type;
    if (tRoomType && cRoomType) {
        if (tRoomType === cRoomType) {
            grPoints += 4;
            matchingTags.push('✓ Đúng loại phòng');
        } else {
            grPoints += 2;
        }
    } else {
        grPoints += 3;
    }

    genderRoomScore = Math.min(10, grPoints);

    // ── 5. SHARED INTERESTS (Max 5 pts) ──
    const tInterests = parseArray(tenantLifestyle?.interests);
    const cInterests = parseArray(candLifestyle?.interests);

    if (tInterests.length > 0 && cInterests.length > 0) {
        const shared = tInterests.filter((ti) =>
            cInterests.some((ci) => ci.toLowerCase() === ti.toLowerCase())
        );
        if (shared.length >= 2) {
            interestsScore = 5;
            matchingTags.push(`✓ Cùng sở thích: ${shared.slice(0, 2).join(', ')}`);
        } else if (shared.length === 1) {
            interestsScore = 3;
            matchingTags.push(`✓ Cùng sở thích ${shared[0]}`);
        }
    }

    // ── 6. DEAL BREAKERS PENALTY ──
    const dealBreakers = parseArray(tenantPref?.deal_breakers || tenantLifestyle?.deal_breakers);
    let penalty = 0;

    if (dealBreakers.length > 0) {
        dealBreakers.forEach((db) => {
            const dbLower = db.toLowerCase();
            if (dbLower.includes('thuốc') && candLifestyle?.smoking === true) {
                penalty += 12;
                warningTags.push('🚫 Vi phạm điều tối kỵ: Hút thuốc');
            }
            if (dbLower.includes('thú cưng') && candLifestyle?.pets_allowed === true && !tenantAllowsPets) {
                penalty += 10;
                warningTags.push('🚫 Vi phạm điều tối kỵ: Thú cưng');
            }
            if (dbLower.includes('ồn') && candLifestyle?.noise_tolerance?.toLowerCase().includes('cao')) {
                penalty += 8;
            }
        });
    }

    // ── 7. WEIGHT ADJUSTMENT ──
    const weightMode = tenantPref?.lifestyle_match_weight;
    let totalScore = budgetScore + locationScore + lifestyleScore + genderRoomScore + interestsScore - penalty;

    if (weightMode === 2) {
        // Ưu tiên Ngân sách & Vị trí
        totalScore = (budgetScore + locationScore) * 1.25 + lifestyleScore * 0.75 + genderRoomScore + interestsScore - penalty;
    } else if (weightMode === 3) {
        // Ưu tiên Thói quen sinh hoạt
        totalScore = (budgetScore + locationScore) * 0.75 + lifestyleScore * 1.25 + genderRoomScore + interestsScore - penalty;
    }

    // Clamp score between 25% and 98%
    const finalScore = Math.max(25, Math.min(98, Math.round(totalScore)));

    return {
        score: finalScore,
        matchScore: finalScore,
        breakdown: {
            budget: budgetScore,
            location: locationScore,
            lifestyle: lifestyleScore,
            genderRoom: genderRoomScore,
            interests: interestsScore,
        },
        matchingTags: Array.from(new Set(matchingTags)).slice(0, 4),
        warningTags: Array.from(new Set(warningTags)).slice(0, 2),
    };
}
