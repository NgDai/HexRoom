import { useEffect, useMemo, useState } from 'react';
import {
    Table,
    Card,
    Input,
    Button,
    Space,
    Tag,
    Avatar,
    Typography,
    Drawer,
    Descriptions,
    Spin,
    Statistic,
    Row,
    Col,
    Select,
    Modal,
    message,
    Badge,
    Tabs,
    Tooltip,
    DatePicker,
    Alert,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
    SearchOutlined,
    UserOutlined,
    WalletOutlined,
    EyeOutlined,
    DollarOutlined,
    SwapOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    ClockCircleOutlined,
    FireOutlined,
    FilterOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
    getWallets,
    getWalletTransactions,
    getWalletStats,
    getPendingWithdrawalQueue,
    approveWalletWithdrawal,
    rejectWalletWithdrawal,
    approveWalletWithdrawalsBatch,
    rejectWalletWithdrawalsBatch,
    type WalletInfo,
    type WalletTransaction,
    type WalletStats,
    type PaginationInfo,
    type PendingWithdrawalQueueItem,
    type PendingWithdrawalQueueSummary,
} from './shared/admin-api';
import { useTranslation } from 'react-i18next';
import dayjs, { type Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TX_TYPE_MAP: Record<string, { color: string; icon?: React.ReactNode }> = {
    DEPOSIT: { color: 'success', icon: <ArrowDownOutlined /> },
    WITHDRAW: { color: 'error', icon: <ArrowUpOutlined /> },
    TRANSFER: { color: 'processing', icon: <SwapOutlined /> },
    PREORDER: { color: 'warning' },
    REFUND: { color: 'cyan' },
    PAYMENT: { color: 'purple' },
};

const TX_STATUS_MAP: Record<string, { color: string }> = {
    PENDING: { color: 'warning' },
    SUCCESS: { color: 'success' },
    FAILED: { color: 'error' },
    CANCELLED: { color: 'default' },
};

const ROLE_COLOR_MAP: Record<string, string> = {
    ADMIN: 'red',
    MODERATOR: 'purple',
    LANDLORD: 'blue',
    TENANT: 'green',
    GUEST: 'default',
};

export function AdminWalletsPage() {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('queue');

    // Queue-first states
    const [queueItems, setQueueItems] = useState<PendingWithdrawalQueueItem[]>([]);
    const [queueSummary, setQueueSummary] = useState<PendingWithdrawalQueueSummary>({
        pendingCount: 0,
        pendingAmount: 0,
        avgWaitingHours: 0,
        overdueCount: 0,
        slaHours: 12,
        priorityAmountThreshold: 3000000,
    });
    const [queuePagination, setQueuePagination] = useState<PaginationInfo>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [queueLoading, setQueueLoading] = useState(true);
    const [queueSearch, setQueueSearch] = useState('');
    const [queueAppliedSearch, setQueueAppliedSearch] = useState('');
    const [queueSort, setQueueSort] = useState<'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc'>('createdAt_desc');
    const [queueDateRange, setQueueDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [queueQuickFilter, setQueueQuickFilter] = useState<'ALL' | 'LT24' | 'GT24' | 'AMOUNT_HIGH'>('ALL');
    const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);

    // Rejection states
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedRejectTemplate, setSelectedRejectTemplate] = useState<string | undefined>();
    const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Overview + explorer states
    const [wallets, setWallets] = useState<WalletInfo[]>([]);
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);

    // Wallet explorer filters
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    // Transaction drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [txLoading, setTxLoading] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<{
        id: string;
        balance: string;
        user: { id: string; fullName: string; email: string; role: string };
    } | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [txPagination, setTxPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [txTypeFilter, setTxTypeFilter] = useState<string | undefined>();
    const [txStatusFilter, setTxStatusFilter] = useState<string | undefined>();
    const [selectedRejectTx, setSelectedRejectTx] = useState<WalletTransaction | null>(null);

    const rejectTemplates = useMemo(
        () => [
            t('admin.wallets.rejectTemplates.bankInfoInvalid'),
            t('admin.wallets.rejectTemplates.identityMismatch'),
            t('admin.wallets.rejectTemplates.riskDetected'),
            t('admin.wallets.rejectTemplates.duplicateRequest'),
            t('admin.wallets.rejectTemplates.contactSupport'),
        ],
        [t]
    );

    useEffect(() => {
        getWalletStats().then(setStats);
    }, []);

    useEffect(() => {
        loadPendingQueue(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queueAppliedSearch, queueSort, queueQuickFilter, queueDateRange]);

    // Load wallets
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            const result = await getWallets({
                page: 1,
                limit: 10,
                search: appliedSearch || undefined,
            });
            if (!cancelled) {
                setWallets(result.data);
                setPagination(result.pagination);
                setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [appliedSearch]);

    const loadWallets = async (page = 1) => {
        setLoading(true);
        const result = await getWallets({
            page,
            limit: 10,
            search: appliedSearch || undefined,
        });
        setWallets(result.data);
        setPagination(result.pagination);
        setLoading(false);
    };

    const handleSearch = () => {
        setAppliedSearch(search);
    };

    const handleQueueSearch = () => {
        setQueueAppliedSearch(queueSearch.trim());
    };

    const loadPendingQueue = async (page = 1) => {
        setQueueLoading(true);
        const [sortBy, order] = queueSort.split('_') as ['createdAt' | 'amount', 'asc' | 'desc'];

        let createdAfter: string | undefined;
        let createdBefore: string | undefined;
        let minAmount: number | undefined;

        if (queueQuickFilter === 'LT24') {
            createdAfter = dayjs().subtract(24, 'hour').toISOString();
        }
        if (queueQuickFilter === 'GT24') {
            createdBefore = dayjs().subtract(24, 'hour').toISOString();
        }
        if (queueQuickFilter === 'AMOUNT_HIGH') {
            minAmount = queueSummary.priorityAmountThreshold || 3000000;
        }
        if (queueDateRange?.[0] && queueDateRange?.[1]) {
            createdAfter = queueDateRange[0].startOf('day').toISOString();
            createdBefore = queueDateRange[1].endOf('day').toISOString();
        }

        const result = await getPendingWithdrawalQueue({
            page,
            limit: queuePagination.limit || 20,
            search: queueAppliedSearch || undefined,
            sortBy,
            order,
            minAmount,
            createdAfter,
            createdBefore,
        });

        setQueueItems(result.data);
        setQueueSummary(result.summary);
        setQueuePagination(result.pagination);
        setQueueLoading(false);
    };

    const handleTableChange = (pag: TablePaginationConfig) => {
        loadWallets(pag.current || 1);
    };

    const handleQueueTableChange = (pag: TablePaginationConfig) => {
        loadPendingQueue(pag.current || 1);
    };

    const openTransactions = async (wallet: WalletInfo) => {
        setDrawerOpen(true);
        setTxLoading(true);
        setTxTypeFilter(undefined);
        setTxStatusFilter(undefined);

        const result = await getWalletTransactions(wallet.id);
        setSelectedWallet(result.wallet);
        setTransactions(result.transactions);
        setTxPagination(result.pagination);
        setTxLoading(false);
    };

    const loadTransactions = async (page = 1) => {
        if (!selectedWallet) return;
        setTxLoading(true);
        const result = await getWalletTransactions(selectedWallet.id, {
            page,
            limit: 20,
            type: txTypeFilter,
            status: txStatusFilter,
        });
        setSelectedWallet(result.wallet);
        setTransactions(result.transactions);
        setTxPagination(result.pagination);
        setTxLoading(false);
    };

    const refreshWalletData = async () => {
        await Promise.all([
            loadTransactions(txPagination.page || 1),
            loadWallets(pagination.page || 1),
            loadPendingQueue(queuePagination.page || 1),
        ]);
        const latestStats = await getWalletStats();
        setStats(latestStats);
    };

    const handleApproveWithdrawal = async (txId: string) => {
        setActionLoadingId(txId);
        const result = await approveWalletWithdrawal(txId);
        if (result.success) {
            message.success(result.message);
            await refreshWalletData();
            setSelectedQueueIds((prev) => prev.filter((id) => id !== txId));
        } else {
            message.error(result.message);
        }
        setActionLoadingId(null);
    };

    const handleBatchApprove = async () => {
        if (selectedQueueIds.length === 0) return;
        setActionLoadingId('batch-approve');
        const result = await approveWalletWithdrawalsBatch(selectedQueueIds);
        if (result.success) {
            message.success(result.message);
            setSelectedQueueIds([]);
            await refreshWalletData();
            if (result.failed.length > 0) {
                message.warning(t('admin.wallets.queue.messages.partialFailed', { count: result.failed.length }));
            }
        } else {
            message.error(result.message);
        }
        setActionLoadingId(null);
    };

    const openRejectModalForIds = (ids: string[]) => {
        setRejectTargetIds(ids);
        setSelectedRejectTx(null);
        setRejectReason('');
        setSelectedRejectTemplate(undefined);
        setRejectModalOpen(true);
    };

    const openRejectModal = (tx: WalletTransaction) => {
        setSelectedRejectTx(tx);
        openRejectModalForIds([tx.id]);
    };

    const handleRejectWithdrawal = async () => {
        const reason = rejectReason.trim();
        if (rejectTargetIds.length === 0) return;
        setActionLoadingId(rejectTargetIds.length > 1 ? 'batch-reject' : rejectTargetIds[0]);

        const result = rejectTargetIds.length > 1
            ? await rejectWalletWithdrawalsBatch(rejectTargetIds, reason)
            : await rejectWalletWithdrawal(rejectTargetIds[0], reason);

        if (result.success) {
            message.success(result.message);
            setRejectModalOpen(false);
            setSelectedRejectTx(null);
            setRejectReason('');
            setSelectedRejectTemplate(undefined);
            setSelectedQueueIds((prev) => prev.filter((id) => !rejectTargetIds.includes(id)));
            setRejectTargetIds([]);
            await refreshWalletData();
            const failed =
                'failed' in result && Array.isArray((result as { failed?: unknown }).failed)
                    ? (result as { failed: unknown[] }).failed
                    : [];
            if (failed.length > 0) {
                message.warning(t('admin.wallets.queue.messages.partialFailed', { count: failed.length }));
            }
        } else {
            message.error(result.message);
        }
        setActionLoadingId(null);
    };

    const applyPendingWithdrawPreset = () => {
        setTxTypeFilter('WITHDRAW');
        setTxStatusFilter('PENDING');
    };

    const clearTransactionFilters = () => {
        setTxTypeFilter(undefined);
        setTxStatusFilter(undefined);
    };

    const handleQuickViewPendingWithdrawals = () => {
        setActiveTab('queue');
    };

    // Reload transactions when filters change
    useEffect(() => {
        if (drawerOpen && selectedWallet) {
            loadTransactions(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [txTypeFilter, txStatusFilter]);

    const formatMoney = (value: string | number | null | undefined) => {
        const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
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

    const formatAge = (waitingHours: number) => {
        if (waitingHours < 1) return t('admin.wallets.queue.age.lessThanHour');
        if (waitingHours < 24) return t('admin.wallets.queue.age.hours', { value: waitingHours.toFixed(1) });
        return t('admin.wallets.queue.age.days', { value: (waitingHours / 24).toFixed(1) });
    };

    const walletColumns: ColumnsType<WalletInfo> = [
        {
            title: t('admin.wallets.table.user'),
            key: 'user',
            render: (_, record) => (
                <Space>
                    <Avatar
                        src={record.user.avatarUrl}
                        icon={!record.user.avatarUrl && <UserOutlined />}
                    />
                    <div>
                        <div style={{ fontWeight: 500 }}>{record.user.fullName}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{record.user.email}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: t('admin.wallets.table.role'),
            key: 'role',
            render: (_, record) => (
                <Tag color={ROLE_COLOR_MAP[record.user.role] || 'default'}>
                    {record.user.role}
                </Tag>
            ),
            width: 120,
        },
        {
            title: t('admin.wallets.table.balance'),
            key: 'balance',
            render: (_, record) => (
                <Text strong style={{ color: Number(record.balance) > 0 ? '#52c41a' : undefined }}>
                    {formatMoney(record.balance)}
                </Text>
            ),
            sorter: (a, b) => Number(a.balance) - Number(b.balance),
        },
        {
            title: t('admin.wallets.table.createdAt'),
            key: 'createdAt',
            render: (_, record) => formatDate(record.createdAt),
        },
        {
            title: '',
            key: 'actions',
            width: 80,
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => openTransactions(record)}
                    title={t('admin.wallets.actions.viewTransactions')}
                >
                    {t('admin.wallets.actions.transactions')}
                </Button>
            ),
        },
    ];

    const txColumns: ColumnsType<WalletTransaction> = [
        {
            title: t('admin.wallets.txTable.type'),
            dataIndex: 'transaction_type',
            key: 'type',
            width: 120,
            render: (type) => {
                const info = TX_TYPE_MAP[type];
                return info ? (
                    <Tag color={info.color} icon={info.icon}>
                        {t(`admin.wallets.txType.${type}`)}
                    </Tag>
                ) : (
                    <Tag>{type}</Tag>
                );
            },
        },
        {
            title: t('admin.wallets.txTable.amount'),
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            ellipsis: true,
            render: (amount) => (
                <Text strong style={{ whiteSpace: 'nowrap' }}>{formatMoney(amount)}</Text>
            ),
            onCell: () => ({
                style: {
                    whiteSpace: 'nowrap',
                },
            }),
        },
        {
            title: t('admin.wallets.txTable.status'),
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => {
                const info = TX_STATUS_MAP[status];
                return info ? (
                    <Tag color={info.color}>{t(`admin.wallets.txStatus.${status}`)}</Tag>
                ) : (
                    <Tag>{status}</Tag>
                );
            },
        },
        {
            title: t('admin.wallets.txTable.description'),
            dataIndex: 'description',
            key: 'description',
            width: 240,
            render: (desc) => (
                <span style={{ whiteSpace: 'nowrap' }}>{desc || '-'}</span>
            ),
            ellipsis: true,
            onCell: () => ({
                style: {
                    whiteSpace: 'nowrap',
                },
            }),
        },
        {
            title: t('admin.wallets.txTable.time'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date) => formatDate(date),
        },
        {
            title: t('admin.wallets.txTable.actions'),
            key: 'actions',
            width: 220,
            render: (_, record) => {
                const isPendingWithdraw =
                    record.transaction_type === 'WITHDRAW' && record.status === 'PENDING';

                if (!isPendingWithdraw) {
                    return <Text type="secondary">-</Text>;
                }

                return (
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            loading={actionLoadingId === record.id}
                            onClick={() => handleApproveWithdrawal(record.id)}
                        >
                            {t('admin.wallets.actions.approve')}
                        </Button>
                        <Button
                            danger
                            size="small"
                            loading={actionLoadingId === record.id}
                            onClick={() => openRejectModal(record)}
                        >
                            {t('admin.wallets.actions.reject')}
                        </Button>
                    </Space>
                );
            },
        },
    ];

    const queueColumns: ColumnsType<PendingWithdrawalQueueItem> = [
        {
            title: t('admin.wallets.queue.table.user'),
            key: 'user',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.user.avatarUrl} icon={!record.user.avatarUrl && <UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 600 }}>{record.user.fullName}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{record.user.email}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: t('admin.wallets.queue.table.amount'),
            dataIndex: 'amount',
            key: 'amount',
            width: 160,
            render: (amount: string, record) => (
                <Text strong style={{ color: record.priority === 'HIGH' ? '#cf1322' : '#237804' }}>
                    {formatMoney(amount)}
                </Text>
            ),
        },
        {
            title: t('admin.wallets.queue.table.status'),
            key: 'status',
            width: 140,
            render: (_, record) => (
                <Tag color={record.isOverdue ? 'red' : 'gold'}>
                    {record.isOverdue
                        ? t('admin.wallets.queue.status.overdue')
                        : t('admin.wallets.queue.status.pending')}
                </Tag>
            ),
        },
        {
            title: t('admin.wallets.queue.table.waitingAge'),
            dataIndex: 'waitingHours',
            key: 'waitingHours',
            width: 140,
            render: (hours: number, record) => (
                <Text style={{ color: record.isOverdue ? '#cf1322' : '#d48806' }}>
                    {formatAge(hours)}
                </Text>
            ),
        },
        {
            title: t('admin.wallets.queue.table.priority'),
            key: 'priority',
            width: 130,
            render: (_, record) => (
                <Tag color={record.priority === 'HIGH' ? 'red' : 'default'} icon={record.priority === 'HIGH' ? <FireOutlined /> : undefined}>
                    {t(`admin.wallets.queue.priority.${record.priority}`)}
                </Tag>
            ),
        },
        {
            title: t('admin.wallets.queue.table.description'),
            key: 'description',
            width: 70,
            render: (_, record) => (
                record.description ? (
                    <Tooltip title={record.description}>
                        <ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                ) : <Text type="secondary">-</Text>
            ),
        },
        {
            title: t('admin.wallets.queue.table.actions'),
            key: 'actions',
            width: 180,
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        loading={actionLoadingId === record.id}
                        onClick={() => handleApproveWithdrawal(record.id)}
                    >
                        {t('admin.wallets.actions.approve')}
                    </Button>
                    <Button
                        danger
                        size="small"
                        loading={actionLoadingId === record.id}
                        onClick={() => openRejectModalForIds([record.id])}
                    >
                        {t('admin.wallets.actions.reject')}
                    </Button>
                </Space>
            ),
        },
    ];

    const queueRowSelection = {
        selectedRowKeys: selectedQueueIds,
        onChange: (keys: React.Key[]) => setSelectedQueueIds(keys.map(String)),
    };

    const queueTab = (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                title={t('admin.wallets.queue.notice')}
                icon={<ClockCircleOutlined />}
            />

            <Row gutter={16}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('admin.wallets.queue.kpis.pendingCount')}
                            value={queueSummary.pendingCount}
                            prefix={<Badge color={queueSummary.pendingCount > 0 ? '#faad14' : '#d9d9d9'} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('admin.wallets.queue.kpis.pendingAmount')}
                            value={formatMoney(queueSummary.pendingAmount)}
                            prefix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('admin.wallets.queue.kpis.avgWaiting')}
                            value={formatAge(queueSummary.avgWaitingHours)}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('admin.wallets.queue.kpis.overdueCount', { sla: queueSummary.slaHours })}
                            value={queueSummary.overdueCount}
                            styles={{ content: { color: queueSummary.overdueCount > 0 ? '#cf1322' : undefined } }}
                            prefix={<FireOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Space wrap>
                    <Button
                        type={queueQuickFilter === 'ALL' ? 'primary' : 'default'}
                        onClick={() => setQueueQuickFilter('ALL')}
                    >
                        {t('admin.wallets.queue.quickFilters.all')}
                    </Button>
                    <Button
                        type={queueQuickFilter === 'LT24' ? 'primary' : 'default'}
                        onClick={() => setQueueQuickFilter('LT24')}
                    >
                        {t('admin.wallets.queue.quickFilters.lt24h')}
                    </Button>
                    <Button
                        type={queueQuickFilter === 'GT24' ? 'primary' : 'default'}
                        onClick={() => setQueueQuickFilter('GT24')}
                        danger={queueQuickFilter === 'GT24'}
                    >
                        {t('admin.wallets.queue.quickFilters.gt24h')}
                    </Button>
                    <Button
                        type={queueQuickFilter === 'AMOUNT_HIGH' ? 'primary' : 'default'}
                        onClick={() => setQueueQuickFilter('AMOUNT_HIGH')}
                    >
                        {t('admin.wallets.queue.quickFilters.amountOver', {
                            amount: formatMoney(queueSummary.priorityAmountThreshold),
                        })}
                    </Button>
                </Space>

                <Space wrap style={{ marginTop: 12 }}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder={t('admin.wallets.queue.searchPlaceholder')}
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                        onPressEnter={handleQueueSearch}
                        style={{ width: 280 }}
                        allowClear
                    />
                    <Button type="primary" onClick={handleQueueSearch}>
                        {t('admin.wallets.queue.searchButton')}
                    </Button>
                    <Select
                        value={queueSort}
                        onChange={setQueueSort}
                        style={{ width: 240 }}
                        suffixIcon={<FilterOutlined />}
                    >
                        <Option value="createdAt_desc">{t('admin.wallets.queue.sort.newest')}</Option>
                        <Option value="createdAt_asc">{t('admin.wallets.queue.sort.oldest')}</Option>
                        <Option value="amount_desc">{t('admin.wallets.queue.sort.amountDesc')}</Option>
                        <Option value="amount_asc">{t('admin.wallets.queue.sort.amountAsc')}</Option>
                    </Select>
                    <RangePicker
                        value={queueDateRange}
                        onChange={(range) => setQueueDateRange(range)}
                    />
                    <Button
                        onClick={() => {
                            setQueueSearch('');
                            setQueueAppliedSearch('');
                            setQueueDateRange(null);
                            setQueueQuickFilter('ALL');
                            setQueueSort('createdAt_desc');
                        }}
                    >
                        {t('admin.wallets.queue.resetFilters')}
                    </Button>
                </Space>
            </Card>

            {selectedQueueIds.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    title={t('admin.wallets.queue.selectedText', { count: selectedQueueIds.length })}
                    action={
                        <Space>
                            <Button
                                type="primary"
                                size="small"
                                loading={actionLoadingId === 'batch-approve'}
                                onClick={handleBatchApprove}
                            >
                                {t('admin.wallets.queue.batch.approve')}
                            </Button>
                            <Button
                                danger
                                size="small"
                                loading={actionLoadingId === 'batch-reject'}
                                onClick={() => openRejectModalForIds(selectedQueueIds)}
                            >
                                {t('admin.wallets.queue.batch.reject')}
                            </Button>
                        </Space>
                    }
                />
            )}

            <Card>
                <Table
                    rowSelection={queueRowSelection}
                    columns={queueColumns}
                    dataSource={queueItems}
                    rowKey="id"
                    loading={queueLoading}
                    pagination={{
                        current: queuePagination.page,
                        pageSize: queuePagination.limit,
                        total: queuePagination.total,
                        showSizeChanger: false,
                        showTotal: (total) => t('admin.wallets.queue.totalText', { total }),
                    }}
                    locale={{
                        emptyText: t('admin.wallets.queue.empty'),
                    }}
                    onChange={handleQueueTableChange}
                    scroll={{ x: 920 }}
                />
            </Card>
        </Space>
    );

    const overviewTab = (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Row gutter={16}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title={t('admin.wallets.queue.kpis.pendingCount')} value={queueSummary.pendingCount} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title={t('admin.wallets.queue.kpis.pendingAmount')} value={formatMoney(queueSummary.pendingAmount)} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title={t('admin.wallets.queue.kpis.avgWaiting')} value={formatAge(queueSummary.avgWaitingHours)} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('admin.wallets.queue.kpis.overdueCount', { sla: queueSummary.slaHours })}
                            value={queueSummary.overdueCount}
                            styles={{ content: { color: '#cf1322' } }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Space orientation="vertical" size={12}>
                    <Text>{t('admin.wallets.overview.subtitle')}</Text>
                    <Space>
                        <Button type="primary" onClick={handleQuickViewPendingWithdrawals}>
                            {t('admin.wallets.overview.goToQueue')}
                        </Button>
                    </Space>
                </Space>
            </Card>

            {stats && (
                <Row gutter={16}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title={t('admin.wallets.stats.totalWallets')} value={stats.totalWallets} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title={t('admin.wallets.stats.totalBalance')} value={formatMoney(stats.totalBalance)} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title={t('admin.wallets.stats.avgBalance')} value={formatMoney(stats.avgBalance)} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title={t('admin.wallets.stats.maxBalance')} value={formatMoney(stats.maxBalance)} />
                        </Card>
                    </Col>
                </Row>
            )}
        </Space>
    );

    const explorerTab = (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card>
                <Space wrap>
                    <Input
                        placeholder={t('admin.wallets.searchPlaceholder')}
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 280 }}
                        allowClear
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                        {t('admin.wallets.searchButton')}
                    </Button>
                </Space>
            </Card>

            <Card>
                <Table
                    columns={walletColumns}
                    dataSource={wallets}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: false,
                        showTotal: (total) => t('admin.wallets.totalWalletsText', { total }),
                    }}
                    onChange={handleTableChange}
                />
            </Card>
        </Space>
    );

    return (
        <div>
            <Title level={2}>
                <WalletOutlined style={{ marginRight: 8 }} />
                {t('admin.wallets.title')}
                <Badge
                    count={queueSummary.pendingCount}
                    style={{ marginLeft: 12, backgroundColor: queueSummary.pendingCount > 0 ? '#faad14' : '#d9d9d9' }}
                />
            </Title>

            <Card style={{ marginBottom: 16, background: '#fffbe6', borderColor: '#ffe58f' }}>
                <Row align="middle" justify="space-between" gutter={16}>
                    <Col>
                        <Space>
                            <Text strong>{t('admin.wallets.pendingBadge')}</Text>
                            <Badge count={queueSummary.pendingCount} style={{ backgroundColor: '#faad14' }} />
                        </Space>
                    </Col>
                    <Col>
                        <Button type="primary" onClick={() => setActiveTab('queue')}>
                            {t('admin.wallets.queue.goNow')}
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'overview',
                        label: t('admin.wallets.tabs.overview'),
                        children: overviewTab,
                    },
                    {
                        key: 'queue',
                        label: (
                            <Space size={8}>
                                <span>{t('admin.wallets.tabs.withdrawalQueue')}</span>
                                <Badge
                                    count={queueSummary.pendingCount}
                                    style={{ backgroundColor: queueSummary.pendingCount > 0 ? '#faad14' : '#d9d9d9' }}
                                />
                            </Space>
                        ),
                        children: queueTab,
                    },
                    {
                        key: 'explorer',
                        label: t('admin.wallets.tabs.walletExplorer'),
                        children: explorerTab,
                    },
                ]}
            />

            {/* Transaction Drawer */}
            <Drawer
                title={t('admin.wallets.drawer.title')}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelectedWallet(null); }}
                size="large"
            >
                {selectedWallet && (
                    <>
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label={t('admin.wallets.drawer.owner')}>
                                {selectedWallet.user.fullName}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.wallets.drawer.email')}>
                                {selectedWallet.user.email}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.wallets.drawer.role')}>
                                <Tag color={ROLE_COLOR_MAP[selectedWallet.user.role] || 'default'}>
                                    {selectedWallet.user.role}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.wallets.drawer.currentBalance')}>
                                <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                                    {formatMoney(selectedWallet.balance)}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Transaction filters */}
                        <Space wrap style={{ marginBottom: 16 }}>
                            <Button onClick={applyPendingWithdrawPreset}>
                                {t('admin.wallets.filters.pendingWithdraw')}
                            </Button>
                            <Button onClick={clearTransactionFilters}>
                                {t('admin.wallets.filters.allTransactions')}
                            </Button>
                            <Select
                                placeholder={t('admin.wallets.filters.byType')}
                                value={txTypeFilter}
                                onChange={setTxTypeFilter}
                                style={{ width: 150 }}
                                allowClear
                            >
                                {Object.entries(TX_TYPE_MAP).map(([key]) => (
                                    <Option key={key} value={key}>
                                        {t(`admin.wallets.txType.${key}`)}
                                    </Option>
                                ))}
                            </Select>
                            <Select
                                placeholder={t('admin.wallets.filters.byStatus')}
                                value={txStatusFilter}
                                onChange={setTxStatusFilter}
                                style={{ width: 150 }}
                                allowClear
                            >
                                {Object.entries(TX_STATUS_MAP).map(([key]) => (
                                    <Option key={key} value={key}>
                                        {t(`admin.wallets.txStatus.${key}`)}
                                    </Option>
                                ))}
                            </Select>
                        </Space>

                        {txLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Spin size="large" />
                            </div>
                        ) : (
                            <Table
                                columns={txColumns}
                                dataSource={transactions}
                                rowKey="id"
                                size="small"
                                scroll={{ x: 1020 }}
                                pagination={{
                                    current: txPagination.page,
                                    pageSize: txPagination.limit,
                                    total: txPagination.total,
                                    showSizeChanger: false,
                                    showTotal: (total) => t('admin.wallets.totalTransactionsText', { total }),
                                }}
                                onChange={(pag) => loadTransactions(pag.current || 1)}
                            />
                        )}
                    </>
                )}
            </Drawer>

            <Modal
                title={t('admin.wallets.rejectModal.title')}
                open={rejectModalOpen}
                onCancel={() => {
                    setRejectModalOpen(false);
                    setSelectedRejectTx(null);
                    setRejectTargetIds([]);
                    setRejectReason('');
                    setSelectedRejectTemplate(undefined);
                }}
                onOk={handleRejectWithdrawal}
                confirmLoading={
                    actionLoadingId === 'batch-reject' ||
                    Boolean(selectedRejectTx && actionLoadingId === selectedRejectTx.id)
                }
                okText={t('admin.wallets.rejectModal.confirm')}
                cancelText={t('admin.wallets.rejectModal.cancel')}
            >
                <Text type="secondary">
                    {t('admin.wallets.rejectModal.description')}
                </Text>
                <div style={{ marginTop: 12 }}>
                    <Text>{t('admin.wallets.rejectModal.templateLabel')}</Text>
                    <Select
                        value={selectedRejectTemplate}
                        onChange={(val) => {
                            setSelectedRejectTemplate(val);
                            setRejectReason(val);
                        }}
                        style={{ width: '100%', marginTop: 8 }}
                        placeholder={t('admin.wallets.rejectModal.templatePlaceholder')}
                        allowClear
                    >
                        {rejectTemplates.map((template) => (
                            <Option key={template} value={template}>
                                {template}
                            </Option>
                        ))}
                    </Select>
                </div>
                <Input.TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('admin.wallets.rejectModal.placeholder')}
                    maxLength={300}
                    style={{ marginTop: 12 }}
                    showCount
                />
            </Modal>
        </div>
    );
}
