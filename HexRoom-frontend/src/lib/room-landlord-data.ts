/**
 * Room Landlord and 4-Step Inspection Metadata
 * Provides rich information about who is listing each room,
 * their verification status (identity, role), response rate,
 * and whether the room has been inspected/verified according
 * to HexRoom's 4-step standard.
 */

export interface RoomLandlordProfile {
    id: string;
    fullName: string;
    avatarUrl: string;
    role: 'CHÍNH CHỦ' | 'QUẢN LÝ TÒA NHÀ' | 'ĐẠI DIỆN VẬN HÀNH';
    roleBadge: string;
    phone: string;
    isIdentityVerified: boolean;
    identityBadge: string;
    responseRate: string;
    responseTime: string;
    rating: number;
    reviewCount: number;
    experience?: string;
}

export interface RoomInspectionProfile {
    isInspected: boolean;
    status: 'VERIFIED' | 'PENDING';
    statusBadge: string;
    inspectedDate?: string;
    inspectorName?: string;
    checklist: {
        condition: boolean;     // 1. Hiện trạng phòng thực tế
        priceAndFees: boolean;  // 2. Giá và phụ phí minh bạch 100%
        images: boolean;        // 3. Hình ảnh chụp đối chiếu thực địa
        rentalRights: boolean;  // 4. Pháp lý & Quyền cho thuê
    };
    summary: string;
}

export interface RoomCostHighlights {
    electricity: string;
    water: string;
    deposit: string;
    service: string;
    parking?: string;
    isAllInclusive: boolean;
}

