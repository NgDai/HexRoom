import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Row, Select, Space, Statistic, Spin, Typography } from 'antd';
import { Link } from 'react-router-dom';
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    CheckCircleOutlined,
    DollarOutlined,
    FireOutlined,
    HomeOutlined,
    LineChartOutlined,
    MinusOutlined,
    PercentageOutlined,
    ShoppingCartOutlined,
    StarOutlined,
    StopOutlined,
} from '@ant-design/icons';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { getLandlordDashboardStatsRequest, getLandlordPerformanceMetricsRequest, getMyVipStatusRequest, getTopSearchedRoomsRequest, type LandlordDashboardStats, type LandlordPerformanceMetrics, type TopSearchedRoom, type VipStatusData } from '@/lib/api';

const { Title, Text } = Typography;

type DeltaOptions = {
    inverse?: boolean;
    isPercent?: boolean;
};

function formatMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    return `Tháng ${month}/${year}`;
}

function generateMonthOptions(total: number = 12): Array<{ label: string; value: string }> {
    const options: Array<{ label: string; value: string }> = [];
    const now = new Date();
    for (let i = 0; i < total; i += 1) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = formatMonthKey(monthDate);
        options.push({ label: formatMonthLabel(value), value });
    }
    return options;
}

function renderDelta(current: number, previous: number, options?: DeltaOptions) {
    const diff = current - previous;
    const isIncrease = diff > 0;
    const isDecrease = diff < 0;
    const inverse = options?.inverse ?? false;
    const percentText = options?.isPercent ? '%' : '';
    const directionGood = inverse ? isDecrease : isIncrease;

    let color = '#8c8c8c';
    let icon = <MinusOutlined />;

    if (isIncrease) {
        icon = <ArrowUpOutlined />;
        color = directionGood ? '#52c41a' : '#ff4d4f';
    }

    if (isDecrease) {
        icon = <ArrowDownOutlined />;
        color = directionGood ? '#52c41a' : '#ff4d4f';
    }

    const diffValue = Math.abs(diff).toLocaleString('vi-VN', {
        minimumFractionDigits: options?.isPercent ? 2 : 0,
        maximumFractionDigits: options?.isPercent ? 2 : 0,
    });

    return (
        <Text style={{ color }}>
            {icon} {diff === 0 ? 'Không đổi' : `${isIncrease ? '+' : '-'}${diffValue}${percentText}`}
        </Text>
    );
}

function hasActiveVip(status: VipStatusData | null): boolean {
    if (!status?.isVip) return false;
    if (!status.vipExpiresAt) return false;
    return new Date(status.vipExpiresAt).getTime() > Date.now();
}

