import { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Input,
    Select,
    Button,
    Space,
    Tag,
    Modal,
    message,
    Typography,
    Popconfirm,
    Descriptions,
    Statistic,
    Row,
    Col,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
    SearchOutlined,
    EyeOutlined,
    DeleteOutlined,
    HomeOutlined,
} from '@ant-design/icons';
import {
    getRentals,
    getRentalById,
    updateRentalStatus,
    deleteRental,
    getRentalStats,
    type Rental,
    type RentalStats,
    type PaginationInfo,
} from './shared/admin-api';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;
const { Option } = Select;

const STATUS_OPTIONS = [
    { value: 'AVAILABLE', color: 'success' },
    { value: 'UNAVAILABLE', color: 'processing' },
    { value: 'HIDDEN', color: 'default' },
    { value: 'VIOLATE', color: 'error' },
    { value: 'PENDING', color: 'warning' },
    { value: 'SUSPEND', color: 'default' },
];

export function AdminRentalsPage() {
    const { t } = useTranslation();
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [stats, setStats] = useState<RentalStats | null>(null);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();

    // Detail Modal
    const [viewingRental, setViewingRental] = useState<Rental | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Initial load and filter changes
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            const [rentalsResult, statsData] = await Promise.all([
                getRentals({
                    page: 1,
                    limit: 10,
                    search: appliedSearch || undefined,
                    status: statusFilter,
                }),
                getRentalStats(),
            ]);
            if (!cancelled) {
                setRentals(rentalsResult.data);
                setPagination(rentalsResult.pagination);
                setStats(statsData);
                setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [appliedSearch, statusFilter]);

    const loadRentals = async (page = 1) => {
        setLoading(true);
        const result = await getRentals({
            page,
            limit: 10,
            search: appliedSearch || undefined,
            status: statusFilter,
        });
        setRentals(result.data);
        setPagination(result.pagination);
        setLoading(false);
    };

    const refreshStats = async () => {
        const data = await getRentalStats();
        setStats(data);
    };

    const handleSearch = () => {
        setAppliedSearch(search);
    };

    const handleTableChange = (pag: TablePaginationConfig) => {
        loadRentals(pag.current || 1);
    };

    const handleViewDetail = async (rental: Rental) => {
        setDetailLoading(true);
        try {
            const detail = await getRentalById(rental.id);
            setViewingRental(detail);
        } catch {
            message.error(t('admin.rentals.messages.loadDetailFailed'));
        }
        setDetailLoading(false);
    };

    const statusLabel = (status: string) => t(`admin.rentals.status.${status}`);

    const handleStatusChange = async (rentalId: string, newStatus: string) => {
        const result = await updateRentalStatus(rentalId, newStatus);
        if (result.success) {
            message.success(result.message);
            loadRentals(pagination.page);
            refreshStats();
        } else {
            message.error(result.message);
        }
    };

    const handleDelete = async (rental: Rental) => {
        const result = await deleteRental(rental.id);
        if (result.success) {
            message.success(result.message);
            loadRentals(pagination.page);
            refreshStats();
        } else {
            message.error(result.message);
        }
    };

    const columns: ColumnsType<Rental> = [
        {
            title: t('admin.rentals.table.title'),
            dataIndex: 'title',
            key: 'title',
            render: (title) => (
                <div style={{ maxWidth: 200 }}>
                    <div style={{ fontWeight: 500 }}>{title}</div>
                </div>
            ),
        },
        {
            title: t('admin.rentals.table.owner'),
            key: 'owner',
            render: (_, record) => record.owner?.fullName || '-',
        },
        {
            title: t('admin.rentals.table.roomCount'),
            key: 'roomCount',
            render: (_, record) => record.roomCount || record.rooms?.length || 0,
        },
        {
            title: t('admin.rentals.table.location'),
            key: 'location',
            render: (_, record) => {
                const loc = record.location;
                if (!loc) return '-';
                return `${loc.address || ''}${loc.district ? ', ' + loc.district : ''}`;
            },
        },
        {
            title: t('admin.rentals.table.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                return (
                    <Select
                        value={status}
                        onChange={(val) => handleStatusChange(record.id, val)}
                        style={{ width: 140 }}
                        size="small"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <Option key={opt.value} value={opt.value}>
                                <Tag color={opt.color}>{statusLabel(opt.value)}</Tag>
                            </Option>
                        ))}
                    </Select>
                );
            },
        },
        {
            title: t('admin.rentals.table.actions'),
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                        loading={detailLoading}
                        title={t('admin.rentals.actions.viewDetail')}
                    />
                    <Popconfirm
                        title={t('admin.rentals.actions.confirmDeleteTitle')}
                        description={t('admin.rentals.actions.confirmDeleteDescription')}
                        onConfirm={() => handleDelete(record)}
                        okText={t('admin.rentals.actions.delete')}
                        cancelText={t('admin.rentals.actions.cancel')}
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title={t('admin.rentals.actions.delete')}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={2}>{t('admin.rentals.title')}</Title>

            {/* Stats */}
            {stats && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col xs={12} sm={8} lg={4}>
                        <Card>
                            <Statistic
                                title={t('admin.rentals.stats.total')}
                                value={stats.total}
                                prefix={<HomeOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                        <Card>
                            <Statistic
                                title={statusLabel('AVAILABLE')}
                                value={stats.byStatus.available || 0}
                                styles={{ content: { color: '#52c41a' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                        <Card>
                            <Statistic
                                title={statusLabel('UNAVAILABLE')}
                                value={stats.byStatus.unavailable || 0}
                                styles={{ content: { color: '#1890ff' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                        <Card>
                            <Statistic
                                title={statusLabel('PENDING')}
                                value={stats.byStatus.pending || 0}
                                styles={{ content: { color: '#faad14' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                        <Card>
                            <Statistic
                                title={statusLabel('VIOLATE')}
                                value={stats.byStatus.violate || 0}
                                styles={{ content: { color: '#ff4d4f' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                        <Card>
                            <Statistic
                                title={statusLabel('HIDDEN')}
                                value={stats.byStatus.hidden || 0}
                                styles={{ content: { color: '#999' } }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        placeholder={t('admin.rentals.filters.searchPlaceholder')}
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 280 }}
                        allowClear
                    />
                    <Select
                        placeholder={t('admin.rentals.filters.statusPlaceholder')}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 180 }}
                        allowClear
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <Option key={opt.value} value={opt.value}>
                                {statusLabel(opt.value)}
                            </Option>
                        ))}
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                        {t('admin.rentals.filters.searchButton')}
                    </Button>
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={rentals}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: false,
                        showTotal: (total) => t('admin.rentals.totalText', { total }),
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Detail Modal */}
            <Modal
                title={viewingRental?.title}
                open={!!viewingRental}
                onCancel={() => setViewingRental(null)}
                footer={null}
                width={700}
            >
                {viewingRental && (
                    <div>
                        <Descriptions
                            bordered
                            column={2}
                            style={{ marginTop: 16 }}
                            size="small"
                        >
                            <Descriptions.Item label={t('admin.rentals.detail.owner')}>
                                {viewingRental.owner?.fullName || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.rentals.detail.phone')}>
                                {viewingRental.owner?.phone || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.rentals.detail.location')} span={2}>
                                {viewingRental.location?.address || '-'}
                                {viewingRental.location?.district && `, ${viewingRental.location.district}`}
                                {viewingRental.location?.city && `, ${viewingRental.location.city}`}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.rentals.detail.roomCount')}>
                                {viewingRental.roomCount || viewingRental.rooms?.length || 0}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.rentals.detail.status')}>
                                <Tag color={STATUS_OPTIONS.find(s => s.value === viewingRental.status)?.color}>
                                    {statusLabel(viewingRental.status)}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.rentals.detail.description')} span={2}>
                                {viewingRental.description || '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
}
