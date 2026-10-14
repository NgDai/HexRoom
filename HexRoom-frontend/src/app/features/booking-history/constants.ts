import type { ReportReason } from './types';

export const REPORT_REASONS: ReportReason[] = [
    {
        value: 'fraud',
        label: 'Lừa đảo / Gian lận',
        description: 'Thông tin sai lệch, giá không đúng',
    },
    {
        value: 'spam',
        label: 'Spam / Quảng cáo',
        description: 'Tin spam, quảng cáo không liên quan',
    },
    {
        value: 'fake-images',
        label: 'Hình ảnh giả mạo',
        description: 'Ảnh không khớp thực tế',
    },
    {
        value: 'unavailable',
        label: 'Phòng không còn trống',
        description: 'Tin cũ, đã cho thuê',
    },
    {
        value: 'inappropriate',
        label: 'Nội dung không phù hợp',
        description: 'Vi phạm quy định cộng đồng',
    },
    {
        value: 'other',
        label: 'Lý do khác',
        description: 'Vấn đề khác',
    },
];

export const RATING_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

export const PROFANITY_WORDS = ['scam', 'lừa đảo', 'tệ hại', 'khốn nạn'];

export const BOOKING_TABS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'active', label: 'Đang thuê' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
] as const;

export type BookingTabValue = (typeof BOOKING_TABS)[number]['value'];