export const KNOWN_ROOM_METADATA: Record<string, { landlord: RoomLandlordProfile; inspection: RoomInspectionProfile }> = {
    // Room 001 - Studio Ban Công Nguyễn Gia Trí (Bình Thạnh)
    'room-001': {
        landlord: {
            id: 'host-001',
            fullName: 'Chị Thu Trang',
            avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
            role: 'CHÍNH CHỦ',
            roleBadge: 'Chính chủ cho thuê',
            phone: '0908 123 456',
            isIdentityVerified: true,
            identityBadge: 'Đã xác minh CCCD & Sổ hồng chính chủ',
            responseRate: '99%',
            responseTime: '⚡ Phản hồi trong 5 phút',
            rating: 4.95,
            reviewCount: 28,
            experience: '4 năm cho thuê uy tín tại Bình Thạnh'
        },
        inspection: {
            isInspected: true,
            status: 'VERIFIED',
            statusBadge: '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC',
            inspectedDate: '12/10/2026',
            inspectorName: 'Nguyễn Văn Hùng (HexRoom Lead Inspector)',
            checklist: {
                condition: true,
                priceAndFees: true,
                images: true,
                rentalRights: true
            },
            summary: 'Đã kiểm tra trực tiếp tại chỗ: Đo đạc 35m², đồng hồ điện nước riêng chạy chuẩn, nội thất Inverter mới 100%, hợp đồng pháp lý chính chủ.'
        }
    },

    // Room 002 - Gác Lửng Đúc D5 (Bình Thạnh)
    'room-002': {
        landlord: {
            id: 'host-002',
            fullName: 'Bác Minh Tâm',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
            role: 'CHÍNH CHỦ',
            roleBadge: 'Chủ trọ lâu năm (8 năm)',
            phone: '0912 345 678',
            isIdentityVerified: true,
            identityBadge: 'Đã xác minh CCCD & Hộ khẩu chính chủ',
            responseRate: '98%',
            responseTime: '⚡ Phản hồi trong 10 phút',
            rating: 4.88,
            reviewCount: 19,
            experience: '8 năm quản lý nhà trọ sinh viên D5'
        },
        inspection: {
            isInspected: true,
            status: 'VERIFIED',
            statusBadge: '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC',
            inspectedDate: '10/10/2026',
            inspectorName: 'Trần Minh Trí (HexRoom Inspector)',
            checklist: {
                condition: true,
                priceAndFees: true,
                images: true,
                rentalRights: true
            },
            summary: 'Đã nghiệm thu gác lửng đúc kiên cố cao 2m không đụng đầu, áp lực nước mạnh, camera an ninh và khóa cổng thẻ từ hoạt động tốt.'
        }
    },

    // Room 003 - Căn Hộ Mini 1PN Lâm Văn Bền (Quận 7)
    'room-003': {
        landlord: {
            id: 'host-003',
            fullName: 'Anh Hoàng Nam',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
            role: 'QUẢN LÝ TÒA NHÀ',
            roleBadge: 'Quản lý tòa nhà HexSignature',
            phone: '0987 654 321',
            isIdentityVerified: true,
            identityBadge: 'Hợp đồng ủy quyền pháp lý từ chủ sở hữu',
            responseRate: '100%',
            responseTime: '⚡ Phản hồi tức thì (< 3 phút)',
            rating: 5.0,
            reviewCount: 42,
            experience: 'Đại diện chuỗi 6 tòa nhà căn hộ Quận 7'
        },
        inspection: {
            isInspected: true,
            status: 'VERIFIED',
            statusBadge: '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC',
            inspectedDate: '08/10/2026',
            inspectorName: 'Lê Hoài An (HexRoom Lead Inspector)',
            checklist: {
                condition: true,
                priceAndFees: true,
                images: true,
                rentalRights: true
            },
            summary: 'Hồ sơ tòa nhà đầy đủ PCCC, thang máy thẻ từ, máy giặt riêng từng phòng, phí dịch vụ công khai không phát sinh phụ phí ẩn.'
        }
    },

    // Room 004 - Ở Ghép Coliving Linh Trung (Thủ Đức)
    'room-004': {
        landlord: {
            id: 'host-004',
            fullName: 'Chị Thảo My',
            avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
            role: 'ĐẠI DIỆN VẬN HÀNH',
            roleBadge: 'Điều phối viên Coliving Thủ Đức',
            phone: '0934 567 890',
            isIdentityVerified: true,
            identityBadge: 'Xác thực pháp nhân doanh nghiệp lưu trú',
            responseRate: '97%',
            responseTime: '⚡ Phản hồi trong 15 phút',
            rating: 4.92,
            reviewCount: 35,
            experience: 'Vận hành chuỗi nhà ở chia sẻ sinh viên'
        },
        inspection: {
            isInspected: true,
            status: 'VERIFIED',
            statusBadge: '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC',
            inspectedDate: '11/10/2026',
            inspectorName: 'Nguyễn Văn Hùng (HexRoom Inspector)',
            checklist: {
                condition: true,
                priceAndFees: true,
                images: true,
                rentalRights: true
            },
            summary: 'Xác nhận bao trọn gói chi phí điện nước, wifi 500Mbps, dọn vệ sinh 3 lần/tuần. Giường tầng có rèm che riêng tư và locker an toàn.'
        }
    },

    // Room 005 - Studio Trung Tâm Cầu Giấy (Trần Thái Tông, Hà Nội)
    'room-005': {
        landlord: {
            id: 'host-005',
            fullName: 'Anh Quốc Bảo',
            avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=160&auto=format&fit=crop&q=80',
            role: 'CHÍNH CHỦ',
            roleBadge: 'Chính chủ cho thuê',
            phone: '0945 678 901',
            isIdentityVerified: true,
            identityBadge: 'Đã xác minh CCCD gắn chip & Sổ đỏ',
            responseRate: '96%',
            responseTime: '⚡ Phản hồi trong 15 phút',
            rating: 4.85,
            reviewCount: 16,
            experience: '3 năm cho thuê nhà phố Cầu Giấy'
        },
        inspection: {
            isInspected: true,
            status: 'VERIFIED',
            statusBadge: '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC',
            inspectedDate: '09/10/2026',
            inspectorName: 'Đặng Tuấn Anh (HexRoom Hà Nội)',
            checklist: {
                condition: true,
                priceAndFees: true,
                images: true,
                rentalRights: true
            },
            summary: 'Đã đối chiếu công tơ điện riêng, khóa vân tay cửa ra vào 24/24, bình nóng lạnh Ariston mới lắp đặt, ngõ rộng ô tô đỗ cửa đúng cam kết.'
        }
    },

    // Room 006 - Phòng Trọ Khép Kín Mỹ Đình (Hà Nội) - MỚI ĐĂNG (CHƯA KIỂM ĐỊNH)
    'room-006': {
        landlord: {
            id: 'host-006',
            fullName: 'Cô Kim Oanh',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
            role: 'CHÍNH CHỦ',
            roleBadge: 'Chủ nhà tự đăng',
            phone: '0978 901 234',
            isIdentityVerified: false,
            identityBadge: 'Chờ đối chiếu CCCD & Giấy tờ tại chỗ',
            responseRate: '92%',
            responseTime: '⚡ Phản hồi trong 30 phút',
            rating: 4.7,
            reviewCount: 8,
            experience: 'Chủ dãy trọ sinh viên Mỹ Đình'
        },
        inspection: {
            isInspected: false,
            status: 'PENDING',
            statusBadge: 'CHỜ ĐỐI CHIẾU THỰC ĐỊA',
            inspectedDate: undefined,
            inspectorName: undefined,
            checklist: {
                condition: false,
                priceAndFees: false,
                images: false,
                rentalRights: false
            },
            summary: 'Tin đăng do chủ nhà tự khai báo, đang xếp lịch kiểm định thực địa 4 bước với chuyên viên HexRoom. Người thuê có thể bấm yêu cầu đối chiếu.'
        }
    },

    // Room 007 - Căn Hộ Duplex Hoàng Sa (Quận 1)
    'room-007': {
        landlord: {
            id: 'host-007',
            fullName: 'Anh Lê Hoàng Quân',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
            role: 'QUẢN LÝ TÒA NHÀ',
            roleBadge: 'Quản lý căn hộ River View',
            phone: '0909 888 999',
            isIdentityVerified: true,
            identityBadge: 'Đã xác minh Giấy phép KD & CCCD',
            responseRate: '100%',
            responseTime: '⚡ Phản hồi trong 2 phút',
            rating: 4.98,
            reviewCount: 54,
            experience: 'Quản lý chuỗi căn hộ cao cấp Quận 1'
        },
        inspection: {
            isInspected: true,
            status: 'VERIFIED',
            statusBadge: '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC',
            inspectedDate: '13/10/2026',
            inspectorName: 'Nguyễn Văn Hùng (HexRoom Inspector)',
            checklist: {
                condition: true,
                priceAndFees: true,
                images: true,
                rentalRights: true
            },
            summary: 'Đã nghiệm thu hiện trạng thực tế, hồ bơi vô cực và máy móc nội thất cao cấp đúng chuẩn 100%.'
        }
    },

    // Room 008 - Phòng Ở Ghép Sinh Viên ĐHQG (Thủ Đức) - MỚI ĐĂNG (CHỜ ĐỐI CHIẾU)
    'room-008': {
        landlord: {
            id: 'host-008',
            fullName: 'Thầy Quang Khải',
            avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&auto=format&fit=crop&q=80',
            role: 'CHÍNH CHỦ',
            roleBadge: 'Chủ khu trọ sinh viên ĐHQG',
            phone: '0981 234 567',
            isIdentityVerified: false,
            identityBadge: 'Chờ đối chiếu giấy tờ thực tế',
            responseRate: '90%',
            responseTime: '⚡ Phản hồi trong 45 phút',
            rating: 4.6,
            reviewCount: 12,
            experience: 'Chủ ký túc xá tư nhân'
        },
        inspection: {
            isInspected: false,
            status: 'PENDING',
            statusBadge: 'CHƯA ĐỐI CHIẾU THỰC ĐỊA',
            inspectedDate: undefined,
            inspectorName: undefined,
            checklist: {
                condition: false,
                priceAndFees: false,
                images: false,
                rentalRights: false
            },
            summary: 'Thông tin do chủ trọ mới đăng tải, lịch kiểm tra đối chiếu thực địa dự kiến trong 24 giờ tới.'
        }
    }
};

