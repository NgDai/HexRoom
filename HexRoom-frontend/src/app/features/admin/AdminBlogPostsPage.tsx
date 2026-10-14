import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { EditOutlined, PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { ImageUpload } from '@/app/components/ImageUpload';
import {
    createBlogPostRequest,
    deleteBlogPostRequest,
    getAdminBlogPostsRequest,
    updateBlogPostRequest,
    type BlogPostItem,
} from '@/lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'ARCHIVED', label: 'Lưu trữ' },
] as const;

const STATUS_COLOR: Record<string, string> = {
    DRAFT: 'default',
    PUBLISHED: 'green',
    ARCHIVED: 'volcano',
};

interface BlogFormValues {
    title: string;
    slug?: string;
    excerpt?: string;
    content: string;
    coverImageUrl?: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    categoryName?: string;
    tagNames?: string;
}

export function AdminBlogPostsPage() {
    const [form] = Form.useForm<BlogFormValues>();
    const coverImageUrl = Form.useWatch('coverImageUrl', form) || '';
    const [posts, setPosts] = useState<BlogPostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

    const loadPosts = async (page = 1) => {
        setLoading(true);
        const res = await getAdminBlogPostsRequest({
            page,
            limit: 10,
            search: appliedSearch || undefined,
            status: statusFilter as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
        });
        setPosts(res.data || []);
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        setLoading(false);
    };

    useEffect(() => {
        loadPosts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appliedSearch, statusFilter]);

    const openCreateModal = () => {
        setEditingPost(null);
        form.resetFields();
        form.setFieldsValue({ status: 'DRAFT' } as BlogFormValues);
        setModalOpen(true);
    };

    const openEditModal = (post: BlogPostItem) => {
        setEditingPost(post);
        form.setFieldsValue({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt || '',
            content: post.content,
            coverImageUrl: post.coverImageUrl || '',
            status: post.status,
            categoryName: post.category?.name || '',
            tagNames: post.tags.map((t) => t.name).join(', '),
        });
        setModalOpen(true);
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);
            const payload = {
                title: values.title,
                slug: values.slug || undefined,
                excerpt: values.excerpt || undefined,
                content: values.content,
                coverImageUrl: values.coverImageUrl || undefined,
                status: values.status,
                categoryName: values.categoryName || undefined,
                tagNames: values.tagNames
                    ? values.tagNames.split(',').map((t) => t.trim()).filter(Boolean)
                    : [],
            };

            if (editingPost) {
                await updateBlogPostRequest(editingPost.id, payload);
                message.success('Đã cập nhật bài viết');
            } else {
                await createBlogPostRequest(payload);
                message.success('Đã tạo bài viết');
            }

            setModalOpen(false);
            setEditingPost(null);
            form.resetFields();
            loadPosts(pagination.page || 1);
        } catch (err) {
            if (err instanceof Error) {
                message.error(err.message);
            }
        } finally {
            setModalLoading(false);
        }
    };

    const handleDelete = async (post: BlogPostItem) => {
        Modal.confirm({
            title: 'Xóa bài viết?',
            content: `Bài viết "${post.title}" sẽ bị xóa vĩnh viễn.`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await deleteBlogPostRequest(post.id);
                    message.success('Đã xóa bài viết');
                    loadPosts(pagination.page || 1);
                } catch (err) {
                    message.error(err instanceof Error ? err.message : 'Xóa thất bại');
                }
            },
        });
    };

    const columns = useMemo<ColumnsType<BlogPostItem>>(() => [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            render: (value, record) => (
                <div>
                    <div className="font-medium text-foreground">{value}</div>
                    <Text type="secondary">/{record.slug}</Text>
                </div>
            ),
        },
        {
            title: 'Danh mục',
            dataIndex: 'category',
            key: 'category',
            render: (category: BlogPostItem['category']) => category?.name || '—',
        },
        {
            title: 'Tags',
            dataIndex: 'tags',
            key: 'tags',
            render: (tags: BlogPostItem['tags']) => (
                <Space wrap>
                    {tags.length > 0 ? tags.map((t) => <Tag key={t.id}>{t.name}</Tag>) : '—'}
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: BlogPostItem['status']) => (
                <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>
            ),
        },
        {
            title: 'Cập nhật',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—',
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => window.open(`/blog/${record.slug}`, '_blank')}
                    />
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    />
                </Space>
            ),
        },
    ], [pagination.page]);

    const handleTableChange = (pag: TablePaginationConfig) => {
        loadPosts(pag.current || 1);
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <Title level={3}>Quản lý blog</Title>
                    <Text type="secondary">Tạo và cập nhật bài viết cho blog.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Tạo bài viết
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tiêu đề..."
                    style={{ width: 240 }}
                />
                <Button onClick={() => setAppliedSearch(search)}>Tìm kiếm</Button>
                <Select
                    allowClear
                    placeholder="Trạng thái"
                    style={{ width: 180 }}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                    options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                />
            </div>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={posts}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: false,
                }}
                onChange={handleTableChange}
            />

            <Modal
                title={editingPost ? 'Cập nhật bài viết' : 'Tạo bài viết'}
                open={modalOpen}
                onOk={handleModalOk}
                onCancel={() => setModalOpen(false)}
                confirmLoading={modalLoading}
                okText={editingPost ? 'Lưu' : 'Tạo'}
                width={720}
            >
                <Form form={form} layout="vertical" initialValues={{ status: 'DRAFT' }}>
                    <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="slug" label="Slug (tùy chọn)">
                        <Input />
                    </Form.Item>
                    <Form.Item name="excerpt" label="Tóm tắt">
                        <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Nhập nội dung' }]}>
                        <TextArea rows={6} />
                    </Form.Item>
                    <Form.Item name="coverImageUrl" label="Ảnh bìa">
                        <ImageUpload
                            value={coverImageUrl}
                            onChange={(url) => form.setFieldValue('coverImageUrl', url)}
                        />
                    </Form.Item>
                    <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                        <Select options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))} />
                    </Form.Item>
                    <Form.Item name="categoryName" label="Danh mục">
                        <Input placeholder="VD: Kinh nghiem thue tro" />
                    </Form.Item>
                    <Form.Item name="tagNames" label="Tags (ngan cach boi dau phay)">
                        <Input placeholder="VD: nha tro, kinh nghiem, cam nang" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
