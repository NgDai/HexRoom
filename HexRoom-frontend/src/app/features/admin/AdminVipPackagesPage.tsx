import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Segmented,
    Select,
    Statistic,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    createAdminVipPackage,
    getAdminVipPackages,
    getAdminVipPurchases,
    refundAdminVipPurchase,
    updateAdminVipPackage,
    type AdminVipPackage,
    type AdminVipPurchase,
} from './shared/admin-api';

const { Title, Text } = Typography;

const REFUND_REASON_OPTIONS = [
    { value: 'CUSTOMER_REQUEST', label: 'Khách hàng yêu cầu' },
    { value: 'DUPLICATE_PAYMENT', label: 'Thanh toán trùng' },
    { value: 'SYSTEM_ERROR', label: 'Lỗi hệ thống' },
    { value: 'FRAUD_SUSPECT', label: 'Nghi ngờ gian lận' },
    { value: 'OTHER', label: 'Khác (bắt buộc mô tả rõ)' },
] as const;

function formatMoney(value: number | null | undefined) {
    return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
}

function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}

export function AdminVipPackagesPage() {
    const [activeTab, setActiveTab] = useState<'packages' | 'purchases'>('packages');

    const [loadingPackages, setLoadingPackages] = useState(false);
    const [packages, setPackages] = useState<AdminVipPackage[]>([]);
    const [packagePage, setPackagePage] = useState(1);
    const [packageLimit, setPackageLimit] = useState(10);
    const [packageTotal, setPackageTotal] = useState(0);
    const [packageSearch, setPackageSearch] = useState('');
    const [packageRole, setPackageRole] = useState<'ALL' | 'TENANT' | 'LANDLORD'>('ALL');
    const [packageStatus, setPackageStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [purchases, setPurchases] = useState<AdminVipPurchase[]>([]);
    const [purchasePage, setPurchasePage] = useState(1);
    const [purchaseLimit, setPurchaseLimit] = useState(20);
    const [purchaseTotal, setPurchaseTotal] = useState(0);
    const [purchaseSearch, setPurchaseSearch] = useState('');
    const [purchaseStatus, setPurchaseStatus] = useState<string>('ALL');
    const [purchaseRefundStatus, setPurchaseRefundStatus] = useState<string>('ALL');
    const [purchaseSummary, setPurchaseSummary] = useState({
        revenueSuccessAmount: 0,
        refundSuccessCount: 0,
        activeVipUsers: 0,
    });

    const [packageModalOpen, setPackageModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<AdminVipPackage | null>(null);
    const [packageSubmitting, setPackageSubmitting] = useState(false);
    const [packageForm] = Form.useForm();

    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [refundTarget, setRefundTarget] = useState<AdminVipPurchase | null>(null);
    const [refundSubmitting, setRefundSubmitting] = useState(false);
    const [refundForm] = Form.useForm();

    const loadPackages = async (nextPage = packagePage, nextLimit = packageLimit) => {
        setLoadingPackages(true);
        const result = await getAdminVipPackages({
            page: nextPage,
            limit: nextLimit,
            search: packageSearch || undefined,
            targetRole: packageRole === 'ALL' ? undefined : packageRole,
            status: packageStatus === 'ALL' ? undefined : packageStatus,
        });
        setPackages(result.data);
        setPackageTotal(result.pagination.total || 0);
        setLoadingPackages(false);
    };

    const loadPurchases = async (nextPage = purchasePage, nextLimit = purchaseLimit) => {
        setLoadingPurchases(true);
        const result = await getAdminVipPurchases({
            page: nextPage,
            limit: nextLimit,
            search: purchaseSearch || undefined,
            status: purchaseStatus === 'ALL' ? undefined : purchaseStatus,
            refundStatus: purchaseRefundStatus === 'ALL' ? undefined : purchaseRefundStatus,
        });
        setPurchases(result.data);
        setPurchaseSummary(result.summary);
        setPurchaseTotal(result.pagination.total || 0);
        setLoadingPurchases(false);
    };

    useEffect(() => {
        void loadPackages(1, packageLimit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeTab === 'purchases' && purchases.length === 0) {
            void loadPurchases(1, purchaseLimit);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (!packageModalOpen) return;
        if (editingPackage) {
            packageForm.setFieldsValue({
                name: editingPackage.name,
                durationDays: editingPackage.durationDays,
                price: editingPackage.price,
                description: editingPackage.description || '',
                targetRole: editingPackage.targetRole,
                isActive: editingPackage.isActive,
            });
            return;
        }
        packageForm.setFieldsValue({
            name: '',
            durationDays: 30,
            price: 99000,
            description: '',
            targetRole: 'TENANT',
            isActive: true,
        });
    }, [packageModalOpen, editingPackage, packageForm]);

    useEffect(() => {
        if (!refundModalOpen || !refundTarget) return;
        refundForm.setFieldsValue({
            amount: refundTarget.amount,
            reasonCode: 'CUSTOMER_REQUEST',
            reason: '',
            revokeVip: false,
        });
    }, [refundModalOpen, refundTarget, refundForm]);

    const openCreatePackage = () => {
        setEditingPackage(null);
        setPackageModalOpen(true);
    };

    const openEditPackage = (pkg: AdminVipPackage) => {
        setEditingPackage(pkg);
        setPackageModalOpen(true);
    };

    const submitPackage = async (values: {
        name: string;
        durationDays: number;
        price: number;
        description?: string;
        targetRole: 'TENANT' | 'LANDLORD';
        isActive: boolean;
    }) => {
        setPackageSubmitting(true);
        const payload = {
            name: values.name,
            durationDays: values.durationDays,
            price: values.price,
            description: values.description || '',
            targetRole: values.targetRole,
            isActive: values.isActive,
        };
        const result = editingPackage
            ? await updateAdminVipPackage(editingPackage.id, payload)
            : await createAdminVipPackage(payload);
        setPackageSubmitting(false);
        if (result.success) {
            message.success(result.message);
            setPackageModalOpen(false);
            void loadPackages();
            return;
        }
        message.error(result.message);
    };

    const togglePackageActive = async (pkg: AdminVipPackage, active: boolean) => {
        const result = await updateAdminVipPackage(pkg.id, { isActive: active });
        if (result.success) {
            message.success(result.message);
            void loadPackages();
            return;
        }
        message.error(result.message);
    };

    const openRefundModal = (item: AdminVipPurchase) => {
        setRefundTarget(item);
        setRefundModalOpen(true);
    };

    const submitRefund = async (values: {
        amount: number;
        reasonCode: 'CUSTOMER_REQUEST' | 'DUPLICATE_PAYMENT' | 'SYSTEM_ERROR' | 'FRAUD_SUSPECT' | 'OTHER';
        reason: string;
        revokeVip?: boolean;
    }) => {
        if (!refundTarget) return;
        setRefundSubmitting(true);
        const result = await refundAdminVipPurchase(refundTarget.id, {
            amount: values.amount,
            reasonCode: values.reasonCode,
            reason: values.reason,
            revokeVip: values.revokeVip,
        });
        setRefundSubmitting(false);
        if (result.success) {
            message.success(result.message);
            setRefundModalOpen(false);
            void loadPurchases();
            return;
        }
        message.error(result.message);
    };

    const packageColumns: ColumnsType<AdminVipPackage> = [
        {
            title: 'Tên gói',
            dataIndex: 'name',
            key: 'name',
            render: (_, row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{row.name}</div>
                    <Text type="secondary">{row.description || 'Không có mô tả'}</Text>
                </div>
            ),
        },
        {
            title: 'Đối tượng',
            dataIndex: 'targetRole',
            key: 'targetRole',
            width: 120,
            render: (value: string) => <Tag color={value === 'TENANT' ? 'blue' : 'purple'}>{value}</Tag>,
        },
        {
            title: 'Thời hạn',
            dataIndex: 'durationDays',
            key: 'durationDays',
            width: 120,
            render: (value: number) => `${value} ngày`,
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            width: 140,
            render: (value: number) => formatMoney(value),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 120,
            render: (value: boolean) => (
                <Tag color={value ? 'green' : 'default'}>{value ? 'Đang bán' : 'Tạm ẩn'}</Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 220,
            render: (_, row) => (
                <Space>
                    <Button size="small" onClick={() => openEditPackage(row)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title={row.isActive ? 'Ẩn gói VIP?' : 'Mở bán lại gói VIP?'}
                        onConfirm={() => void togglePackageActive(row, !row.isActive)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                    >
                        <Button size="small">{row.isActive ? 'Ẩn' : 'Mở bán'}</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const purchaseColumns: ColumnsType<AdminVipPurchase> = [
        {
            title: 'Mã đơn',
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 190,
            render: (value: string) => <Text code>{value}</Text>,
        },
        {
            title: 'Người dùng',
            key: 'user',
            render: (_, row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{row.user?.fullName || 'N/A'}</div>
                    <Text type="secondary">{row.user?.email || '-'}</Text>
                </div>
            ),
        },
        {
            title: 'Gói VIP',
            key: 'package',
            render: (_, row) => (
                <div>
                    <div>{row.package?.name || 'Không xác định'}</div>
                    <Text type="secondary">{row.package?.targetRole || '-'}</Text>
                </div>
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            width: 140,
            render: (value: number) => formatMoney(value),
        },
        {
            title: 'Thanh toán',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (value: string) => (
                <Tag color={value === 'SUCCESS' ? 'green' : value === 'PENDING' ? 'gold' : 'red'}>{value}</Tag>
            ),
        },
        {
            title: 'Hoàn tiền',
            key: 'refund',
            width: 160,
            render: (_, row) => (
                <div>
                    <Tag color={row.refund.status === 'SUCCESS' ? 'green' : 'default'}>{row.refund.status}</Tag>
                    {row.refund.amount != null && (
                        <div>
                            <Text type="secondary">{formatMoney(row.refund.amount)}</Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            render: (value: string | null) => formatDate(value),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 140,
            render: (_, row) => (
                <Button
                    size="small"
                    disabled={row.status !== 'SUCCESS' || row.refund.status === 'SUCCESS'}
                    onClick={() => openRefundModal(row)}
                >
                    Hoàn tiền
                </Button>
            ),
        },
    ];

    const packageSummary = useMemo(() => {
        const activeCount = packages.filter((item) => item.isActive).length;
        return {
            activeCount,
            inactiveCount: packages.length - activeCount,
        };
    }, [packages]);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Quản lý VIP</Title>
                    <Text type="secondary">Admin quản lý gói, lịch sử giao dịch và hoàn tiền VIP.</Text>
                </div>
                <Segmented
                    value={activeTab}
                    onChange={(v) => setActiveTab(v as 'packages' | 'purchases')}
                    options={[
                        { label: 'Gói VIP', value: 'packages' },
                        { label: 'Lịch sử mua VIP', value: 'purchases' },
                    ]}
                />
            </div>

            {activeTab === 'packages' && (
                <Card>
                    <Space wrap style={{ marginBottom: 12 }}>
                        <Input
                            placeholder="Tìm theo tên/mô tả"
                            value={packageSearch}
                            onChange={(e) => setPackageSearch(e.target.value)}
                            style={{ width: 260 }}
                        />
                        <Select
                            value={packageRole}
                            onChange={(v) => setPackageRole(v)}
                            style={{ width: 140 }}
                            options={[
                                { label: 'Tất cả role', value: 'ALL' },
                                { label: 'TENANT', value: 'TENANT' },
                                { label: 'LANDLORD', value: 'LANDLORD' },
                            ]}
                        />
                        <Select
                            value={packageStatus}
                            onChange={(v) => setPackageStatus(v)}
                            style={{ width: 140 }}
                            options={[
                                { label: 'Tất cả trạng thái', value: 'ALL' },
                                { label: 'Đang bán', value: 'ACTIVE' },
                                { label: 'Tạm ẩn', value: 'INACTIVE' },
                            ]}
                        />
                        <Button
                            type="primary"
                            onClick={() => {
                                setPackagePage(1);
                                void loadPackages(1, packageLimit);
                            }}
                        >
                            Lọc
                        </Button>
                        <Button onClick={openCreatePackage}>Tạo gói VIP</Button>
                    </Space>

                    <Space style={{ marginBottom: 12 }}>
                        <Tag color="green">Đang bán: {packageSummary.activeCount}</Tag>
                        <Tag>Tạm ẩn: {packageSummary.inactiveCount}</Tag>
                        <Tag>Tổng: {packageTotal}</Tag>
                    </Space>

                    <Table
                        rowKey="id"
                        columns={packageColumns}
                        dataSource={packages}
                        loading={loadingPackages}
                        pagination={{
                            current: packagePage,
                            pageSize: packageLimit,
                            total: packageTotal,
                            showSizeChanger: true,
                            onChange: (nextPage, nextLimit) => {
                                setPackagePage(nextPage);
                                setPackageLimit(nextLimit);
                                void loadPackages(nextPage, nextLimit);
                            },
                        }}
                        scroll={{ x: 980 }}
                    />
                </Card>
            )}

            {activeTab === 'purchases' && (
                <Card>
                    <Space wrap style={{ marginBottom: 12 }}>
                        <Input
                            placeholder="Tìm theo tên, email hoặc mã đơn"
                            value={purchaseSearch}
                            onChange={(e) => setPurchaseSearch(e.target.value)}
                            style={{ width: 300 }}
                        />
                        <Select
                            value={purchaseStatus}
                            onChange={(v) => setPurchaseStatus(v)}
                            style={{ width: 140 }}
                            options={[
                                { label: 'Mọi trạng thái', value: 'ALL' },
                                { label: 'SUCCESS', value: 'SUCCESS' },
                                { label: 'PENDING', value: 'PENDING' },
                                { label: 'FAILED', value: 'FAILED' },
                                { label: 'CANCELLED', value: 'CANCELLED' },
                            ]}
                        />
                        <Select
                            value={purchaseRefundStatus}
                            onChange={(v) => setPurchaseRefundStatus(v)}
                            style={{ width: 180 }}
                            options={[
                                { label: 'Mọi trạng thái refund', value: 'ALL' },
                                { label: 'NOT_REQUESTED', value: 'NOT_REQUESTED' },
                                { label: 'SUCCESS', value: 'SUCCESS' },
                                { label: 'FAILED', value: 'FAILED' },
                                { label: 'CANCELLED', value: 'CANCELLED' },
                            ]}
                        />
                        <Button
                            type="primary"
                            onClick={() => {
                                setPurchasePage(1);
                                void loadPurchases(1, purchaseLimit);
                            }}
                        >
                            Lọc
                        </Button>
                    </Space>

                    <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                        <Col xs={24} sm={12} lg={8}>
                            <Card size="small">
                                <Statistic
                                    title="Doanh thu VIP (đã thanh toán)"
                                    value={purchaseSummary.revenueSuccessAmount}
                                    formatter={(value) => formatMoney(Number(value || 0))}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={8}>
                            <Card size="small">
                                <Statistic
                                    title="Số giao dịch đã refund"
                                    value={purchaseSummary.refundSuccessCount}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={8}>
                            <Card size="small">
                                <Statistic
                                    title="Active VIP snapshot"
                                    value={purchaseSummary.activeVipUsers}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Table
                        rowKey="id"
                        columns={purchaseColumns}
                        dataSource={purchases}
                        loading={loadingPurchases}
                        pagination={{
                            current: purchasePage,
                            pageSize: purchaseLimit,
                            total: purchaseTotal,
                            showSizeChanger: true,
                            onChange: (nextPage, nextLimit) => {
                                setPurchasePage(nextPage);
                                setPurchaseLimit(nextLimit);
                                void loadPurchases(nextPage, nextLimit);
                            },
                        }}
                        scroll={{ x: 1300 }}
                    />
                </Card>
            )}

            <Modal
                title={editingPackage ? 'Cập nhật gói VIP' : 'Tạo gói VIP mới'}
                open={packageModalOpen}
                onCancel={() => setPackageModalOpen(false)}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={packageForm}
                    layout="vertical"
                    onFinish={(values) => void submitPackage(values)}
                >
                    <Form.Item
                        label="Tên gói"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên gói' }]}
                    >
                        <Input maxLength={100} />
                    </Form.Item>
                    <Form.Item
                        label="Mô tả"
                        name="description"
                    >
                        <Input.TextArea rows={3} maxLength={300} />
                    </Form.Item>
                    <Space style={{ width: '100%' }} size={12}>
                        <Form.Item
                            label="Thời hạn (ngày)"
                            name="durationDays"
                            rules={[{ required: true, message: 'Nhập thời hạn' }]}
                        >
                            <InputNumber min={1} max={3650} style={{ width: 160 }} />
                        </Form.Item>
                        <Form.Item
                            label="Giá (VND)"
                            name="price"
                            rules={[{ required: true, message: 'Nhập giá gói' }]}
                        >
                            <InputNumber min={1000} step={1000} style={{ width: 180 }} />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }} size={12}>
                        <Form.Item
                            label="Đối tượng"
                            name="targetRole"
                            rules={[{ required: true, message: 'Chọn đối tượng' }]}
                        >
                            <Select
                                style={{ width: 180 }}
                                options={[
                                    { label: 'TENANT', value: 'TENANT' },
                                    { label: 'LANDLORD', value: 'LANDLORD' },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item label="Trạng thái bán" name="isActive" valuePropName="checked">
                            <Switch checkedChildren="Đang bán" unCheckedChildren="Tạm ẩn" />
                        </Form.Item>
                    </Space>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setPackageModalOpen(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit" loading={packageSubmitting}>
                                {editingPackage ? 'Lưu thay đổi' : 'Tạo gói'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Hoàn tiền giao dịch VIP"
                open={refundModalOpen}
                onCancel={() => setRefundModalOpen(false)}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={refundForm}
                    layout="vertical"
                    onFinish={(values) => void submitRefund(values)}
                >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        Policy: hoàn tiền cần chọn mã lý do và mô tả tối thiểu 12 ký tự.
                    </Text>
                    <Form.Item label="Mã đơn">
                        <Input value={refundTarget?.orderCode || ''} disabled />
                    </Form.Item>
                    <Form.Item
                        label="Số tiền hoàn (VND)"
                        name="amount"
                        rules={[{ required: true, message: 'Vui lòng nhập số tiền hoàn' }]}
                    >
                        <InputNumber min={1000} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        label="Mã lý do hoàn tiền"
                        name="reasonCode"
                        rules={[{ required: true, message: 'Vui lòng chọn mã lý do' }]}
                    >
                        <Select
                            options={REFUND_REASON_OPTIONS.map((item) => ({
                                value: item.value,
                                label: item.label,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Lý do"
                        name="reason"
                        rules={[
                            { required: true, message: 'Vui lòng nhập lý do hoàn tiền' },
                            { min: 12, message: 'Lý do tối thiểu 12 ký tự' },
                        ]}
                    >
                        <Input.TextArea rows={3} maxLength={200} placeholder="Nhập lý do hoàn tiền" />
                    </Form.Item>
                    <Form.Item name="revokeVip" valuePropName="checked">
                        <Switch checkedChildren="Thu hồi VIP" unCheckedChildren="Giữ VIP" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setRefundModalOpen(false)}>Hủy</Button>
                            <Button type="primary" danger htmlType="submit" loading={refundSubmitting}>
                                Xác nhận hoàn tiền
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