// Aliases for Backend Database UUIDs
KNOWN_ROOM_METADATA['51acc2a7-c346-4434-93b5-c18d3ace3697'] = KNOWN_ROOM_METADATA['room-001'];
KNOWN_ROOM_METADATA['255c9565-f0b8-46c7-8b82-a121d56f537c'] = KNOWN_ROOM_METADATA['room-002'];
KNOWN_ROOM_METADATA['fa4c7fac-0dfa-464d-90ff-23d9df6bba22'] = KNOWN_ROOM_METADATA['room-003'];
KNOWN_ROOM_METADATA['23c64ae7-b97a-4cdc-b362-a5b75940324d'] = KNOWN_ROOM_METADATA['room-004'];
KNOWN_ROOM_METADATA['f1fbcd12-f43a-461e-9403-2c46ed6dbf02'] = KNOWN_ROOM_METADATA['room-005'];
KNOWN_ROOM_METADATA['8c814d37-5b79-4e69-989f-1bb6a455784a'] = KNOWN_ROOM_METADATA['room-006'];

/**
 * Realistic pool of fallback landlords for newly created rooms
 */
const FALLBACK_LANDLORD_POOL = [
    {
        fullName: 'Chị Bích Phượng',
        role: 'CHÍNH CHỦ' as const,
        roleBadge: 'Chính chủ cho thuê',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
        phone: '0903 456 789',
        isIdentityVerified: true,
        identityBadge: 'Đã xác minh CCCD & Giấy tờ nhà',
        responseRate: '98%',
        responseTime: '⚡ Phản hồi trong 5 phút',
        rating: 4.9,
        reviewCount: 22,
        experience: '5 năm kinh nghiệm cho thuê'
    },
    {
        fullName: 'Anh Đức Thắng',
        role: 'QUẢN LÝ TÒA NHÀ' as const,
        roleBadge: 'Quản lý vận hành được ủy quyền',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&auto=format&fit=crop&q=80',
        phone: '0988 112 233',
        isIdentityVerified: true,
        identityBadge: 'Ủy quyền pháp lý từ chủ sở hữu',
        responseRate: '100%',
        responseTime: '⚡ Phản hồi tức thì (< 3 phút)',
        rating: 4.95,
        reviewCount: 31,
        experience: 'Quản lý chuỗi căn hộ dịch vụ'
    },
    {
        fullName: 'Cô Tuyết Mai',
        role: 'CHÍNH CHỦ' as const,
        roleBadge: 'Chủ nhà trực tiếp',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
        phone: '0918 334 455',
        isIdentityVerified: false,
        identityBadge: 'Đang xếp lịch đối chiếu CCCD',
        responseRate: '93%',
        responseTime: '⚡ Phản hồi trong 20 phút',
        rating: 4.7,
        reviewCount: 9,
        experience: 'Chủ nhà trọ lâu năm'
    },
    {
        fullName: 'Anh Vũ Duy',
        role: 'CHÍNH CHỦ' as const,
        roleBadge: 'Chính chủ cho thuê',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
        phone: '0977 889 900',
        isIdentityVerified: true,
        identityBadge: 'Đã xác minh CCCD gắn chip',
        responseRate: '97%',
        responseTime: '⚡ Phản hồi trong 10 phút',
        rating: 4.88,
        reviewCount: 14,
        experience: 'Chính chủ'
    }
];

