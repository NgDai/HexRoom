import { useState } from 'react';
import { Avatar, Button, Dropdown, Modal, Tooltip, message } from 'antd';
import {
    UserOutlined,
    StarFilled,
    ShareAltOutlined,
    PlusOutlined,
    CalendarOutlined,
    PhoneOutlined,
    MoreOutlined,
    WarningOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import { createReportRequest } from '@/lib/api';

interface LandlordProfileHeaderProps {
    landlordId: string;
    user: {
        fullName: string;
        avatarUrl: string | null;
        phone: string | null;
        createdAt: string;
    };
    stats: {
        totalRentals: number;
        activeRentals: number;
        totalRooms: number;
        availableRooms: number;
        totalReviews: number;
        avgRating: number;
    };
}

function getJoinDuration(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} năm`);
    if (months > 0) parts.push(`${months} tháng`);
    return parts.length > 0 ? parts.join(' ') : 'Mới tham gia';
}

function getSatisfactionLabel(avg: number): string {
    if (avg >= 4.5) return 'Rất hài lòng';
    if (avg >= 3.5) return 'Hài lòng';
    if (avg >= 2.5) return 'Bình thường';
    if (avg >= 1.5) return 'Không hài lòng';
    return 'Rất không hài lòng';
}

export function LandlordProfileHeader({ landlordId, user, stats }: LandlordProfileHeaderProps) {
    const joinDuration = getJoinDuration(user.createdAt);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportStep, setReportStep] = useState<1 | 2>(1);
    const [selectedReason, setSelectedReason] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const VIOLATION_OPTIONS = [
        'Hình đại diện sai phạm',
        'Thông tin cá nhân sai phạm',
        'Người bán có dấu hiệu lừa đảo',
        'Lý do khác',
    ];

    const resetReport = () => {
        setReportStep(1);
        setSelectedReason('');
        setReportDesc('');
    };

    const handleSelectReason = (reason: string) => {
        setSelectedReason(reason);
        setReportStep(2);
    };

    const handleSubmitReport = async () => {
        if (!reportDesc.trim()) {
            messageApi.warning('Vui lòng mô tả dấu hiệu sai phạm');
            return;
        }

        setIsSubmittingReport(true);
        try {
            await createReportRequest({
                targetType: 'USER',
                targetId: landlordId,
                reason: selectedReason,
                description: reportDesc.trim(),
            });
            setReportModalOpen(false);
            resetReport();
            messageApi.success('Đã gửi báo cáo vi phạm. Cảm ơn bạn!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Gửi báo cáo thất bại';
            messageApi.error(msg);
        } finally {
            setIsSubmittingReport(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Banner gradient */}
            <div className="h-28 sm:h-36 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 relative">
                <div className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* Profile info */}
            <div className="px-4 sm:px-6 lg:px-8 pb-6 -mt-12 sm:-mt-14 relative">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {user.avatarUrl ? (
                            <Avatar
                                src={user.avatarUrl}
                                size={88}
                                className="ring-4 ring-card shadow-lg"
                            />
                        ) : (
                            <Avatar
                                icon={<UserOutlined />}
                                size={88}
                                className="ring-4 ring-card shadow-lg bg-primary/10 text-primary"
                            />
                        )}
                    </div>

                    {/* Name & meta */}
                    <div className="flex-1 min-w-0 pb-1">
                        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-1 truncate">
                            {user.fullName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                                Đang hoạt động
                            </span>
                            {user.phone && (
                                <span className="flex items-center gap-1">
                                    <PhoneOutlined className="text-xs" />
                                    {user.phone}
                                </span>
                            )}
                        </div>

                        {/* Rating + join info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm">
                            {stats.totalReviews > 0 ? (
                                <Tooltip title={`${stats.avgRating} / 5 (${stats.totalReviews} đánh giá)`}>
                                    <span className="flex items-center gap-1 cursor-default">
                                        <StarFilled className="text-amber-500" />
                                        <span className="font-semibold text-foreground">{stats.avgRating}</span>
                                        <span className="text-primary hover:underline">
                                            ({stats.totalReviews} đánh giá)
                                        </span>
                                    </span>
                                </Tooltip>
                            ) : (
                                <span className="text-muted-foreground">Chưa có đánh giá</span>
                            )}
                            <span className="text-muted-foreground flex items-center gap-1">
                                <CalendarOutlined className="text-xs" />
                                Đã tham gia: {joinDuration}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 sm:pb-1">
                        <Button
                            icon={<ShareAltOutlined />}
                            className="rounded-full border-border hover:border-primary"
                            onClick={() => {
                                navigator.clipboard?.writeText(window.location.href);
                            }}
                        >
                            Chia sẻ
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            className="rounded-full shadow-sm"
                        >
                            Theo dõi
                        </Button>
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'report',
                                        icon: <WarningOutlined />,
                                        label: 'Báo cáo vi phạm',
                                        onClick: () => setReportModalOpen(true),
                                    },
                                ],
                            }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Button
                                icon={<MoreOutlined />}
                                className="rounded-full border-border hover:border-primary w-10 h-10 flex items-center justify-center"
                            />
                        </Dropdown>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-6 mt-5 pt-4 border-t border-border">
                    <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{stats.activeRentals}</div>
                        <div className="text-xs text-muted-foreground">Dự án</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-primary">{stats.availableRooms}</div>
                        <div className="text-xs text-muted-foreground">Phòng trống</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{stats.totalReviews}</div>
                        <div className="text-xs text-muted-foreground">Đánh giá</div>
                    </div>
                    {stats.totalReviews > 0 && (
                        <div className="text-center">
                            <div className="text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
                                <StarFilled className="text-sm" />
                                {stats.avgRating}
                            </div>
                            <div className="text-xs text-muted-foreground">{getSatisfactionLabel(stats.avgRating)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Violation Modal */}
            {contextHolder}
            <Modal
                open={reportModalOpen}
                onCancel={() => { setReportModalOpen(false); resetReport(); }}
                footer={null}
                title={
                    <div className="text-center text-base font-semibold border-b border-border pb-3">
                        Báo cáo vi phạm
                    </div>
                }
                centered
                width={420}
                className="[&_.ant-modal-header]:!mb-0 [&_.ant-modal-body]:!pt-4"
            >
                {reportStep === 1 ? (
                    /* Step 1: Pick violation reason */
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground mb-3">
                            Người bán này có vấn đề gì
                        </p>
                        {VIOLATION_OPTIONS.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => handleSelectReason(opt)}
                                className="w-full text-left px-4 py-3 rounded-lg border border-border text-sm text-foreground hover:border-primary hover:bg-primary/5 transition-all"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                ) : (
                    /* Step 2: Description form */
                    <div className="space-y-4">
                        {/* Selected reason badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Lý do:</span>
                            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                {selectedReason}
                            </span>
                        </div>

                        {/* Description */}
                        <div>
                            <textarea
                                placeholder="Mô tả chi tiết dấu hiệu sai phạm *"
                                value={reportDesc}
                                onChange={(e) => setReportDesc(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none transition-colors"
                            />
                        </div>

                        {/* Privacy note */}
                        <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground">
                            🔒 Thông tin của bạn được bảo mật, chủ nhà sẽ không biết ai đã báo cáo.
                        </div>

                        {/* Submit button */}
                        <button
                            type="button"
                            onClick={handleSubmitReport}
                            disabled={isSubmittingReport}
                            className="w-full py-3 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-foreground font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            {isSubmittingReport && <LoadingOutlined />}
                            {isSubmittingReport ? 'Đang gửi...' : 'Báo cáo vi phạm'}
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
