import { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Input,
    Select,
    Button,
    Space,
    Tag,
    Avatar,
    Modal,
    Drawer,
    Descriptions,
    Spin,
    message,
    Typography,
    Popconfirm,
    Divider,
    Badge,
    List,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
    SearchOutlined,
    UserOutlined,
    EditOutlined,
    StopOutlined,
    CheckOutlined,
    EyeOutlined,
    WalletOutlined,
    HomeOutlined,
    ShoppingCartOutlined,
    HeartOutlined,
    CrownOutlined,
} from '@ant-design/icons';
import {
    getUsers,
    getUserDetail,
    updateUserRole,
    updateUserStatus,
    type User,
    type UserDetail,
    type PaginationInfo,
} from './shared/admin-api';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_OPTIONS = [
    { value: 'ADMIN', color: 'red' },
    { value: 'MODERATOR', color: 'purple' },
    { value: 'LANDLORD', color: 'blue' },
    { value: 'TENANT', color: 'green' },
    { value: 'GUEST', color: 'default' },
];

const STATUS_OPTIONS = [
    { value: 'ACTIVE', color: 'success' },
    { value: 'INACTIVE', color: 'default' },
    { value: 'SUSPENDED', color: 'warning' },
    { value: 'BANNED', color: 'error' },
];

const RENTAL_STATUS_MAP: Record<string, { color: string }> = {
    AVAILABLE: { color: 'success' },
    UNAVAILABLE: { color: 'processing' },
    HIDDEN: { color: 'default' },
    VIOLATE: { color: 'error' },
    PENDING: { color: 'warning' },
    SUSPEND: { color: 'default' },
};