/**
 * Returns landlord & inspection profile for any room item
 */
export function getRoomLandlordAndInspection(room: {
    id?: string;
    rentalId?: string;
    rentalTitle?: string;
    roomName?: string | null;
    title?: string;
    description?: string | null;
    rental?: { title?: string } | null;
    [key: string]: any;
}): { landlord: RoomLandlordProfile; inspection: RoomInspectionProfile } {
    const roomId = room.id || '';

    // 1. Direct ID / UUID match
    if (KNOWN_ROOM_METADATA[roomId]) {
        return KNOWN_ROOM_METADATA[roomId];
    }

    // 2. Check if created locally by landlord in this browser session
    try {
        const storedInspectionRequests = JSON.parse(localStorage.getItem('hexroom_inspection_requests') || '[]');
        const req = storedInspectionRequests.find((r: any) => r.roomId === roomId);
        if (req) {
            return {
                landlord: {
                    id: `host-${roomId}`,
                    fullName: 'Chủ nhà (Bạn - Vừa đăng)',
                    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
                    role: 'CHÍNH CHỦ',
                    roleBadge: 'Chính chủ vừa đăng',
                    phone: req.contactPhone || '0900 000 000',
                    isIdentityVerified: false,
                    identityBadge: 'Đang xếp lịch kiểm định 4 bước',
                    responseRate: '100%',
                    responseTime: '⚡ Phản hồi tức thì',
                    rating: 5.0,
                    reviewCount: 1,
                    experience: 'Phòng mới đăng'
                },
                inspection: {
                    isInspected: false,
                    status: 'PENDING',
                    statusBadge: 'CHỜ ĐỐI CHIẾU THỰC ĐỊA',
                    inspectedDate: undefined,
                    inspectorName: undefined,
                    checklist: { condition: false, priceAndFees: false, images: false, rentalRights: false },
                    summary: `Đã gửi yêu cầu kiểm định vào ngày ${req.preferredDate || 'gần nhất'}. Inspector HexRoom sẽ liên hệ khảo sát thực địa.`
                }
            };
        }
    } catch {
        // ignore
    }

    // 3. Fuzzy matching by room name, title or rental title
    const searchStr = `${room.roomName || ''} ${room.title || ''} ${room.rentalTitle || ''} ${room.rental?.title || ''} ${room.description || ''}`.toLowerCase();

    if (searchStr.includes('nguyễn gia trí') || searchStr.includes('d2') || searchStr.includes('studio ban công')) {
        return KNOWN_ROOM_METADATA['room-001'];
    }
    if (searchStr.includes('d5') || searchStr.includes('gác lửng')) {
        return KNOWN_ROOM_METADATA['room-002'];
    }
    if (searchStr.includes('lâm văn bền') || searchStr.includes('quận 7') || searchStr.includes('phú mỹ hưng') || searchStr.includes('signature residence')) {
        return KNOWN_ROOM_METADATA['room-003'];
    }
    if (searchStr.includes('linh trung') || searchStr.includes('thủ đức') || searchStr.includes('ở ghép') || searchStr.includes('coliving')) {
        return KNOWN_ROOM_METADATA['room-004'];
    }
    if (searchStr.includes('cầu giấy') || searchStr.includes('trần thái tông')) {
        return KNOWN_ROOM_METADATA['room-005'];
    }
    if (searchStr.includes('mỹ đình') || searchStr.includes('keangnam') || searchStr.includes('nhân mỹ')) {
        return KNOWN_ROOM_METADATA['room-006'];
    }
    if (searchStr.includes('hoàng sa') || searchStr.includes('quận 1') || searchStr.includes('duplex') || searchStr.includes('river view')) {
        return KNOWN_ROOM_METADATA['room-007'];
    }
    if (searchStr.includes('đhqg') || searchStr.includes('ký túc xá')) {
        return KNOWN_ROOM_METADATA['room-008'];
    }

    // 4. Deterministic assignment from realistic Vietnamese landlord pool
    const numSeed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const landlordPreset = FALLBACK_LANDLORD_POOL[numSeed % FALLBACK_LANDLORD_POOL.length];
    const isVerified = landlordPreset.isIdentityVerified;

    return {
        landlord: {
            id: `host-${roomId}`,
            fullName: landlordPreset.fullName,
            avatarUrl: landlordPreset.avatarUrl,
            role: landlordPreset.role,
            roleBadge: landlordPreset.roleBadge,
            phone: landlordPreset.phone,
            isIdentityVerified: landlordPreset.isIdentityVerified,
            identityBadge: landlordPreset.identityBadge,
            responseRate: landlordPreset.responseRate,
            responseTime: landlordPreset.responseTime,
            rating: landlordPreset.rating,
            reviewCount: landlordPreset.reviewCount,
            experience: landlordPreset.experience
        },
        inspection: {
            isInspected: isVerified,
            status: isVerified ? 'VERIFIED' : 'PENDING',
            statusBadge: isVerified ? '100% ĐÃ ĐỐI CHIẾU 4 BƯỚC' : 'CHỜ ĐỐI CHIẾU THỰC ĐỊA',
            inspectedDate: isVerified ? '08/10/2026' : undefined,
            inspectorName: isVerified ? 'HexRoom Field Inspector' : undefined,
            checklist: {
                condition: isVerified,
                priceAndFees: isVerified,
                images: isVerified,
                rentalRights: isVerified
            },
            summary: isVerified
                ? 'Đã kiểm tra thực tế, đối chiếu giá phòng và quyền cho thuê hợp pháp.'
                : 'Thông tin tự đăng, đang chờ nhân viên HexRoom kiểm định tại chỗ.'
        }
    };
}

