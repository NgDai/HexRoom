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
    Select,
    message,
    Popconfirm,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import {
    getLocations,
    getCities,
    createLocation,
    updateLocation,
    deleteLocation,
    type Location,
} from './shared/admin-api';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;
const { Option } = Select;

export function AdminLocationsPage() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<Location[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [cityFilter, setCityFilter] = useState<string | undefined>();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [form] = Form.useForm();

    // Load cities once on mount
    useEffect(() => {
        let cancelled = false;
        const fetchCities = async () => {
            const data = await getCities();
            if (!cancelled) {
                setCities(data);
            }
        };
        fetchCities();
        return () => { cancelled = true; };
    }, []);

    // Load locations when cityFilter changes
    useEffect(() => {
        let cancelled = false;
        const fetchLocations = async () => {
            setLoading(true);
            const data = await getLocations(cityFilter);
            if (!cancelled) {
                setLocations(data);
                setLoading(false);
            }
        };
        fetchLocations();
        return () => { cancelled = true; };
    }, [cityFilter]);

    const loadLocations = async () => {
        setLoading(true);
        const data = await getLocations(cityFilter);
        setLocations(data);
        setLoading(false);
    };

    const loadCities = async () => {
        const data = await getCities();
        setCities(data);
    };

    const openCreateModal = () => {
        setEditingLocation(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (location: Location) => {
        setEditingLocation(location);
        form.setFieldsValue({
            city: location.city,
            district: location.district,
            address: location.address,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: { city?: string; district?: string; address: string }) => {
        setModalLoading(true);
        let result;

        if (editingLocation) {
            result = await updateLocation(editingLocation.id, values);
        } else {
            result = await createLocation(values);
        }

        setModalLoading(false);

        if (result.success) {
            message.success(result.message);
            setModalOpen(false);
            loadLocations();
            loadCities(); // Refresh cities list
        } else {
            message.error(result.message);
        }
    };

    const handleDelete = async (location: Location) => {
        const result = await deleteLocation(location.id);
        if (result.success) {
            message.success(result.message);
            loadLocations();
            loadCities();
        } else {
            message.error(result.message);
        }
    };

    const columns: ColumnsType<Location> = [
        {
            title: t('admin.locations.table.city'),
            dataIndex: 'city',
            key: 'city',
            render: (city) => city ? <Tag color="blue">{city}</Tag> : t('admin.locations.table.empty'),
        },
        {
            title: t('admin.locations.table.district'),
            dataIndex: 'district',
            key: 'district',
            render: (district) => district ? <Tag color="green">{district}</Tag> : t('admin.locations.table.empty'),
        },
        {
            title: t('admin.locations.table.address'),
            dataIndex: 'address',
            key: 'address',
            render: (address) => address || t('admin.locations.table.empty'),
        },
        {
            title: t('admin.locations.table.actions'),
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                        title={t('admin.locations.actions.edit')}
                    />
                    <Popconfirm
                        title={t('admin.locations.actions.confirmDeleteTitle')}
                        description={t('admin.locations.actions.confirmDeleteDescription', {
                            city: record.city || t('admin.locations.table.empty'),
                            district: record.district || t('admin.locations.table.empty'),
                        })}
                        onConfirm={() => handleDelete(record)}
                        okText={t('admin.locations.actions.delete')}
                        cancelText={t('admin.locations.actions.cancel')}
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title={t('admin.locations.actions.delete')}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>{t('admin.locations.title')}</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    {t('admin.locations.actions.add')}
                </Button>
            </div>

            {/* Filter */}
            <Card style={{ marginBottom: 16 }}>
                <Space>
                    <span>{t('admin.locations.filters.byCity')}</span>
                    <Select
                        placeholder={t('admin.locations.filters.allCities')}
                        value={cityFilter}
                        onChange={setCityFilter}
                        style={{ width: 200 }}
                        allowClear
                    >
                        {cities.map((city) => (
                            <Option key={city} value={city}>
                                {city}
                            </Option>
                        ))}
                    </Select>
                </Space>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    dataSource={locations}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => t('admin.locations.totalText', { total }),
                    }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingLocation ? t('admin.locations.modal.editTitle') : t('admin.locations.modal.createTitle')}
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
                        name="address"
                        label={t('admin.locations.form.addressLabel')}
                        rules={[{ required: true, message: t('admin.locations.form.addressRequired') }]}
                    >
                        <Input placeholder={t('admin.locations.form.addressPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="city"
                        label={t('admin.locations.form.cityLabel')}
                    >
                        <Input placeholder={t('admin.locations.form.cityPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="district"
                        label={t('admin.locations.form.districtLabel')}
                    >
                        <Input placeholder={t('admin.locations.form.districtPlaceholder')} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>{t('admin.locations.actions.cancel')}</Button>
                            <Button type="primary" htmlType="submit" loading={modalLoading}>
                                {editingLocation ? t('admin.locations.actions.update') : t('admin.locations.actions.create')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
