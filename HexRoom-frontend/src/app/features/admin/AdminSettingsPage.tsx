import { useEffect, useState } from 'react';
import { Alert, Button, Card, Divider, Form, InputNumber, Space, Typography, message } from 'antd';
import { getSystemSettings, updateSystemSettings } from './shared/admin-api';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

type SettingsFormValues = {
    defaultPercent: number;
    minPercent: number;
    maxPercent: number;
    baseMonths: number;
    preorderFeeBps: number;
};

export function AdminSettingsPage() {
    const { t } = useTranslation();
    const [form] = Form.useForm<SettingsFormValues>();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadSettings = async () => {
        setLoading(true);
        const data = await getSystemSettings();
        if (data) {
            form.setFieldsValue({
                defaultPercent: data.settings['preorder.deposit']?.defaultPercent,
                minPercent: data.settings['preorder.deposit']?.minPercent,
                maxPercent: data.settings['preorder.deposit']?.maxPercent,
                baseMonths: data.settings['preorder.deposit']?.baseMonths,
                preorderFeeBps: data.settings['platform.commission']?.preorderFeeBps,
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        void loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSave = async () => {
        const values = await form.validateFields();
        setSaving(true);
        const result = await updateSystemSettings({
            settings: {
                'preorder.deposit': {
                    defaultPercent: Number(values.defaultPercent),
                    minPercent: Number(values.minPercent),
                    maxPercent: Number(values.maxPercent),
                    baseMonths: Number(values.baseMonths),
                },
                'platform.commission': {
                    preorderFeeBps: Number(values.preorderFeeBps),
                },
            },
        });
        setSaving(false);

        if (!result.success) {
            message.error(result.message);
            return;
        }
        message.success(result.message);
        await loadSettings();
    };

    return (
        <div>
            <Title level={2}>{t('admin.settings.title')}</Title>
            <Text type="secondary">{t('admin.settings.subtitle')}</Text>

            <Card loading={loading} style={{ marginTop: 16 }}>
                <Alert
                    type="info"
                    showIcon
                    title={t('admin.settings.providerKeysNotice')}
                    style={{ marginBottom: 16 }}
                />

                <Form form={form} layout="vertical">
                    <Divider>{t('admin.settings.sections.depositRules')}</Divider>
                    <Space wrap>
                        <Form.Item
                            label={t('admin.settings.fields.defaultPercent')}
                            name="defaultPercent"
                            rules={[{ required: true, message: t('admin.settings.required') }]}
                        >
                            <InputNumber min={0.01} max={99.99} step={0.01} />
                        </Form.Item>
                        <Form.Item
                            label={t('admin.settings.fields.minPercent')}
                            name="minPercent"
                            rules={[{ required: true, message: t('admin.settings.required') }]}
                        >
                            <InputNumber min={0.01} max={99.99} step={0.01} />
                        </Form.Item>
                        <Form.Item
                            label={t('admin.settings.fields.maxPercent')}
                            name="maxPercent"
                            rules={[{ required: true, message: t('admin.settings.required') }]}
                        >
                            <InputNumber min={0.01} max={99.99} step={0.01} />
                        </Form.Item>
                        <Form.Item
                            label={t('admin.settings.fields.baseMonths')}
                            name="baseMonths"
                            rules={[{ required: true, message: t('admin.settings.required') }]}
                        >
                            <InputNumber min={1} max={120} step={1} />
                        </Form.Item>
                    </Space>

                    <Divider>{t('admin.settings.sections.platformCommission')}</Divider>
                    <Form.Item
                        label={t('admin.settings.fields.preorderFeeBps')}
                        name="preorderFeeBps"
                        extra={t('admin.settings.fields.preorderFeeHelp')}
                        rules={[{ required: true, message: t('admin.settings.required') }]}
                    >
                        <InputNumber min={0} max={10000} step={10} />
                    </Form.Item>

                    <Button type="primary" onClick={() => void onSave()} loading={saving}>
                        {t('admin.settings.save')}
                    </Button>
                </Form>
            </Card>
        </div>
    );
}