export function LandlordDashboardPage() {
    const [allTimeStats, setAllTimeStats] = useState<LandlordDashboardStats | null>(null);
    const [stats, setStats] = useState<LandlordDashboardStats | null>(null);
    const [compareStats, setCompareStats] = useState<LandlordDashboardStats | null>(null);
    const [performance, setPerformance] = useState<LandlordPerformanceMetrics | null>(null);
    const [comparePerformance, setComparePerformance] = useState<LandlordPerformanceMetrics | null>(null);
    const [vipStatus, setVipStatus] = useState<VipStatusData | null>(null);
    const [topSearchedRooms, setTopSearchedRooms] = useState<TopSearchedRoom[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(() => formatMonthKey(new Date()));
    const [compareMonth, setCompareMonth] = useState(() => formatMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const monthOptions = useMemo(() => generateMonthOptions(12), []);
    const isVipActive = useMemo(() => hasActiveVip(vipStatus), [vipStatus]);

    const selectedMonthLabel = formatMonthLabel(selectedMonth);
    const compareMonthLabel = formatMonthLabel(compareMonth);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [vipRes, allTimeStatsRes, statsRes, topSearchRes] = await Promise.all([
                    getMyVipStatusRequest(),
                    getLandlordDashboardStatsRequest(),
                    getLandlordDashboardStatsRequest(selectedMonth),
                    getTopSearchedRoomsRequest(5),
                ]);

                const vipData = vipRes.data;
                const vipEnabled = hasActiveVip(vipData);

                setAllTimeStats(allTimeStatsRes.data);
                setStats(statsRes.data);
                setVipStatus(vipData);
                setTopSearchedRooms(topSearchRes.data.rooms);

                if (vipEnabled) {
                    const [perfRes, compareStatsRes, comparePerfRes] = await Promise.all([
                        getLandlordPerformanceMetricsRequest(selectedMonth),
                        getLandlordDashboardStatsRequest(compareMonth),
                        getLandlordPerformanceMetricsRequest(compareMonth),
                    ]);
                    setPerformance(perfRes.data);
                    setCompareStats(compareStatsRes.data);
                    setComparePerformance(comparePerfRes.data);
                } else {
                    setPerformance(null);
                    setCompareStats(null);
                    setComparePerformance(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedMonth, compareMonth]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
                <p style={{ marginTop: 16 }}>Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (error || !stats || !allTimeStats) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <p style={{ color: 'red', fontSize: 16 }}>{error || 'Không thể tải dữ liệu'}</p>
            </div>
        );
    }

    // Prepare chart data
    const rentalStatusData = [
        {
            name: 'Đang hiển thị',
            current: stats.rentals.byStatus.AVAILABLE,
            previous: compareStats?.rentals.byStatus.AVAILABLE ?? 0,
        },
        {
            name: 'Tạm ngưng',
            current: stats.rentals.byStatus.UNAVAILABLE,
            previous: compareStats?.rentals.byStatus.UNAVAILABLE ?? 0,
        },
        {
            name: 'Đã ẩn',
            current: stats.rentals.byStatus.HIDDEN,
            previous: compareStats?.rentals.byStatus.HIDDEN ?? 0,
        },
        {
            name: 'Vi phạm',
            current: stats.rentals.byStatus.VIOLATE,
            previous: compareStats?.rentals.byStatus.VIOLATE ?? 0,
        },
        {
            name: 'Chờ duyệt',
            current: stats.rentals.byStatus.PENDING,
            previous: compareStats?.rentals.byStatus.PENDING ?? 0,
        },
        {
            name: 'Tạm khóa',
            current: stats.rentals.byStatus.SUSPEND,
            previous: compareStats?.rentals.byStatus.SUSPEND ?? 0,
        },
    ];

    const preorderStatusData = [
        {
            name: 'Chờ xác nhận',
            current: stats.preorders.byStatus.PENDING,
            previous: compareStats?.preorders.byStatus.PENDING ?? 0,
        },
        {
            name: 'Đã duyệt',
            current: stats.preorders.byStatus.CONFIRMED,
            previous: compareStats?.preorders.byStatus.CONFIRMED ?? 0,
        },
        {
            name: 'Đã hủy',
            current: stats.preorders.byStatus.CANCELLED,
            previous: compareStats?.preorders.byStatus.CANCELLED ?? 0,
        },
        {
            name: 'Hết hạn',
            current: stats.preorders.byStatus.EXPIRED,
            previous: compareStats?.preorders.byStatus.EXPIRED ?? 0,
        },
    ];

    const roomStatusData = [
        {
            name: 'Sẵn sàng cho thuê',
            current: stats.rooms.byStatus.AVAILABLE,
            previous: compareStats?.rooms.byStatus.AVAILABLE ?? 0,
        },
        {
            name: 'Đang thuê',
            current: stats.rooms.byStatus.RENTED,
            previous: compareStats?.rooms.byStatus.RENTED ?? 0,
        },
        {
            name: 'Sắp trống',
            current: stats.rooms.byStatus.NEARLY_AVAILABLE,
            previous: compareStats?.rooms.byStatus.NEARLY_AVAILABLE ?? 0,
        },
        {
            name: 'Chờ duyệt',
            current: stats.rooms.byStatus.PENDING,
            previous: compareStats?.rooms.byStatus.PENDING ?? 0,
        },
        {
            name: 'Bảo trì',
            current: stats.rooms.byStatus.MAINTENANCE,
            previous: compareStats?.rooms.byStatus.MAINTENANCE ?? 0,
        },
    ];

    return (
        <div>
            <Title level={2}>Dashboard</Title>
            <Text type="secondary">Tổng quan quản lý nhà cho thuê</Text>
            {isVipActive ? (
                <Row style={{ marginTop: 16 }}>
                    <Col xs={24}>
                        <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <Space size={16} wrap>
                                <div>
                                    <Text strong>Tháng cần xem</Text>
                                    <br />
                                    <Select
                                        value={selectedMonth}
                                        options={monthOptions}
                                        style={{ minWidth: 170, marginTop: 8 }}
                                        onChange={setSelectedMonth}
                                    />
                                </div>
                                <div>
                                    <Text strong>Tháng so sánh</Text>
                                    <br />
                                    <Select
                                        value={compareMonth}
                                        options={monthOptions}
                                        style={{ minWidth: 170, marginTop: 8 }}
                                        onChange={setCompareMonth}
                                    />
                                </div>
                                <Text type="secondary">
                                    Hiện đang so sánh: <strong>{selectedMonthLabel}</strong> với <strong>{compareMonthLabel}</strong>
                                </Text>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Row style={{ marginTop: 16 }}>
                    <Col xs={24}>
                        <Card
                            variant="borderless"
                            style={{
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                border: '1px dashed #d4b106',
                                background: 'linear-gradient(135deg, #fffbe6 0%, #fff 100%)',
                            }}
                        >
                            <Space direction="vertical" size={6}>
                                <Text strong style={{ color: '#ad6800' }}>Tính năng VIP cho Chủ trọ</Text>
                                <Text type="secondary">
                                    Nâng cấp VIP để mở khóa chỉ số hiệu suất nâng cao và so sánh dữ liệu theo tháng.
                                </Text>
                                <Link to="/vip-plans?source=landlord-dashboard">
                                    <Button type="primary">Đăng ký VIP Landlord</Button>
                                </Link>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Main Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Tổng số Nhà cho thuê"
                            value={allTimeStats.rentals.total}
                            prefix={<HomeOutlined style={{ color: '#1677ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Tổng số Phòng trọ"
                            value={allTimeStats.rooms.total}
                            prefix={<HomeOutlined style={{ color: '#722ed1' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Tổng số dư ví"
                            value={Number(allTimeStats.wallet.balance).toLocaleString('vi-VN') + ' đ'}
                            prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                            styles={{ content: { color: '#52c41a', fontSize: 18 } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Tổng đặt cọc"
                            value={allTimeStats.preorders.total}
                            prefix={<ShoppingCartOutlined style={{ color: '#eb2f96' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Feedback Stats */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Tổng đánh giá"
                            value={allTimeStats.feedback.total}
                            prefix={<StarOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Đánh giá trung bình"
                            value={allTimeStats.feedback.averageRating.toFixed(1)}
                            suffix="/ 5"
                            prefix={<StarOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Status breakdown */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Đang hiển thị"
                            value={stats.rentals.byStatus.AVAILABLE}
                            styles={{ content: { fontSize: 20, color: '#52c41a' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Chờ duyệt"
                            value={stats.rentals.byStatus.PENDING}
                            styles={{ content: { fontSize: 20, color: '#722ed1' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Tạm ẩn"
                            value={stats.rentals.byStatus.HIDDEN}
                            styles={{ content: { fontSize: 20, color: '#faad14' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Vi phạm"
                            value={stats.rentals.byStatus.VIOLATE}
                            styles={{ content: { fontSize: 20, color: '#ff4d4f' } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Room status breakdown */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Phòng sẵn sàng"
                            value={stats.rooms.byStatus.AVAILABLE}
                            styles={{ content: { fontSize: 20, color: '#52c41a' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Phòng đang thuê"
                            value={stats.rooms.byStatus.RENTED}
                            styles={{ content: { fontSize: 20, color: '#1677ff' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Phòng sắp trống"
                            value={stats.rooms.byStatus.NEARLY_AVAILABLE}
                            styles={{ content: { fontSize: 20, color: '#fa8c16' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Phòng chờ duyệt"
                            value={stats.rooms.byStatus.PENDING}
                            styles={{ content: { fontSize: 20, color: '#722ed1' } }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={6}>
                    <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Phòng bảo trì"
                            value={stats.rooms.byStatus.MAINTENANCE}
                            styles={{ content: { fontSize: 20, color: '#faad14' } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Performance Metrics */}
            {isVipActive && performance && comparePerformance && (
                <>
                    <Title level={4} style={{ marginTop: 24 }}>Chỉ số Hiệu suất Theo Tháng</Title>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Tỷ lệ chiếm dụng"
                                    value={performance.occupancyRate}
                                    suffix="%"
                                    prefix={<PercentageOutlined style={{ color: '#1677ff' }} />}
                                    styles={{ content: { fontSize: 20 } }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    {renderDelta(performance.occupancyRate, comparePerformance.occupancyRate, { isPercent: true })}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title={`Doanh thu ${selectedMonthLabel}`}
                                    value={Number(performance.revenue.thisMonth).toLocaleString('vi-VN')}
                                    suffix="đ"
                                    prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                                    styles={{ content: { color: '#52c41a', fontSize: 16 } }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    {renderDelta(performance.revenue.thisMonth, comparePerformance.revenue.thisMonth)}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Tỷ lệ hủy đơn"
                                    value={performance.cancellationRate}
                                    suffix="%"
                                    prefix={<LineChartOutlined style={{ color: '#ff4d4f' }} />}
                                    styles={{ content: { fontSize: 20, color: '#ff4d4f' } }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    {renderDelta(performance.cancellationRate, comparePerformance.cancellationRate, { inverse: true, isPercent: true })}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Tỷ lệ xác nhận đặt cọc"
                                    value={performance.conversionRate}
                                    suffix="%"
                                    prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
                                    styles={{ content: { fontSize: 20, color: '#722ed1' } }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    {renderDelta(performance.conversionRate, comparePerformance.conversionRate, { isPercent: true })}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col xs={24}>
                            <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <Text strong>Tổng doanh thu: </Text>
                                <Text style={{ fontSize: 18, color: '#52c41a', fontWeight: 'bold' }}>
                                    {Number(performance.revenue.total).toLocaleString('vi-VN')} đ
                                </Text>
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                                    <Text>
                                        Đơn đang cho thuê: <strong>{performance.bookingStats.active}</strong> |
                                        Đơn đã hủy: <strong>{performance.bookingStats.cancelled}</strong> |
                                        Tổng cộng: <strong>{performance.bookingStats.total}</strong>
                                    </Text>
                                    <div style={{ marginTop: 8 }}>
                                        {renderDelta(performance.bookingStats.total, comparePerformance.bookingStats.total)}
                                        <Text type="secondary" style={{ marginLeft: 8 }}>
                                            so với {compareMonthLabel}
                                        </Text>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}

            {/* Top Searched Rooms */}
            {topSearchedRooms.length > 0 && (
                <>
                    <Title level={4} style={{ marginTop: 24 }}>🔥 Phòng Được Tìm Kiếm Nhiều</Title>
                    <Row gutter={[16, 16]}>
                        {topSearchedRooms.map((room) => (
                            <Col xs={24} sm={12} lg={8} key={room.id}>
                                <Card
                                    hoverable
                                    cover={
                                        room.image ? (
                                            <div style={{ height: 200, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                                                <img
                                                    alt={room.name}
                                                    src={room.image}
                                                    crossOrigin="anonymous"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ height: 200, backgroundColor: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <HomeOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
                                            </div>
                                        )
                                    }
                                    style={{ position: 'relative' }}
                                >
                                    <div style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#ff4d4f', color: 'white', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                        <FireOutlined />
                                        {room.searchCount} lượt tìm
                                    </div>
                                    <Text strong>{room.name}</Text>
                                    <p style={{ margin: '8px 0', fontSize: 12, color: '#999' }}>
                                        {room.location.address}, {room.location.district}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 14, color: '#1677ff', fontWeight: 'bold' }}>
                                            {Number(room.price).toLocaleString('vi-VN')} đ
                                        </Text>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </>
            )}

            {isVipActive ? (
                <>
                    {/* Charts */}
                    <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <span>
                                        <HomeOutlined /> Trạng thái Nhà cho thuê (so sánh tháng)
                                    </span>
                                }
                                variant="borderless"
                                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                            >
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={rentalStatusData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="current" fill="#1677ff" name={selectedMonthLabel} />
                                        <Bar dataKey="previous" fill="#91caff" name={compareMonthLabel} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <span>
                                        <HomeOutlined /> Trạng thái Phòng trọ (so sánh tháng)
                                    </span>
                                }
                                variant="borderless"
                                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                            >
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={roomStatusData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="current" fill="#52c41a" name={selectedMonthLabel} />
                                        <Bar dataKey="previous" fill="#b7eb8f" name={compareMonthLabel} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <span>
                                        <ShoppingCartOutlined /> Trạng thái Đặt cọc
                                    </span>
                                }
                                variant="borderless"
                                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                            >
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={preorderStatusData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="current" fill="#eb2f96" name={selectedMonthLabel} />
                                        <Bar dataKey="previous" fill="#ffadd2" name={compareMonthLabel} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    </Row>

                    {/* Status summary */}
                    <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                        <Col xs={24}>
                            <Card
                                title={`Tổng hợp biến động trạng thái (${selectedMonthLabel} vs ${compareMonthLabel})`}
                                variant="borderless"
                                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                            >
                                <Row gutter={[16, 16]}>
                                    <Col xs={12} sm={6}>
                                        <Statistic
                                            title="Nhà Available"
                                            value={stats.rentals.byStatus.AVAILABLE}
                                            styles={{ content: { color: '#52c41a' } }}
                                            prefix={<CheckCircleOutlined />}
                                        />
                                        {renderDelta(stats.rentals.byStatus.AVAILABLE, compareStats?.rentals.byStatus.AVAILABLE ?? 0)}
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Statistic
                                            title="Nhà Unavailable"
                                            value={stats.rentals.byStatus.UNAVAILABLE}
                                            styles={{ content: { color: '#1677ff' } }}
                                            prefix={<HomeOutlined />}
                                        />
                                        {renderDelta(stats.rentals.byStatus.UNAVAILABLE, compareStats?.rentals.byStatus.UNAVAILABLE ?? 0)}
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Statistic
                                            title="Nhà Hidden"
                                            value={stats.rentals.byStatus.HIDDEN}
                                            styles={{ content: { color: '#faad14' } }}
                                            prefix={<StopOutlined />}
                                        />
                                        {renderDelta(stats.rentals.byStatus.HIDDEN, compareStats?.rentals.byStatus.HIDDEN ?? 0)}
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Statistic
                                            title="Đơn xác nhận"
                                            value={stats.preorders.byStatus.CONFIRMED}
                                            styles={{ content: { color: '#52c41a' } }}
                                            prefix={<CheckCircleOutlined />}
                                        />
                                        {renderDelta(stats.preorders.byStatus.CONFIRMED, compareStats?.preorders.byStatus.CONFIRMED ?? 0)}
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Statistic
                                            title="Phòng đang thuê"
                                            value={stats.rooms.byStatus.RENTED}
                                            styles={{ content: { color: '#1677ff' } }}
                                            prefix={<HomeOutlined />}
                                        />
                                        {renderDelta(stats.rooms.byStatus.RENTED, compareStats?.rooms.byStatus.RENTED ?? 0)}
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Statistic
                                            title="Phòng sắp trống"
                                            value={stats.rooms.byStatus.NEARLY_AVAILABLE}
                                            styles={{ content: { color: '#fa8c16' } }}
                                            prefix={<HomeOutlined />}
                                        />
                                        {renderDelta(stats.rooms.byStatus.NEARLY_AVAILABLE, compareStats?.rooms.byStatus.NEARLY_AVAILABLE ?? 0)}
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : null}
        </div>
    );
}
