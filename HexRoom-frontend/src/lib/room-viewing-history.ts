export interface RoomViewingAppointment {
    id: string;
    tenantName: string;
    tenantPhone: string;
    tenantEmail?: string;
    tenantAvatar?: string;
    roomId: string;
    roomName: string;
    rentalId?: string;
    rentalTitle: string;
    rentalAddress: string;
    appointmentDate: string; // e.g. "2026-10-17"
    appointmentTimeSlot: string; // e.g. "14:00 - 16:00"
    visitedAt?: string; // Actual arrival time e.g. "17/10/2026 14:25"
    status: 'COMPLETED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'NO_SHOW';
    outcome: 'DEPOSIT_PAID' | 'CONSIDERING' | 'NOT_SUITABLE' | 'FOLLOW_UP' | 'PENDING';
    feedbackNote?: string;
    hostOrStaff: string;
    ratingFromTenant?: number;
    depositAmount?: number;
    createdAt: string;
}

const STORAGE_KEY = 'hexroom_landlord_viewing_history_v1';

export const INITIAL_VIEWING_HISTORY: RoomViewingAppointment[] = [
    {
        id: 'view-001',
        tenantName: 'Nguyễn Hoàng Nam',
        tenantPhone: '0908 123 456',
        tenantEmail: 'hoangnam.it@gmail.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-302',
        roomName: 'Phòng Studio Ban Công Thoáng Mát P.302',
        rentalId: 'rental-bt-01',
        rentalTitle: 'Căn hộ Dịch vụ HexHome Bình Thạnh',
        rentalAddress: '124/18 Xô Viết Nghệ Tĩnh, P.21, Q. Bình Thạnh, TP.HCM',
        appointmentDate: '2026-10-17',
        appointmentTimeSlot: '14:00 - 15:30',
        visitedAt: '17/10/2026 14:15',
        status: 'COMPLETED',
        outcome: 'DEPOSIT_PAID',
        feedbackNote: 'Khách rất hài lòng vì phòng thực tế giống 100% video và ảnh đo đạc thực tế trên HexRoom. Đã chốt cọc giữ phòng 2.500.000đ, dọn vào đầu tháng 11.',
        hostOrStaff: 'Chủ nhà trực tiếp (Cô Lan)',
        ratingFromTenant: 5.0,
        depositAmount: 2500000,
        createdAt: '2026-10-15T09:30:00Z',
    },
    {
        id: 'view-002',
        tenantName: 'Trần Thị Mai Phương',
        tenantPhone: '0912 345 678',
        tenantEmail: 'maiphuong.tran@gmail.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-105',
        roomName: 'Phòng Duplex Gác Lửng Trần Cao P.105',
        rentalId: 'rental-q10-02',
        rentalTitle: 'Nhà trọ Cao cấp HexRoom Quận 10',
        rentalAddress: '452/8 Sư Vạn Hạnh, P.12, Quận 10, TP.HCM',
        appointmentDate: '2026-10-16',
        appointmentTimeSlot: '16:30 - 17:30',
        visitedAt: '16/10/2026 16:45',
        status: 'COMPLETED',
        outcome: 'CONSIDERING',
        feedbackNote: 'Khách thích trần nhà cao thoáng và gác gỗ sạch bóng. Đang đợi công ty phê duyệt lộ trình làm việc từ xa để chuyển cọc.',
        hostOrStaff: 'Quản lý tòa nhà (A. Tuấn)',
        ratingFromTenant: 4.8,
        createdAt: '2026-10-14T11:20:00Z',
    },
    {
        id: 'view-003',
        tenantName: 'Lê Văn Đức',
        tenantPhone: '0987 654 321',
        tenantEmail: 'van.duc.le@yahoo.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-401',
        roomName: 'Phòng Đơn Khép Kín Cửa Sổ Lớn P.401',
        rentalId: 'rental-q7-03',
        rentalTitle: 'Chung cư mini HexRoom Tân Phong Q7',
        rentalAddress: '88 Đường số 7, KDC Him Lam, Tân Hưng, Quận 7, TP.HCM',
        appointmentDate: '2026-10-15',
        appointmentTimeSlot: '10:00 - 11:00',
        visitedAt: '15/10/2026 10:10',
        status: 'COMPLETED',
        outcome: 'FOLLOW_UP',
        feedbackNote: 'Khách đi xem trước 1 mình, khen máy giặt riêng và bếp thoáng. Hẹn tối thứ Bảy dẫn bạn cùng phòng qua xem lại trước khi ký cọc.',
        hostOrStaff: 'Chủ nhà trực tiếp (Cô Lan)',
        ratingFromTenant: 4.5,
        createdAt: '2026-10-13T16:00:00Z',
    },
    {
        id: 'view-004',
        tenantName: 'Võ Minh Khang',
        tenantPhone: '0945 667 788',
        tenantEmail: 'minhkhang.vo@gmail.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-502',
        roomName: 'Studio View Thoáng Gần ĐH Ngoại Thương P.502',
        rentalId: 'rental-bt-01',
        rentalTitle: 'Căn hộ Dịch vụ HexHome Bình Thạnh',
        rentalAddress: '124/18 Xô Viết Nghệ Tĩnh, P.21, Q. Bình Thạnh, TP.HCM',
        appointmentDate: '2026-10-18',
        appointmentTimeSlot: '09:00 - 10:30',
        status: 'CONFIRMED',
        outcome: 'PENDING',
        feedbackNote: 'Khách là sinh viên năm nhất ĐH Ngoại Thương đi cùng phụ huynh. Đã gọi điện xác nhận giờ đón tiếp sáng mai.',
        hostOrStaff: 'Chủ nhà trực tiếp (Cô Lan)',
        createdAt: '2026-10-16T14:15:00Z',
    },
    {
        id: 'view-005',
        tenantName: 'Đặng Thảo Vy',
        tenantPhone: '0977 112 233',
        tenantEmail: 'thaovy.dang@gmail.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-101',
        roomName: 'Phòng Tiện Nghi Giờ Tự Do An Ninh P.101',
        rentalId: 'rental-q3-04',
        rentalTitle: 'Nhà trọ Xanh HexRoom Quận 3',
        rentalAddress: '210/12 Cách Mạng Tháng 8, P.10, Quận 3, TP.HCM',
        appointmentDate: '2026-10-19',
        appointmentTimeSlot: '18:00 - 19:00',
        status: 'CONFIRMED',
        outcome: 'PENDING',
        feedbackNote: 'Khách làm việc văn phòng tại Quận 1, xem phòng sau giờ tan làm. Cần phòng yên tĩnh và có tủ lạnh.',
        hostOrStaff: 'Quản lý tòa nhà (A. Tuấn)',
        createdAt: '2026-10-17T08:30:00Z',
    },
    {
        id: 'view-006',
        tenantName: 'Hoàng Thị Bích Ngọc',
        tenantPhone: '0903 555 777',
        tenantEmail: 'bichngoc.hoang@gmail.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-105',
        roomName: 'Phòng Duplex Gác Lửng Trần Cao P.105',
        rentalId: 'rental-q10-02',
        rentalTitle: 'Nhà trọ Cao cấp HexRoom Quận 10',
        rentalAddress: '452/8 Sư Vạn Hạnh, P.12, Quận 10, TP.HCM',
        appointmentDate: '2026-10-12',
        appointmentTimeSlot: '15:30 - 16:30',
        visitedAt: '12/10/2026 15:35',
        status: 'COMPLETED',
        outcome: 'DEPOSIT_PAID',
        feedbackNote: 'Khách ưng ý khóa cửa vân tay và môi trường sạch sẽ. Đã đặt cọc 1 tháng tiền phòng 4.800.000đ ngay tại buổi xem.',
        hostOrStaff: 'Chủ nhà trực tiếp (Cô Lan)',
        ratingFromTenant: 5.0,
        depositAmount: 4800000,
        createdAt: '2026-10-10T10:00:00Z',
    },
    {
        id: 'view-007',
        tenantName: 'Phạm Quỳnh Anh',
        tenantPhone: '0933 888 999',
        tenantEmail: 'quynhanh.pham@outlook.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-204',
        roomName: 'Studio Full Nội Thất Hiện Đại P.204',
        rentalId: 'rental-td-05',
        rentalTitle: 'HexRoom Studio Khu Công Nghệ Cao Thủ Đức',
        rentalAddress: '15 Đường D1, P. Tăng Nhơn Phú B, TP. Thủ Đức, TP.HCM',
        appointmentDate: '2026-10-14',
        appointmentTimeSlot: '14:30 - 15:30',
        visitedAt: '14/10/2026 14:40',
        status: 'COMPLETED',
        outcome: 'NOT_SUITABLE',
        feedbackNote: 'Khách có 2 xe máy cần chỗ để rộng rãi hơn, tầng trệt giờ cao điểm đông xe nên khách tìm chỗ có hầm rộng.',
        hostOrStaff: 'Điều phối viên HexRoom (Hương)',
        ratingFromTenant: 4.0,
        createdAt: '2026-10-12T13:45:00Z',
    },
    {
        id: 'view-008',
        tenantName: 'Bùi Anh Tuấn',
        tenantPhone: '0966 223 344',
        tenantEmail: 'anhtuan.bui@gmail.com',
        tenantAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
        roomId: 'room-302',
        roomName: 'Phòng Studio Ban Công Thoáng Mát P.302',
        rentalId: 'rental-bt-01',
        rentalTitle: 'Căn hộ Dịch vụ HexHome Bình Thạnh',
        rentalAddress: '124/18 Xô Viết Nghệ Tĩnh, P.21, Q. Bình Thạnh, TP.HCM',
        appointmentDate: '2026-10-13',
        appointmentTimeSlot: '14:00 - 15:00',
        status: 'NO_SHOW',
        outcome: 'NOT_SUITABLE',
        feedbackNote: 'Khách báo bận chuyến công tác đột xuất ở Vũng Tàu, đã gửi tin nhắn xin lỗi và hẹn sẽ liên hệ lại tháng sau.',
        hostOrStaff: 'Chủ nhà trực tiếp (Cô Lan)',
        createdAt: '2026-10-11T16:20:00Z',
    },
];

