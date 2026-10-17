import { useState, useMemo, useEffect } from 'react';
import {
    Table,
    Card,
    Row,
    Col,
    Statistic,
    Tag,
    Space,
    Button,
    Input,
    Select,
    Modal,
    Form,
    Rate,
    Typography,
    Tooltip,
    message,
    Divider,
} from 'antd';
import {
    SearchOutlined,
    PhoneOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    UserOutlined,
    PlusOutlined,
    EditOutlined,
    StarOutlined,
    DollarOutlined,
    HomeOutlined,
    MessageOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import {
    getViewingHistory,
    saveViewingAppointment,
    updateViewingAppointment,
    getViewingStats,
    type RoomViewingAppointment,
} from '@/lib/room-viewing-history';

const { Title, Text, Paragraph } = Typography;

export function ViewingHistoryPage() {
    const [appointments, setAppointments] = useState<RoomViewingAppointment[]>([]);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RoomViewingAppointment | null>(null);

    const [editForm] = Form.useForm();
    const [createForm] = Form.useForm();

    const loadData = () => {
        const data = getViewingHistory();
        setAppointments(data);
    };

    useEffect(() => {
        loadData();
    }, []);

    const stats = useMemo(() => getViewingStats(appointments), [appointments]);

    const filteredData = useMemo(() => {
        return appointments.filter((item) => {
            const matchSearch =
                !searchText ||
                item.tenantName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.tenantPhone.includes(searchText) ||
                item.roomName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.rentalTitle.toLowerCase().includes(searchText.toLowerCase()) ||
                (item.feedbackNote && item.feedbackNote.toLowerCase().includes(searchText.toLowerCase()));

            const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
            const matchOutcome = outcomeFilter === 'ALL' || item.outcome === outcomeFilter;

            return matchSearch && matchStatus && matchOutcome;
        });
    }, [appointments, searchText, statusFilter, outcomeFilter]);

    const handleOpenEdit = (record: RoomViewingAppointment) => {
        setEditingItem(record);
        editForm.setFieldsValue({
            status: record.status,
            outcome: record.outcome,
            visitedAt: record.visitedAt || '',
            feedbackNote: record.feedbackNote || '',
            depositAmount: record.depositAmount || undefined,
            ratingFromTenant: record.ratingFromTenant || 5,
            hostOrStaff: record.hostOrStaff,
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            if (!editingItem) return;

            const updatedList = updateViewingAppointment(editingItem.id, {
                status: values.status,
                outcome: values.outcome,
                visitedAt: values.visitedAt || undefined,
                feedbackNote: values.feedbackNote,
                depositAmount: values.depositAmount ? Number(values.depositAmount) : undefined,
                ratingFromTenant: values.ratingFromTenant,
                hostOrStaff: values.hostOrStaff,
            });

            setAppointments(updatedList);
            setIsEditModalOpen(false);
            message.success('Đã cập nhật trạng thái buổi coi phòng thành công!');
        } catch {
            // form validation error
        }
    };

    const handleCreateNew = async () => {
        try {
            const values = await createForm.validateFields();
            const newItem = saveViewingAppointment({
                tenantName: values.tenantName,
                tenantPhone: values.tenantPhone,
                tenantEmail: values.tenantEmail,
                roomName: values.roomName,
                rentalTitle: values.rentalTitle || 'Nhà trọ HexRoom',
                rentalAddress: values.rentalAddress || 'TP. Hồ Chí Minh',
                appointmentDate: values.appointmentDate,
                appointmentTimeSlot: values.appointmentTimeSlot,
                status: values.status || 'COMPLETED',
                outcome: values.outcome || 'CONSIDERING',
                feedbackNote: values.feedbackNote || '',
                hostOrStaff: values.hostOrStaff || 'Chủ nhà trực tiếp',
                ratingFromTenant: values.ratingFromTenant || 5,
                depositAmount: values.depositAmount ? Number(values.depositAmount) : undefined,
            });

            setAppointments((prev) => [newItem, ...prev]);
            createForm.resetFields();
            setIsCreateModalOpen(false);
            message.success('Đã ghi nhận khách tới coi phòng mới thành công!');
        } catch {
            // form validation error
        }
    };

    return (
        <div style={{ padding: '4px 0', minHeight: '80vh' }}>
            {/* Header with Title and Create Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                    <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                        📋 Lịch sử khách tới coi phòng
                    </Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        Theo dõi danh sách khách xem phòng trực tiếp, ghi nhận phản hồi và tỷ lệ chốt cọc
                    </Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8, height: 40, fontWeight: 600 }}
                >
                    + Ghi nhận khách tới coi phòng
                </Button>
            </div>

            {/* Overview Metric Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#475569' }}>Tổng lượt hẹn coi phòng</span>}
                            value={stats.total}
                            prefix={<CalendarOutlined style={{ color: '#1677ff' }} />}
                            styles={{ content: { fontWeight: 800, color: '#0f172a' } }}
                        />
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                            Bao gồm đặt trước qua app & khách vãng lai
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#475569' }}>Đã tới coi trực tiếp</span>}
                            value={stats.completed}
                            prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                            styles={{ content: { fontWeight: 800, color: '#10b981' } }}
                        />
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                            Khách đã đến khảo sát và xem phòng thực địa
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#475569' }}>Đã chốt cọc giữ phòng</span>}
                            value={stats.depositPaid}
                            prefix={<DollarOutlined style={{ color: '#f59e0b' }} />}
                            styles={{ content: { fontWeight: 800, color: '#d97706' } }}
                        />
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                            Tỷ lệ chốt sau khi coi: <strong style={{ color: '#10b981' }}>{stats.conversionRate}%</strong>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#475569' }}>Lịch hẹn sắp tới</span>}
                            value={stats.upcoming}
                            prefix={<ClockCircleOutlined style={{ color: '#7c3aed' }} />}
                            styles={{ content: { fontWeight: 800, color: '#7c3aed' } }}
                        />
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                            Đánh giá phòng: <strong style={{ color: '#eab308' }}>⭐ {stats.avgRating}/5</strong>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Filter and Search Bar */}
            <Card variant="borderless" style={{ marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1, minWidth: 280 }}>
                        <Input
                            placeholder="Tìm theo tên khách, số điện thoại, tên phòng, ghi chú..."
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 340, borderRadius: 8 }}
                            allowClear
                        />

                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 180 }}
                            options={[
                                { label: 'Tất cả trạng thái', value: 'ALL' },
                                { label: '✅ Đã tới coi', value: 'COMPLETED' },
                                { label: '📅 Đã hẹn (Sắp tới)', value: 'CONFIRMED' },
                                { label: '⏳ Chờ xác nhận', value: 'PENDING' },
                                { label: '❌ Không đến (No show)', value: 'NO_SHOW' },
                                { label: '🚫 Đã hủy', value: 'CANCELLED' },
                            ]}
                        />

                        <Select
                            value={outcomeFilter}
                            onChange={setOutcomeFilter}
                            style={{ width: 190 }}
                            options={[
                                { label: 'Tất cả kết quả', value: 'ALL' },
                                { label: '💰 Đã chốt cọc', value: 'DEPOSIT_PAID' },
                                { label: '🤔 Đang cân nhắc', value: 'CONSIDERING' },
                                { label: '👥 Hẹn dẫn bạn coi lại', value: 'FOLLOW_UP' },
                                { label: '⚠️ Chưa phù hợp', value: 'NOT_SUITABLE' },
                                { label: '⏳ Chờ buổi hẹn', value: 'PENDING' },
                            ]}
                        />
                    </div>

                    <div style={{ fontSize: 13, color: '#64748b' }}>
                        Hiển thị <strong>{filteredData.length}</strong> / {appointments.length} lượt coi phòng
                    </div>
                </div>
            </Card>

            {/* Main Viewing History Table */}
            <Card variant="borderless" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                <Table
                    dataSource={filteredData}
                    rowKey="id"
                    pagination={{ pageSize: 6, showSizeChanger: true, pageSizeOptions: ['6', '12', '24'] }}
                    scroll={{ x: 1050 }}
                    columns={[
                        {
                            title: 'Khách coi phòng',
                            key: 'tenant',
                            width: 220,
                            render: (_, record: RoomViewingAppointment) => (
                                <Space size={12} align="center">
                                    <img
                                        src={record.tenantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80'}
                                        alt={record.tenantName}
                                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80';
                                        }}
                                    />
                                    <div>
                                        <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>
                                            {record.tenantName}
                                        </Text>
                                        <Space size={6} style={{ marginTop: 2 }}>
                                            <a
                                                href={`tel:${record.tenantPhone}`}
                                                style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                                title="Gọi điện cho khách"
                                            >
                                                <PhoneOutlined /> {record.tenantPhone}
                                            </a>
                                        </Space>
                                    </div>
                                </Space>
                            ),
                        },
                        {
                            title: 'Phòng & Nhà trọ',
                            key: 'room',
                            width: 260,
                            render: (_, record: RoomViewingAppointment) => (
                                <div>
                                    <Text strong style={{ fontSize: 13.5, color: '#1e293b', display: 'block' }}>
                                        {record.roomName}
                                    </Text>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <HomeOutlined style={{ color: '#94a3b8' }} />
                                        <span>{record.rentalTitle}</span>
                                    </div>
                                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                                        {record.rentalAddress}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            title: 'Thời gian coi phòng',
                            key: 'time',
                            width: 190,
                            render: (_, record: RoomViewingAppointment) => (
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                        📅 {record.appointmentDate}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                                        🕒 {record.appointmentTimeSlot}
                                    </div>
                                    {record.visitedAt && (
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                            Khách đến: {record.visitedAt}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                        Dẫn xem: {record.hostOrStaff}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            title: 'Trạng thái & Kết quả',
                            key: 'statusOutcome',
                            width: 200,
                            render: (_, record: RoomViewingAppointment) => {
                                const statusMap: Record<string, { color: string; label: string }> = {
                                    COMPLETED: { color: 'green', label: '✅ Đã tới coi' },
                                    CONFIRMED: { color: 'blue', label: '📅 Đã hẹn (Sắp tới)' },
                                    PENDING: { color: 'gold', label: '⏳ Chờ xác nhận' },
                                    CANCELLED: { color: 'red', label: '🚫 Đã hủy' },
                                    NO_SHOW: { color: 'default', label: '❌ Không đến' },
                                };

                                const outcomeMap: Record<string, { color: string; label: string }> = {
                                    DEPOSIT_PAID: { color: 'success', label: '💰 Đã chốt cọc' },
                                    CONSIDERING: { color: 'processing', label: '🤔 Đang cân nhắc' },
                                    FOLLOW_UP: { color: 'purple', label: '👥 Hẹn xem lại' },
                                    NOT_SUITABLE: { color: 'warning', label: '⚠️ Chưa phù hợp' },
                                    PENDING: { color: 'default', label: '⏳ Chờ xem' },
                                };

                                const s = statusMap[record.status] || { color: 'default', label: record.status };
                                const o = outcomeMap[record.outcome] || { color: 'default', label: record.outcome };

                                return (
                                    <Space direction="vertical" size={4}>
                                        <Tag color={s.color} style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px' }}>
                                            {s.label}
                                        </Tag>
                                        <Tag color={o.color} style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px' }}>
                                            {o.label}
                                        </Tag>
                                        {record.depositAmount && (
                                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                                                +{record.depositAmount.toLocaleString('vi-VN')} đ cọc
                                            </span>
                                        )}
                                    </Space>
                                );
                            },
                        },
                        {
                            title: 'Đánh giá & Ghi chú thực tế',
                            key: 'feedback',
                            render: (_, record: RoomViewingAppointment) => (
                                <div>
                                    {record.ratingFromTenant && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                            <Rate disabled allowHalf value={record.ratingFromTenant} style={{ fontSize: 13, color: '#f59e0b' }} />
                                            <Text strong style={{ fontSize: 12, color: '#d97706' }}>
                                                {record.ratingFromTenant.toFixed(1)}
                                            </Text>
                                        </div>
                                    )}
                                    <Paragraph
                                        style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}
                                        ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}
                                    >
                                        {record.feedbackNote || 'Chưa có ghi chú.'}
                                    </Paragraph>
                                </div>
                            ),
                        },
                        {
                            title: 'Thao tác',
                            key: 'actions',
                            width: 130,
                            fixed: 'right',
                            render: (_, record: RoomViewingAppointment) => (
                                <Space direction="vertical" size={6}>
                                    <Button
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => handleOpenEdit(record)}
                                        style={{ borderRadius: 6, fontSize: 12 }}
                                    >
                                        Cập nhật
                                    </Button>
                                    <Space size={4}>
                                        <Tooltip title="Gọi điện">
                                            <a
                                                href={`tel:${record.tenantPhone}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    background: '#ecfdf5',
                                                    color: '#059669',
                                                    border: '1px solid #a7f3d0',
                                                }}
                                            >
                                                <PhoneOutlined />
                                            </a>
                                        </Tooltip>
                                        <Tooltip title="Nhắn tin Zalo">
                                            <a
                                                href={`https://zalo.me/${record.tenantPhone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    background: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    border: '1px solid #bfdbfe',
                                                }}
                                            >
                                                <MessageOutlined />
                                            </a>
                                        </Tooltip>
                                    </Space>
                                </Space>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* Modal: Cập nhật trạng thái buổi xem phòng */}
            <Modal
                title="✏️ Cập nhật buổi coi phòng & Phản hồi của khách"
                open={isEditModalOpen}
                onOk={handleSaveEdit}
                onCancel={() => setIsEditModalOpen(false)}
                okText="Lưu cập nhật"
                cancelText="Hủy bỏ"
                okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
            >
                {editingItem && (
                    <div style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <Text strong style={{ fontSize: 14 }}>{editingItem.tenantName}</Text> — <span>{editingItem.tenantPhone}</span>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Phòng: <strong>{editingItem.roomName}</strong> ({editingItem.rentalTitle})
                        </div>
                    </div>
                )}

                <Form form={editForm} layout="vertical">
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="status" label="Trạng thái buổi xem" rules={[{ required: true }]}>
                                <Select
                                    options={[
                                        { label: '✅ Đã tới coi phòng', value: 'COMPLETED' },
                                        { label: '📅 Đã hẹn (Sắp tới)', value: 'CONFIRMED' },
                                        { label: '⏳ Chờ xác nhận', value: 'PENDING' },
                                        { label: '❌ Khách không đến (No show)', value: 'NO_SHOW' },
                                        { label: '🚫 Khách hủy hẹn', value: 'CANCELLED' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="outcome" label="Kết quả sau khi coi" rules={[{ required: true }]}>
                                <Select
                                    options={[
                                        { label: '💰 Đã chốt cọc giữ phòng', value: 'DEPOSIT_PAID' },
                                        { label: '🤔 Đang cân nhắc (ưng ý)', value: 'CONSIDERING' },
                                        { label: '👥 Hẹn dẫn bạn coi lại', value: 'FOLLOW_UP' },
                                        { label: '⚠️ Chưa phù hợp', value: 'NOT_SUITABLE' },
                                        { label: '⏳ Đang chờ xem phòng', value: 'PENDING' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="visitedAt" label="Thời gian thực tế khách đến">
                                <Input placeholder="Ví dụ: 17/10/2026 14:15" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="hostOrStaff" label="Người tiếp đón">
                                <Input placeholder="Ví dụ: Chủ nhà trực tiếp, A. Tuấn..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="depositAmount" label="Số tiền cọc thu được (VNĐ)">
                                <Input placeholder="Ví dụ: 2500000" type="number" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="ratingFromTenant" label="Mức độ hài lòng của khách">
                                <Rate allowHalf style={{ color: '#f59e0b' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="feedbackNote" label="Ghi chú phản hồi / Cảm nhận của khách sau khi coi">
                        <Input.TextArea
                            rows={3}
                            placeholder="Ghi nhận sở thích, yêu cầu tiện ích, lý do khách thích hoặc chưa chốt phòng..."
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal: Ghi nhận khách tới coi phòng mới */}
            <Modal
                title="➕ Ghi nhận lượt khách tới coi phòng mới"
                open={isCreateModalOpen}
                onOk={handleCreateNew}
                onCancel={() => setIsCreateModalOpen(false)}
                okText="Lưu ghi nhận"
                cancelText="Hủy bỏ"
                okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    initialValues={{
                        status: 'COMPLETED',
                        outcome: 'CONSIDERING',
                        appointmentDate: new Date().toISOString().split('T')[0],
                        appointmentTimeSlot: '14:00 - 16:00',
                        hostOrStaff: 'Chủ nhà trực tiếp',
                        ratingFromTenant: 5,
                    }}
                >
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="tenantName" label="Họ tên khách xem phòng" rules={[{ required: true, message: 'Vui lòng nhập tên khách' }]}>
                                <Input placeholder="Nguyễn Văn A" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tenantPhone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
                                <Input placeholder="0908 123 456" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="roomName" label="Phòng xem" rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}>
                                <Input placeholder="Phòng Studio P.302" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="rentalTitle" label="Thuộc khu nhà trọ">
                                <Input placeholder="Căn hộ Dịch vụ Bình Thạnh" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="appointmentDate" label="Ngày xem phòng" rules={[{ required: true }]}>
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="appointmentTimeSlot" label="Khung giờ" rules={[{ required: true }]}>
                                <Input placeholder="14:00 - 15:30" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                                <Select
                                    options={[
                                        { label: '✅ Đã tới coi phòng', value: 'COMPLETED' },
                                        { label: '📅 Đã hẹn (Sắp tới)', value: 'CONFIRMED' },
                                        { label: '⏳ Chờ xác nhận', value: 'PENDING' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="outcome" label="Kết quả" rules={[{ required: true }]}>
                                <Select
                                    options={[
                                        { label: '💰 Đã chốt cọc', value: 'DEPOSIT_PAID' },
                                        { label: '🤔 Đang cân nhắc', value: 'CONSIDERING' },
                                        { label: '👥 Hẹn xem lại', value: 'FOLLOW_UP' },
                                        { label: '⚠️ Chưa phù hợp', value: 'NOT_SUITABLE' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="depositAmount" label="Số tiền cọc nếu có (VNĐ)">
                                <Input placeholder="Ví dụ: 2000000" type="number" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="hostOrStaff" label="Người tiếp đón">
                                <Input placeholder="Chủ nhà trực tiếp" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="feedbackNote" label="Ghi chú & Đánh giá của khách">
                        <Input.TextArea rows={2} placeholder="Cảm nhận, phản hồi thực tế của khách về phòng..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