/**
 * Extracts and formats transparent cost pills for quick display on card
 */
export function getRoomCostHighlights(room: any): RoomCostHighlights {
    const costs = room.costs || {};
    const price = room.price || 0;

    const electricityVal = costs.electricityPerKwh;
    const waterVal = costs.waterPerM3;
    const depositVal = costs.deposit ?? (price > 0 ? price : undefined);
    const serviceVal = costs.serviceMonthly;
    const parkingVal = costs.parkingMonthly;

    const isAllInclusive = electricityVal === 0 && waterVal === 0;

    const electricity = isAllInclusive
        ? 'Miễn phí'
        : electricityVal != null && electricityVal > 0
            ? `${(electricityVal / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}k/kWh`
            : '3.8k/kWh (chuẩn)';

    const water = isAllInclusive
        ? 'Miễn phí'
        : waterVal != null && waterVal > 0
            ? `${(waterVal / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}k/m³`
            : '20k/m³ (chuẩn)';

    const deposit = depositVal != null && depositVal > 0
        ? `${(depositVal / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`
        : '1 tháng cọc';

    const service = serviceVal != null && serviceVal > 0
        ? `${(serviceVal / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}k/tháng`
        : 'Miễn phí DV';

    const parking = parkingVal != null && parkingVal > 0
        ? `${(parkingVal / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}k/xe`
        : 'Miễn phí xe';

    return {
        electricity,
        water,
        deposit,
        service,
        parking,
        isAllInclusive
    };
}