export function getViewingHistory(): RoomViewingAppointment[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_VIEWING_HISTORY));
            return INITIAL_VIEWING_HISTORY;
        }
        return JSON.parse(raw);
    } catch {
        return INITIAL_VIEWING_HISTORY;
    }
}

export function saveViewingAppointment(newApp: Partial<RoomViewingAppointment>): RoomViewingAppointment {
    const list = getViewingHistory();
    const created: RoomViewingAppointment = {
        id: `view-${Date.now()}`,
        tenantName: newApp.tenantName || 'Khách xem phòng',
        tenantPhone: newApp.tenantPhone || '0900 000 000',
        tenantEmail: newApp.tenantEmail,
        tenantAvatar: newApp.tenantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
        roomId: newApp.roomId || 'room-unknown',
        roomName: newApp.roomName || 'Phòng trọ HexRoom',
        rentalId: newApp.rentalId,
        rentalTitle: newApp.rentalTitle || 'Nhà trọ HexRoom',
        rentalAddress: newApp.rentalAddress || 'TP. Hồ Chí Minh',
        appointmentDate: newApp.appointmentDate || new Date().toISOString().split('T')[0],
        appointmentTimeSlot: newApp.appointmentTimeSlot || '14:00 - 16:00',
        status: newApp.status || 'CONFIRMED',
        outcome: newApp.outcome || 'PENDING',
        feedbackNote: newApp.feedbackNote || 'Yêu cầu hẹn coi phòng đặt qua HexRoom',
        hostOrStaff: newApp.hostOrStaff || 'Chủ nhà trực tiếp',
        createdAt: new Date().toISOString(),
        ...newApp,
    };

    const updated = [created, ...list];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save viewing appointment:', e);
    }
    return created;
}

