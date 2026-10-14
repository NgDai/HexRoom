import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Card,
    Col,
    Row,
    Statistic,
    Spin,
    Typography,
    Tag,
    Badge,
    Avatar,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileSearchOutlined,
    FlagOutlined,
    StarOutlined,
    WarningOutlined,
    ClockCircleOutlined,
    AuditOutlined,
    SafetyOutlined,
    TeamOutlined,
    SolutionOutlined,
    DashboardOutlined,
} from '@ant-design/icons';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    getModeratorOverview,
    listModerationHistory,
} from './shared/moderator-storage';
import type { ModerationHistoryRecord } from './shared/types';

const { Title, Text } = Typography;

interface OverviewState {
    openQueueCount: number;
    pendingRentalCount: number;
    pendingRoomPostCount: number;
    openReportCount: number;
    flaggedReviewCount: number;
    resolvedReportCount: number;
    approvedRentalCount: number;
    approvedRoomPostCount: number;
    approvedReviewCount: number;
    rejectedReviewCount: number;
}

const initialOverview: OverviewState = {
    openQueueCount: 0,
    pendingRentalCount: 0,
    pendingRoomPostCount: 0,
    openReportCount: 0,
    flaggedReviewCount: 0,
    resolvedReportCount: 0,
    approvedRentalCount: 0,
    approvedRoomPostCount: 0,
    approvedReviewCount: 0,
    rejectedReviewCount: 0,
};

const quickLinks = [
    {
        title: 'Moderation Queue',
        titleVi: 'Hàng đợi duyệt',
        path: '/moderator/queue',
        key: 'openQueueCount' as const,
        icon: <AuditOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
        color: '#1677ff',
        bgColor: '#e6f4ff',
    },
    {
        title: 'Moderate Rental List',
        titleVi: 'Duyệt nhà cho thuê',
        path: '/moderator/rentals',
        key: 'pendingRentalCount' as const,
        icon: <SolutionOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
        color: '#722ed1',
        bgColor: '#f9f0ff',
    },
    {
        title: 'Moderate Room Post List',
        titleVi: 'Duyệt bài đăng phòng',
        path: '/moderator/room-posts',
        key: 'pendingRoomPostCount' as const,
        icon: <FileSearchOutlined style={{ fontSize: 24, color: '#13c2c2' }} />,
        color: '#13c2c2',
        bgColor: '#e6fffb',
    },
    {
        title: 'Handle Reports',
        titleVi: 'Báo cáo vi phạm',
        path: '/moderator/reports',
        key: 'openReportCount' as const,
        icon: <FlagOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />,
        color: '#ff4d4f',
        bgColor: '#fff2f0',
    },
    {
        title: 'Moderate Reviews',
        titleVi: 'Duyệt đánh giá',
        path: '/moderator/reviews',
        key: 'flaggedReviewCount' as const,
        icon: <StarOutlined style={{ fontSize: 24, color: '#faad14' }} />,
        color: '#faad14',
        bgColor: '#fffbe6',
    },
] as const;

const actionColors: Record<string, string> = {
    APPROVE: 'green',
    REJECT: 'red',
    HIDE: 'orange',
    DISMISS: 'gray',
    BAN: 'red',
    SUSPEND: 'orange',
    UNSUSPEND: 'blue',
    CLAIM: 'blue',
    RELEASE: 'default',
    RESOLVE: 'green',
    approve_listing: 'green',
    reject_listing: 'red',
    approve_room_post: 'green',
    reject_room_post: 'red',
    warning: 'orange',
    remove_content: 'red',
    restrict_content: 'orange',
    dismiss_report: 'default',
};

const targetTypeIcon: Record<string, React.ReactNode> = {
    rental: <SolutionOutlined />,
    room_post: <FileSearchOutlined />,
    report: <FlagOutlined />,
    review: <StarOutlined />,
    user: <TeamOutlined />,
};

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
        APPROVE: 'Duyệt',
        REJECT: 'Từ chối',
        HIDE: 'Ẩn',
        DISMISS: 'Bỏ qua',
        BAN: 'Ban',
        SUSPEND: 'Khóa',
        UNSUSPEND: 'Mở khóa',
        CLAIM: 'Nhận',
        RELEASE: 'Trả',
        RESOLVE: 'Giải quyết',
        approve_listing: 'Duyệt nhà',
        reject_listing: 'Từ chối nhà',
        approve_room_post: 'Duyệt phòng',
        reject_room_post: 'Từ chối phòng',
        warning: 'Cảnh báo',
        remove_content: 'Xóa nội dung',
        restrict_content: 'Hạn chế',
        dismiss_report: 'Bỏ qua báo cáo',
    };
    return labels[action] ?? action;
}

function getTargetTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        rental: 'Nhà cho thuê',
        room_post: 'Bài đăng phòng',
        report: 'Báo cáo',
        review: 'Đánh giá',
        user: 'Người dùng',
    };
    return labels[type] ?? type;
}

export function ModeratorDashboardPage() {
    const [overview, setOverview] = useState<OverviewState>(initialOverview);
    const [history, setHistory] = useState<ModerationHistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [overviewData, historyData] = await Promise.all([
                    getModeratorOverview(),
                    listModerationHistory(),
                ]);
                if (!active) return;

                setOverview(overviewData as OverviewState);
                setHistory(historyData.slice(0, 10));
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
                setHistory([]);
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
                <p style={{ marginTop: 16, color: '#666' }}>Đang tải dữ liệu...</p>
            </div>
        );
    }

    // Chart data
    const reportStatusData = [
        { name: 'Đang mở', value: overview.openReportCount, fill: '#ff4d4f' },
        { name: 'Đã giải quyết', value: overview.resolvedReportCount, fill: '#52c41a' },
    ];

    const reviewStatusData = [
        { name: 'Chờ duyệt', value: overview.flaggedReviewCount },
        { name: 'Đã duyệt', value: overview.approvedReviewCount },
        { name: 'Từ chối/Ẩn', value: overview.rejectedReviewCount },
    ];

    const queueSummaryData = [
        { name: 'Queue mở', value: overview.openQueueCount },
        { name: 'Nhà chờ', value: overview.pendingRentalCount },
        { name: 'Phòng chờ', value: overview.pendingRoomPostCount },
        { name: 'Báo cáo', value: overview.openReportCount },
        { name: 'Đánh giá', value: overview.flaggedReviewCount },
    ];

    const CHART_COLORS = ['#52c41a', '#722ed1', '#ff4d4f', '#faad14', '#13c2c2'];

    return (
        <div>
            <Title level={2} style={{ marginBottom: 4 }}>
                <DashboardOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                Moderator Dashboard
            </Title>
            <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                Tổng quan quản lý nội dung và kiểm duyệt hệ thống
            </Text>

            {error && (
                <Card style={{ marginBottom: 16, borderColor: '#ffccc7', backgroundColor: '#fff2f0' }}>
                    <Text type="danger">
                        <WarningOutlined style={{ marginRight: 8 }} />
                        Không thể tải một phần dữ liệu: {error}
                    </Text>
                </Card>
            )}

            {/* Quick Action Cards */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {quickLinks.map((item) => (
                    <Col xs={24} sm={12} lg={8} xl={8} key={item.path}>
                        <Link to={item.path} style={{ textDecoration: 'none' }}>
                            <Card
                                hoverable
                                variant="borderless"
                                style={{
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    borderRadius: 12,
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 12,
                                        backgroundColor: item.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {item.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{item.titleVi}</Text>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                                            <span style={{ fontSize: 32, fontWeight: 700, color: item.color, lineHeight: 1 }}>
                                                {overview[item.key]}
                                            </span>
                                            <Text type="secondary" style={{ fontSize: 12 }}>đang chờ</Text>
                                        </div>
                                    </div>
                                    <Badge
                                        count={overview[item.key]}
                                        style={{ backgroundColor: item.color }}
                                        overflowCount={99}
                                    />
                                </div>
                            </Card>
                        </Link>
                    </Col>
                ))}
            </Row>

            {/* Summary Status Row */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Nhà đã duyệt"
                            value={overview.approvedRentalCount}
                            prefix={<CheckCircleOutlined />}
                            styles={{ content: { color: '#52c41a', fontSize: 20 } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Phòng đã duyệt"
                            value={overview.approvedRoomPostCount}
                            prefix={<CheckCircleOutlined />}
                            styles={{ content: { color: '#13c2c2', fontSize: 20 } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Báo cáo đã xử lý"
                            value={overview.resolvedReportCount}
                            prefix={<SafetyOutlined />}
                            styles={{ content: { color: '#52c41a', fontSize: 20 } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Đánh giá từ chối"
                            value={overview.rejectedReviewCount}
                            prefix={<CloseCircleOutlined />}
                            styles={{ content: { color: '#ff4d4f', fontSize: 20 } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span>
                                <SolutionOutlined style={{ marginRight: 8 }} />
                                Trạng thái duyệt Nhà / Phòng
                            </span>
                        }
                        variant="borderless"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                    >
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={[
                                { name: 'Nhà cho thuê', 'Đã duyệt': overview.approvedRentalCount, 'Chờ duyệt': overview.pendingRentalCount },
                                { name: 'Bài đăng phòng', 'Đã duyệt': overview.approvedRoomPostCount, 'Chờ duyệt': overview.pendingRoomPostCount },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Đã duyệt" fill="#52c41a" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Chờ duyệt" fill="#722ed1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span>
                                <FlagOutlined style={{ marginRight: 8 }} />
                                Phân bổ tác vụ kiểm duyệt
                            </span>
                        }
                        variant="borderless"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                    >
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={queueSummaryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                    outerRadius={100}
                                    dataKey="value"
                                >
                                    {queueSummaryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Report & Review Status */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span>
                                <WarningOutlined style={{ marginRight: 8 }} />
                                Trạng thái Báo cáo vi phạm
                            </span>
                        }
                        variant="borderless"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                    >
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={reportStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                >
                                    {reportStatusData.map((entry, index) => (
                                        <Cell key={`cell-r-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span>
                                <StarOutlined style={{ marginRight: 8 }} />
                                Trạng thái Đánh giá
                            </span>
                        }
                        variant="borderless"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                    >
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={reviewStatusData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip />
                                <Bar dataKey="value" name="Số lượng" radius={[0, 4, 4, 0]}>
                                    {reviewStatusData.map((_, index) => (
                                        <Cell key={`cell-rv-${index}`} fill={['#faad14', '#52c41a', '#ff4d4f'][index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Recent Moderation History */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24}>
                    <Card
                        title={
                            <span>
                                <ClockCircleOutlined style={{ marginRight: 8 }} />
                                Lịch sử Kiểm duyệt gần đây
                            </span>
                        }
                        variant="borderless"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                        extra={
                            <Link to="/moderator/queue" style={{ fontSize: 13 }}>
                                Xem tất cả →
                            </Link>
                        }
                    >
                        {history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
                                <AuditOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                                <p>Chưa có hành động kiểm duyệt nào.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {history.map((item, idx) => (
                                    <div
                                        key={item.history_id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 12,
                                            padding: '12px 0',
                                            borderBottom: idx < history.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        }}
                                    >
                                        <Avatar
                                            size={36}
                                            icon={targetTypeIcon[item.target_type] ?? <AuditOutlined />}
                                            style={{
                                                backgroundColor:
                                                    item.target_type === 'rental' ? '#e6f4ff' :
                                                        item.target_type === 'room_post' ? '#e6fffb' :
                                                            item.target_type === 'report' ? '#fff2f0' :
                                                                item.target_type === 'review' ? '#fffbe6' : '#f0f0ff',
                                                color:
                                                    item.target_type === 'rental' ? '#1677ff' :
                                                        item.target_type === 'room_post' ? '#13c2c2' :
                                                            item.target_type === 'report' ? '#ff4d4f' :
                                                                item.target_type === 'review' ? '#faad14' : '#722ed1',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <Tag color={actionColors[item.action] ?? 'default'} style={{ margin: 0 }}>
                                                    {getActionLabel(item.action)}
                                                </Tag>
                                                <Text style={{ fontSize: 13 }}>
                                                    trên <strong>{getTargetTypeLabel(item.target_type)}</strong>
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    ({item.target_id.slice(0, 8)}...)
                                                </Text>
                                            </div>
                                            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Bởi <strong>{item.moderator_id}</strong>
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>·</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                    {formatDateTime(item.created_at)}
                                                </Text>
                                            </div>
                                            {item.note && (
                                                <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 2, display: 'block' }}>
                                                    "{item.note}"
                                                </Text>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