export function AdminUsersPage() {
    const { t, i18n } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
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
    const [roleFilter, setRoleFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();

    // Role edit modal
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState<string>('');
    const [modalLoading, setModalLoading] = useState(false);

    // User detail drawer
    const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Fetch users when filters change
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            const result = await getUsers({
                page: 1,
                limit: 10,
                search: appliedSearch || undefined,
                role: roleFilter,
                status: statusFilter,
            });
            if (!cancelled) {
                setUsers(result.data);
                setPagination(result.pagination);
                setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [appliedSearch, roleFilter, statusFilter]);

    const loadUsers = async (page = 1) => {
        setLoading(true);
        const result = await getUsers({
            page,
            limit: 10,
            search: appliedSearch || undefined,
            role: roleFilter,
            status: statusFilter,
        });
        setUsers(result.data);
        setPagination(result.pagination);
        setLoading(false);
    };

    const handleSearch = () => {
        setAppliedSearch(search);
    };

    const handleTableChange = (pag: TablePaginationConfig) => {
        loadUsers(pag.current || 1);
    };

    const handleRoleChange = async () => {
        if (!editingUser || !newRole) return;

        setModalLoading(true);
        const result = await updateUserRole(editingUser.id, newRole);
        setModalLoading(false);

        if (result.success) {
            message.success(result.message);
            setEditingUser(null);
            loadUsers(pagination.page);
        } else {
            message.error(result.message);
        }
    };

    const handleStatusToggle = async (user: User, newStatus: 'ACTIVE' | 'BANNED') => {
        const result = await updateUserStatus(user.id, newStatus);
        if (result.success) {
            message.success(result.message);
            loadUsers(pagination.page);
        } else {
            message.error(result.message);
        }
    };

    const handleViewDetail = async (user: User) => {
        setDrawerOpen(true);
        setDetailLoading(true);
        const detail = await getUserDetail(user.id);
        setDetailUser(detail);
        setDetailLoading(false);
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
        return new Date(dateStr).toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatMoney = (value: string | number | null | undefined) => {
        if (value == null) return '-';
        const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    };

    const roleLabel = (role: string) => t(`admin.users.role.${role}`);
    const statusLabel = (status: string) => t(`admin.users.status.${status}`);
    const rentalStatusLabel = (status: string) => t(`admin.users.rentalStatus.${status}`);

    const columns: ColumnsType<User> = [
        {
            title: t('admin.users.table.user'),
            key: 'user',
            render: (_, record) => (
                <Space>
                    <Avatar
                        src={record.avatarUrl}
                        icon={!record.avatarUrl && <UserOutlined />}
                    />
                    <div>
                        <div style={{ fontWeight: 500 }}>{record.fullName}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{record.email}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: t('admin.users.table.phone'),
            dataIndex: 'phone',
            key: 'phone',
            render: (phone) => phone || '-',
        },
        {
            title: t('admin.users.table.role'),
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                const option = ROLE_OPTIONS.find((r) => r.value === role);
                return <Tag color={option?.color}>{roleLabel(role)}</Tag>;
            },
        },
        {
            title: t('admin.users.table.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const option = STATUS_OPTIONS.find((s) => s.value === status);
                return <Tag color={option?.color}>{statusLabel(status)}</Tag>;
            },
        },
        {
            title: t('admin.users.table.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) =>
                new Date(date).toLocaleDateString(i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
        },
        {
            title: t('admin.users.table.actions'),
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                        title={t('admin.users.actions.viewDetail')}
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingUser(record);
                            setNewRole(record.role);
                        }}
                        title={t('admin.users.actions.changeRole')}
                    />
                    {record.role !== 'ADMIN' && (
                        record.status === 'ACTIVE' ? (
                            <Popconfirm
                                title={t('admin.users.actions.confirmBanTitle')}
                                description={t('admin.users.actions.confirmBanDesc', { name: record.fullName })}
                                onConfirm={() => handleStatusToggle(record, 'BANNED')}
                                okText={t('admin.users.actions.ban')}
                                cancelText={t('admin.users.actions.cancel')}
                                okButtonProps={{ danger: true }}
                            >
                                <Button
                                    type="text"
                                    danger
                                    icon={<StopOutlined />}
                                    title={t('admin.users.actions.banUser')}
                                />
                            </Popconfirm>
                        ) : (
                            <Popconfirm
                                title={t('admin.users.actions.confirmUnbanTitle')}
                                description={t('admin.users.actions.confirmUnbanDesc', { name: record.fullName })}
                                onConfirm={() => handleStatusToggle(record, 'ACTIVE')}
                                okText={t('admin.users.actions.unban')}
                                cancelText={t('admin.users.actions.cancel')}
                            >
                                <Button
                                    type="text"
                                    style={{ color: '#52c41a' }}
                                    icon={<CheckOutlined />}
                                    title={t('admin.users.actions.unbanUser')}
                                />
                            </Popconfirm>
                        )
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={2}>{t('admin.users.title')}</Title>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        placeholder={t('admin.users.filters.searchPlaceholder')}
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 280 }}
                        allowClear
                    />
                    <Select
                        placeholder={t('admin.users.filters.rolePlaceholder')}
                        value={roleFilter}
                        onChange={setRoleFilter}
                        style={{ width: 150 }}
                        allowClear
                    >
                        {ROLE_OPTIONS.map((opt) => (
                            <Option key={opt.value} value={opt.value}>
                                {roleLabel(opt.value)}
                            </Option>
                        ))}
                    </Select>
                    <Select
                        placeholder={t('admin.users.filters.statusPlaceholder')}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 150 }}
                        allowClear
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <Option key={opt.value} value={opt.value}>
                                {statusLabel(opt.value)}
                            </Option>
                        ))}
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                        {t('admin.users.filters.searchButton')}
                    </Button>
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: false,
                        showTotal: (total) => t('admin.users.totalUsersText', { total }),
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Edit Role Modal */}
            <Modal
                title={t('admin.users.roleModal.title', { name: editingUser?.fullName || '' })}
                open={!!editingUser}
                onOk={handleRoleChange}
                onCancel={() => setEditingUser(null)}
                confirmLoading={modalLoading}
                okText={t('admin.users.roleModal.save')}
                cancelText={t('admin.users.roleModal.cancel')}
            >
                <div style={{ marginTop: 16 }}>
                    <p style={{ marginBottom: 8 }}>{t('admin.users.roleModal.selectNewRole')}</p>
                    <Select
                        value={newRole}
                        onChange={setNewRole}
                        style={{ width: '100%' }}
                    >
                        {ROLE_OPTIONS.map((opt) => (
                            <Option key={opt.value} value={opt.value}>
                                <Tag color={opt.color}>{roleLabel(opt.value)}</Tag>
                            </Option>
                        ))}
                    </Select>
                </div>
            </Modal>

            {/* User Detail Drawer */}
            <Drawer
                title={t('admin.users.drawer.title')}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDetailUser(null); }}
                size="large"
            >
                {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : detailUser ? (
                    <div>
                        {/* User header */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                            <Avatar
                                src={detailUser.avatarUrl}
                                icon={!detailUser.avatarUrl && <UserOutlined />}
                                size={64}
                                style={{ backgroundColor: '#1677ff' }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0 }}>
                                    {detailUser.fullName}
                                    {detailUser.isVip && (
                                        <CrownOutlined
                                            style={{ color: '#faad14', marginLeft: 8, fontSize: 16 }}
                                            title={t('admin.users.drawer.vip')}
                                        />
                                    )}
                                </Title>
                                <Text type="secondary">{detailUser.email}</Text>
                                <div style={{ marginTop: 4 }}>
                                    <Tag color={ROLE_OPTIONS.find((r) => r.value === detailUser.role)?.color}>
                                        {roleLabel(detailUser.role)}
                                    </Tag>
                                    <Tag color={STATUS_OPTIONS.find((s) => s.value === detailUser.status)?.color}>
                                        {statusLabel(detailUser.status)}
                                    </Tag>
                                </div>
                            </div>
                        </div>

                        {/* Basic info */}
                        <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label={t('admin.users.drawer.id')}>
                                <Text copyable style={{ fontSize: 12 }}>{detailUser.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.drawer.phone')}>
                                {detailUser.phone || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.drawer.createdAt')}>
                                {formatDate(detailUser.createdAt)}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.drawer.lastUpdated')}>
                                {formatDate(detailUser.updated_at)}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Stats summary */}
                        <Divider titlePlacement="left">{t('admin.users.drawer.stats')}</Divider>
                        <Space size="large" wrap>
                            <Badge count={detailUser.stats.totalRentals} showZero overflowCount={999}>
                                <Tag icon={<HomeOutlined />} style={{ padding: '4px 12px' }}>
                                    {t('admin.users.drawer.rentals')}
                                </Tag>
                            </Badge>
                            <Badge count={detailUser.stats.totalFavorites} showZero overflowCount={999}>
                                <Tag icon={<HeartOutlined />} style={{ padding: '4px 12px' }}>
                                    {t('admin.users.drawer.favorites')}
                                </Tag>
                            </Badge>
                            <Badge count={detailUser.stats.totalPreorders} showZero overflowCount={999}>
                                <Tag icon={<ShoppingCartOutlined />} style={{ padding: '4px 12px' }}>
                                    {t('admin.users.drawer.preorders')}
                                </Tag>
                            </Badge>
                        </Space>

                        {/* Wallet info (read-only) */}
                        {detailUser.wallet && (
                            <>
                                <Divider titlePlacement="left">
                                    <WalletOutlined /> {t('admin.users.drawer.wallet')}
                                </Divider>
                                <Descriptions bordered size="small" column={1}>
                                    <Descriptions.Item label={t('admin.users.drawer.balance')}>
                                        <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                                            {formatMoney(detailUser.wallet.balance)}
                                        </Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.users.drawer.walletCreatedAt')}>
                                        {formatDate(detailUser.wallet.createdAt)}
                                    </Descriptions.Item>
                                </Descriptions>
                            </>
                        )}

                        {/* Preferences */}
                        {detailUser.preference && (
                            <>
                                <Divider titlePlacement="left">{t('admin.users.drawer.preferences')}</Divider>
                                <Descriptions bordered size="small" column={2}>
                                    <Descriptions.Item label={t('admin.users.drawer.budget')}>
                                        {detailUser.preference.budget_min && detailUser.preference.budget_max
                                            ? `${formatMoney(detailUser.preference.budget_min)} - ${formatMoney(detailUser.preference.budget_max)}`
                                            : '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.users.drawer.roomType')}>
                                        {detailUser.preference.room_type || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.users.drawer.location')} span={2}>
                                        {detailUser.preference.preferredLocation || '-'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </>
                        )}

                        {/* Lifestyle profile */}
                        {detailUser.lifestyleProfile && (
                            <>
                                <Divider titlePlacement="left">{t('admin.users.drawer.lifestyle')}</Divider>
                                <Descriptions bordered size="small" column={2}>
                                    <Descriptions.Item label={t('admin.users.drawer.occupation')}>
                                        {detailUser.lifestyleProfile.occupation_type || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.users.drawer.personality')}>
                                        {detailUser.lifestyleProfile.personalityType || '-'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </>
                        )}

                        {/* Landlord: rentals list */}
                        {detailUser.role === 'LANDLORD' && detailUser.rentals.length > 0 && (
                            <>
                                <Divider titlePlacement="left">
                                    <HomeOutlined /> {t('admin.users.drawer.rentalPosts', { count: detailUser.rentals.length })}
                                </Divider>
                                <List
                                    size="small"
                                    dataSource={detailUser.rentals}
                                    renderItem={(rental) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={rental.title}
                                                description={
                                                    <Space>
                                                        <Tag color={RENTAL_STATUS_MAP[rental.status]?.color || 'default'}>
                                                            {rentalStatusLabel(rental.status)}
                                                        </Tag>
                                                        <Text type="secondary">{t('admin.users.drawer.roomsCount', { count: rental.rooms.length })}</Text>
                                                        <Text type="secondary">{formatDate(rental.createdAt)}</Text>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </>
                        )}

                        {/* Preorders */}
                        {detailUser.preorders.length > 0 && (
                            <>
                                <Divider titlePlacement="left">
                                    <ShoppingCartOutlined /> {t('admin.users.drawer.recentPreorders')}
                                </Divider>
                                <List
                                    size="small"
                                    dataSource={detailUser.preorders}
                                    renderItem={(preorder) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                description={
                                                    <Space>
                                                        <Tag>{preorder.status}</Tag>
                                                        <Tag color={preorder.payment_status === 'PAID' ? 'success' : 'warning'}>
                                                            {preorder.payment_status}
                                                        </Tag>
                                                        {preorder.deposit_amount && (
                                                            <Text>{formatMoney(preorder.deposit_amount)}</Text>
                                                        )}
                                                        <Text type="secondary">{formatDate(preorder.createdAt)}</Text>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </>
                        )}

                        {/* Warning note for landlord data */}
                        {detailUser.role === 'LANDLORD' && (
                            <div style={{
                                marginTop: 24,
                                padding: '12px 16px',
                                background: '#fffbe6',
                                border: '1px solid #ffe58f',
                                borderRadius: 6,
                            }}>
                                <Text type="warning" strong>
                                    {t('admin.users.drawer.landlordWarning')}
                                </Text>
                            </div>
                        )}
                    </div>
                ) : (
                    <Text type="secondary">{t('admin.users.drawer.notFound')}</Text>
                )}
            </Drawer>
        </div>
    );
}