export function updateViewingAppointment(
    id: string,
    updates: Partial<RoomViewingAppointment>
): RoomViewingAppointment[] {
    const list = getViewingHistory();
    const updated = list.map((item) => {
        if (item.id === id) {
            return {
                ...item,
                ...updates,
                visitedAt: updates.status === 'COMPLETED' && !item.visitedAt
                    ? new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : item.visitedAt,
            };
        }
        return item;
    });

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to update viewing appointment:', e);
    }
    return updated;
}

export function getViewingStats(list?: RoomViewingAppointment[]) {
    const items = list || getViewingHistory();
    const total = items.length;
    const completed = items.filter((i) => i.status === 'COMPLETED').length; // Đã tới coi
    const upcoming = items.filter((i) => i.status === 'CONFIRMED' || i.status === 'PENDING').length;
    const depositPaid = items.filter((i) => i.outcome === 'DEPOSIT_PAID').length;
    const considering = items.filter((i) => i.outcome === 'CONSIDERING' || i.outcome === 'FOLLOW_UP').length;
    const noShowOrCancelled = items.filter((i) => i.status === 'CANCELLED' || i.status === 'NO_SHOW').length;

    const conversionRate = completed > 0 ? ((depositPaid / completed) * 100).toFixed(1) : '0';

    const ratedItems = items.filter((i) => typeof i.ratingFromTenant === 'number');
    const avgRating = ratedItems.length > 0
        ? (ratedItems.reduce((acc, cur) => acc + (cur.ratingFromTenant || 0), 0) / ratedItems.length).toFixed(1)
        : '5.0';

    return {
        total,
        completed,
        upcoming,
        depositPaid,
        considering,
        noShowOrCancelled,
        conversionRate,
        avgRating,
    };
}
