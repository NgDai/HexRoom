import { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Typography,
    Modal,
    Form,
    Input,
    message,
    Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import {
    getAmenities,
    createAmenity,
    updateAmenity,
    deleteAmenity,
    type Amenity,
} from './shared/admin-api';

const { Title } = Typography;

export function AdminAmenitiesPage() {
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [form] = Form.useForm();

    // Initial load - empty dependency array, only runs once
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            const data = await getAmenities();
            if (!cancelled) {
                setAmenities(data);
                setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    const loadAmenities = async () => {
        setLoading(true);
        const data = await getAmenities();
        setAmenities(data);
        setLoading(false);
    };

    const openCreateModal = () => {
        setEditingAmenity(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (amenity: Amenity) => {
        setEditingAmenity(amenity);
        form.setFieldsValue({
            name: amenity.name,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: { name: string }) => {
        setModalLoading(true);
        let result;

        if (editingAmenity) {
            result = await updateAmenity(editingAmenity.id, values);
        } else {
            result = await createAmenity(values);
        }

        setModalLoading(false);

        if (result.success) {
            message.success(result.message);
            setModalOpen(false);
            loadAmenities();
        } else {
            message.error(result.message);
        }
    };

    const handleDelete = async (amenity: Amenity) => {
        const result = await deleteAmenity(amenity.id);
        if (result.success) {
            message.success(result.message);
            loadAmenities();
        } else {
            message.error(result.message);
        }
    };

    const columns: ColumnsType<Amenity> = [
        {
            title: 'Tên tiện nghi',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                        title="Sửa"
                    />
                    <Popconfirm
                        title="Xóa tiện nghi này?"
                        description={`Bạn có chắc muốn xóa "${record.name}"?`}
                        onConfirm={() => handleDelete(record)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title="Xóa"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Quản lý Tiện nghi</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Thêm tiện nghi
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={amenities}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Tổng ${total} tiện nghi`,
                    }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingAmenity ? 'Sửa tiện nghi' : 'Thêm tiện nghi mới'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="name"
                        label="Tên tiện nghi"
                        rules={[{ required: true, message: 'Vui lòng nhập tên tiện nghi' }]}
                    >
                        <Input placeholder="VD: WiFi, Điều hòa, Máy giặt..." />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit" loading={modalLoading}>
                                {editingAmenity ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
