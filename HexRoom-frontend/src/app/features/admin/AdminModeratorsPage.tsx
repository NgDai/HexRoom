import { useEffect, useState } from 'react';
import { Button, Card, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getModeratorKpis, type ModeratorKpiItem } from './shared/admin-api';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

function formatDuration(ms: number | null) {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return 'N/A';
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes} phút`;
    const hours = (minutes / 60).toFixed(1);
    return `${hours} giờ`;
}

export function AdminModeratorsPage() {
    const { t } = useTranslation();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ModeratorKpiItem[]>([]);

    const loadData = async () => {
        setLoading(true);
        const result = await getModeratorKpis({
            from: from || undefined,
            to: to || undefined,
        });
        setData(result?.moderators || []);
        setLoading(false);
    };

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns: ColumnsType<ModeratorKpiItem> = [
        {
            title: t('admin.moderators.table.moderator'),
            key: 'moderator',
            render: (_, row) => (
                <div>
                    <div>{row.fullName}</div>
                    <Text type="secondary">{row.email}</Text>
                </div>
            ),
        },
        {
            title: t('admin.moderators.table.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>{status}</Tag>
            ),
        },
        {
            title: t('admin.moderators.table.openAssigned'),
            dataIndex: ['queue', 'openAssigned'],
            key: 'openAssigned',
        },
        {
            title: t('admin.moderators.table.resolvedInRange'),
            dataIndex: ['queue', 'resolvedInRange'],
            key: 'resolvedInRange',
        },
        {
            title: t('admin.moderators.table.escalatedInRange'),
            dataIndex: ['queue', 'escalatedInRange'],
            key: 'escalatedInRange',
        },
        {
            title: t('admin.moderators.table.avgResolution'),
            dataIndex: ['queue', 'avgResolutionMs'],
            key: 'avgResolutionMs',
            render: (value: number | null) => formatDuration(value),
        },
    ];

    return (
        <div>
            <Title level={2}>{t('admin.moderators.title')}</Title>
            <Text type="secondary">{t('admin.moderators.subtitle')}</Text>

            <Card style={{ marginTop: 16 }}>
                <Space wrap>
                    <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        style={{ width: 180 }}
                    />
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        style={{ width: 180 }}
                    />
                    <Button type="primary" onClick={() => void loadData()} loading={loading}>
                        {t('admin.moderators.filters.apply')}
                    </Button>
                </Space>
            </Card>

            <Card style={{ marginTop: 16 }}>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
}
