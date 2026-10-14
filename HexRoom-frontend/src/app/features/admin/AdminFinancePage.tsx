import { useEffect, useMemo, useState } from 'react';
import {
    App,
    Alert,
    Button,
    Card,
    Col,
    Drawer,
    Grid,
    Input,
    Modal,
    Select,
    Row,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    cancelPendingPaymentOrder,
    getFinanceReconciliation,
    getFinanceSummary,
    getPendingPaymentOrders,
    runPreorderReconciliationNow,
    type FinanceSummaryData,
    type PendingOrderPurpose,
    type PendingPaymentOrderItem,
    type ReconciliationItem,
} from './shared/admin-api';

const { Title, Text } = Typography;

function formatMoney(value: number | string | null | undefined) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString('vi-VN')} đ`;
}

export function AdminFinancePage() {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const screens = Grid.useBreakpoint();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [summary, setSummary] = useState<FinanceSummaryData | null>(null);
    const [mismatches, setMismatches] = useState<ReconciliationItem[]>([]);
    const [summaryByType, setSummaryByType] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [pendingPurpose, setPendingPurpose] = useState<PendingOrderPurpose>('ALL');
    const [pendingSearch, setPendingSearch] = useState('');
    const [pendingOrders, setPendingOrders] = useState<PendingPaymentOrderItem[]>([]);
    const [pendingPage, setPendingPage] = useState(1);
    const [pendingPageSize, setPendingPageSize] = useState(10);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [pendingByPurpose, setPendingByPurpose] = useState<Record<string, { count: number; amount: number }>>({});
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [reconcileLoading, setReconcileLoading] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelTarget, setCancelTarget] = useState<PendingPaymentOrderItem | null>(null);
    const [pendingDrawerOpen, setPendingDrawerOpen] = useState(false);

    const loadData = async (nextPage = page, nextPageSize = pageSize) => {
        setLoading(true);
        const [summaryData, reconcileData] = await Promise.all([
            getFinanceSummary({ from: from || undefined, to: to || undefined }),
            getFinanceReconciliation({
                from: from || undefined,
                to: to || undefined,
                page: nextPage,
                limit: nextPageSize,
            }),
        ]);
        setSummary(summaryData);
        setMismatches(reconcileData.data?.mismatches || []);
        setSummaryByType(reconcileData.data?.summary.byType || {});
        setTotal(reconcileData.pagination.total || 0);
        setLoading(false);
    };

    const loadPendingData = async (nextPage = pendingPage, nextPageSize = pendingPageSize) => {
        setLoading(true);
        const pendingData = await getPendingPaymentOrders({
            page: nextPage,
            limit: nextPageSize,
            purpose: pendingPurpose,
            search: pendingSearch || undefined,
            sortBy: 'createdAt',
            order: 'desc',
            createdAfter: from || undefined,
            createdBefore: to || undefined,
        });
        setPendingOrders(pendingData.data?.items || []);
        setPendingByPurpose(pendingData.data?.summary.byPurpose || {});
        setPendingTotal(pendingData.pagination.total || 0);
        setLoading(false);
    };

    useEffect(() => {
        void loadData(1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setPendingPage(1);
        void loadPendingData(1, pendingPageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingPurpose]);

    const mismatchTypeTags = useMemo(
        () =>
            Object.entries(summaryByType).map(([type, count]) => (
                <Tag key={type} color="orange">
                    {type}: {count}
                </Tag>
            )),
        [summaryByType]
    );

    const paymentStatusTags = useMemo(() => {
        const byStatus = summary?.kpis.paymentOrdersByStatus || {};
        return Object.entries(byStatus).map(([status, payload]) => (
            <Tag key={status} color={status === 'SUCCESS' ? 'green' : status === 'PENDING' ? 'gold' : 'default'}>
                {status}: {payload.count} | {formatMoney(payload.amount)}
            </Tag>
        ));
    }, [summary]);

    const chartData = useMemo(() => {
        if (!summary) return [];
        return [
            {
                name: t('admin.finance.charts.deposit'),
                amount: Number(summary.kpis.preorderDeposits.successAmount || 0),
            },
            {
                name: t('admin.finance.charts.topup'),
                amount: Number(summary.kpis.walletTopups.successAmount || 0),
            },
            {
                name: t('admin.finance.charts.vip'),
                amount: Number(summary.kpis.vipPurchases.successAmount || 0),
            },
            {
                name: t('admin.finance.charts.platformFee'),
                amount: Number(summary.kpis.platformFees.amount || 0),
            },
            {
                name: t('admin.finance.charts.refund'),
                amount: Number(summary.kpis.refunds.completedAmount || 0),
            },
        ];
    }, [summary, t]);

    const pendingDrawerSize = useMemo(() => (screens.lg ? 'large' : 'default'), [screens.lg]);

    const columns: ColumnsType<ReconciliationItem> = [
        {
            title: 'Mismatch',
            dataIndex: 'type',
            key: 'type',
            width: 280,
            render: (value: string) => <Tag color="red">{value}</Tag>,
        },
        {
            title: t('admin.finance.table.preorder'),
            key: 'preorder',
            render: (_, row) =>
                row.preorder ? (
                    <div>
                        <div>ID: {row.preorder.id}</div>
                        <div>Status: {row.preorder.status}</div>
                        <div>Payment: {row.preorder.payment_status}</div>
                        <div>Deposit: {formatMoney(row.preorder.deposit_amount)}</div>
                    </div>
                ) : (
                    <Text type="secondary">N/A</Text>
                ),
        },
        {
            title: t('admin.finance.table.paymentOrder'),
            key: 'order',
            render: (_, row) =>
                row.order ? (
                    <div>
                        <div>TxnRef: {row.order.vnp_txn_ref}</div>
                        <div>Status: {row.order.status}</div>
                        <div>Amount: {formatMoney(row.order.amount)}</div>
                        <div>Ref: {row.order.ref_type || 'N/A'} / {row.order.ref_id || 'N/A'}</div>
                    </div>
                ) : (
                    <Text type="secondary">N/A</Text>
                ),
        },
    ];

    const pendingColumns: ColumnsType<PendingPaymentOrderItem> = [
        {
            title: 'Loại đơn',
            key: 'purpose',
            width: 170,
            render: (_, row) => (
                <Space orientation="vertical" size={0}>
                    <Tag color="blue">{row.purpose}</Tag>
                    <Text type="secondary">{row.source}</Text>
                </Space>
            ),
        },
        {
            title: 'Người dùng',
            key: 'user',
            render: (_, row) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{row.user.fullName || 'N/A'}</Text>
                    <Text type="secondary">{row.user.email || 'N/A'}</Text>
                </Space>
            ),
        },
        {
            title: 'Mã giao dịch',
            key: 'txn',
            render: (_, row) => (
                <Space orientation="vertical" size={0}>
                    <Text>{row.orderCode || row.id}</Text>
                    <Text type="secondary">
                        {row.refType ? `${row.refType}/${row.refId || 'N/A'}` : row.walletId || 'N/A'}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            render: (value: number) => <Text>{formatMoney(value)}</Text>,
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 180,
            render: (_, row) => (
                <Space orientation="vertical" size={0}>
                    <Tag color="gold">{row.status}</Tag>
                    <Text type="secondary">
                        {row.waitingHours}h · {row.agingBucket}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 160,
            render: (_, row) => (
                <Button
                    size="small"
                    danger
                    loading={actionLoadingId === row.id}
                    onClick={() => {
                        setCancelTarget(row);
                        setCancelReason('');
                        setCancelModalOpen(true);
                    }}
                >
                    Hủy pending
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Title level={2}>{t('admin.finance.title')}</Title>
            <Text type="secondary">{t('admin.finance.subtitle')}</Text>

            <Card style={{ marginTop: 16 }}>
                <Space wrap>
                    <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        placeholder={t('admin.finance.filters.from')}
                        style={{ width: 180 }}
                    />
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder={t('admin.finance.filters.to')}
                        style={{ width: 180 }}
                    />
                    <Button
                        type="primary"
                        onClick={() => {
                            setPage(1);
                            void loadData(1, pageSize);
                            if (pendingDrawerOpen) {
                                setPendingPage(1);
                                void loadPendingData(1, pendingPageSize);
                            }
                        }}
                        loading={loading}
                    >
                        {t('admin.finance.filters.apply')}
                    </Button>
                </Space>
            </Card>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title={t('admin.finance.kpis.platformFees')}
                            value={formatMoney(summary?.kpis.platformFees.amount)}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title={t('admin.finance.kpis.preorderDeposits')}
                            value={formatMoney(summary?.kpis.preorderDeposits.successAmount)}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title={t('admin.finance.kpis.walletTopups')}
                            value={formatMoney(summary?.kpis.walletTopups.successAmount)}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title={t('admin.finance.kpis.refunds')}
                            value={formatMoney(summary?.kpis.refunds.completedAmount)}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title={t('admin.finance.kpis.pendingOrders')}
                            value={formatMoney(summary?.kpis.pendingPaymentAmount || 0)}
                        />
                        <Space style={{ marginTop: 8 }} orientation="vertical" size={4}>
                            <Text type="secondary">Số đơn đang chờ: {summary?.kpis.pendingPaymentOrders || 0}</Text>
                            <Button
                                type="link"
                                style={{ padding: 0 }}
                                onClick={() => {
                                    setPendingDrawerOpen(true);
                                    setPendingPage(1);
                                    void loadPendingData(1, pendingPageSize);
                                }}
                            >
                                Xem pending payments
                            </Button>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title={t('admin.finance.kpis.vipPurchases')}
                            value={formatMoney(summary?.kpis.vipPurchases.successAmount)}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Trạng thái thanh toán" style={{ marginTop: 16 }}>
                {paymentStatusTags.length > 0 ? (
                    <Space wrap>{paymentStatusTags}</Space>
                ) : (
                    <Text type="secondary">Chưa có dữ liệu trạng thái trong khoảng thời gian đã chọn.</Text>
                )}
            </Card>

            <Card title={t('admin.finance.charts.title')} style={{ marginTop: 16 }}>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
                        <Legend />
                        <Bar dataKey="amount" name={t('admin.finance.charts.amount')} fill="#1677ff" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card title={t('admin.finance.reconciliation.title')} style={{ marginTop: 16 }}>
                {mismatchTypeTags.length > 0 ? (
                    <Space wrap style={{ marginBottom: 12 }}>{mismatchTypeTags}</Space>
                ) : (
                    <Alert type="success" showIcon title={t('admin.finance.reconciliation.noMismatch')} style={{ marginBottom: 12 }} />
                )}

                <Table
                    rowKey={(row) => `${row.type}-${row.order?.id || 'no-order'}-${row.preorder?.id || 'no-preorder'}`}
                    columns={columns}
                    dataSource={mismatches}
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        onChange: (nextPage, nextPageSize) => {
                            setPage(nextPage);
                            setPageSize(nextPageSize);
                            void loadData(nextPage, nextPageSize);
                        },
                    }}
                    scroll={{ x: 960 }}
                />
            </Card>

            <Drawer
                title="Pending Payments"
                placement="right"
                size={pendingDrawerSize}
                onClose={() => setPendingDrawerOpen(false)}
                open={pendingDrawerOpen}
                extra={
                    <Button
                        loading={reconcileLoading}
                        onClick={async () => {
                            setReconcileLoading(true);
                            const res = await runPreorderReconciliationNow(100);
                            if (res.success) {
                                const summary = res.data?.summary;
                                message.success(
                                    summary
                                        ? `Reconcile xong: scanned=${summary.scanned}, fixed=${summary.fixed}, skipped=${summary.skipped}, errors=${summary.errors}`
                                        : res.message
                                );
                                void loadData(page, pageSize);
                                void loadPendingData(pendingPage, pendingPageSize);
                            } else {
                                message.error(res.message);
                            }
                            setReconcileLoading(false);
                        }}
                    >
                        Chạy Reconcile Ngay
                    </Button>
                }
            >
                <Space wrap style={{ marginBottom: 12 }}>
                    <Select
                        value={pendingPurpose}
                        onChange={(value) => setPendingPurpose(value)}
                        style={{ width: 220 }}
                        options={[
                            { value: 'ALL', label: 'Tất cả' },
                            { value: 'PREORDER_DEPOSIT', label: 'Preorder Deposit' },
                            { value: 'WALLET_TOPUP', label: 'Wallet Topup' },
                            { value: 'WITHDRAWAL', label: 'Withdrawal' },
                            { value: 'VIP_PURCHASE', label: 'VIP Purchase' },
                        ]}
                    />
                    <Input.Search
                        value={pendingSearch}
                        onChange={(e) => setPendingSearch(e.target.value)}
                        onSearch={() => {
                            setPendingPage(1);
                            void loadPendingData(1, pendingPageSize);
                        }}
                        placeholder="Tìm theo user/email/mã giao dịch"
                        style={{ width: 320, maxWidth: '100%' }}
                        allowClear
                    />
                    <Button
                        onClick={() => {
                            setPendingPage(1);
                            void loadPendingData(1, pendingPageSize);
                        }}
                    >
                        Refresh
                    </Button>
                </Space>

                <Space wrap style={{ marginBottom: 12 }}>
                    {Object.entries(pendingByPurpose).map(([type, payload]) => (
                        <Tag key={type} color="gold">
                            {type}: {payload.count} | {formatMoney(payload.amount)}
                        </Tag>
                    ))}
                </Space>

                <Table
                    rowKey={(row) => `${row.source}-${row.id}`}
                    columns={pendingColumns}
                    dataSource={pendingOrders}
                    loading={loading}
                    pagination={{
                        current: pendingPage,
                        pageSize: pendingPageSize,
                        total: pendingTotal,
                        showSizeChanger: true,
                        onChange: (nextPage, nextPageSize) => {
                            setPendingPage(nextPage);
                            setPendingPageSize(nextPageSize);
                            void loadPendingData(nextPage, nextPageSize);
                        },
                    }}
                    scroll={{ x: 960 }}
                />
            </Drawer>

            <Modal
                title="Xác nhận hủy đơn pending"
                open={cancelModalOpen}
                onCancel={() => {
                    if (actionLoadingId) return;
                    setCancelModalOpen(false);
                    setCancelTarget(null);
                    setCancelReason('');
                }}
                onOk={async () => {
                    if (!cancelTarget) return;
                    setActionLoadingId(cancelTarget.id);
                    const source = cancelTarget.source === 'PAYMENT_ORDER' ? 'PAYMENT_ORDER' : 'WALLET_TRANSACTION';
                    const res = await cancelPendingPaymentOrder(source, cancelTarget.id, cancelReason);
                    if (res.success) {
                        message.success(res.message);
                        setCancelModalOpen(false);
                        setCancelTarget(null);
                        setCancelReason('');
                        void loadPendingData(pendingPage, pendingPageSize);
                        void loadData(page, pageSize);
                    } else {
                        message.error(res.message);
                    }
                    setActionLoadingId(null);
                }}
                okText="Xác nhận hủy"
                cancelText="Đóng"
                okButtonProps={{ danger: true, loading: Boolean(actionLoadingId) }}
                destroyOnHidden
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text>
                        Bạn sắp hủy đơn: <Text strong>{cancelTarget?.orderCode || cancelTarget?.id || 'N/A'}</Text>
                    </Text>
                    <Input.TextArea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Nhập lý do hủy (không bắt buộc)"
                        maxLength={180}
                        showCount
                        autoSize={{ minRows: 3, maxRows: 5 }}
                    />
                </Space>
            </Modal>
        </div>
    );
}
