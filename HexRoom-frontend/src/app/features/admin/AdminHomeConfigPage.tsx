import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, Form, Input, Space, Switch, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { ImageUpload } from '@/app/components/ImageUpload';
import { getSystemSettings, updateSystemSettings } from './shared/admin-api';

const { Title, Text } = Typography;

type HomeSectionKey = 'hero' | 'aiFeature' | 'featuredRooms' | 'recommendedRooms' | 'popularAreas' | 'whyHexRoom';

const HOME_SECTION_KEYS: HomeSectionKey[] = [
    'hero',
    'aiFeature',
    'featuredRooms',
    'recommendedRooms',
    'popularAreas',
    'whyHexRoom',
];

type FormValues = {
    enabled: boolean;
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaText: string;
    ctaLink: string;
    sections: Record<HomeSectionKey, boolean>;
};

function defaultSections(): Record<HomeSectionKey, boolean> {
    return {
        hero: true,
        aiFeature: true,
        featuredRooms: true,
        recommendedRooms: true,
        popularAreas: true,
        whyHexRoom: true,
    };
}

export function AdminHomeConfigPage() {
    const { t } = useTranslation();
    const [form] = Form.useForm<FormValues>();
    const imageUrl = Form.useWatch('imageUrl', form);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const sectionLabels: Record<HomeSectionKey, string> = useMemo(
        () => ({
            hero: t('admin.homeConfig.sections.hero'),
            aiFeature: t('admin.homeConfig.sections.aiFeature'),
            featuredRooms: t('admin.homeConfig.sections.featuredRooms'),
            recommendedRooms: t('admin.homeConfig.sections.recommendedRooms'),
            popularAreas: t('admin.homeConfig.sections.popularAreas'),
            whyHexRoom: t('admin.homeConfig.sections.whyHexRoom'),
        }),
        [t]
    );

    const loadSettings = async () => {
        setLoading(true);
        const data = await getSystemSettings();
        if (data) {
            const banner = data.settings['site.homeBanner'];
            const layoutSections = data.settings['site.homeLayout']?.sections || [];
            const sectionMap = defaultSections();
            for (const section of layoutSections) {
                if (HOME_SECTION_KEYS.includes(section.key as HomeSectionKey)) {
                    sectionMap[section.key as HomeSectionKey] = section.enabled !== false;
                }
            }

            form.setFieldsValue({
                enabled: banner?.enabled !== false,
                title: banner?.title || '',
                subtitle: banner?.subtitle || '',
                imageUrl: banner?.imageUrl || '',
                ctaText: banner?.ctaText || '',
                ctaLink: banner?.ctaLink || '',
                sections: sectionMap,
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

        const payloadSections = HOME_SECTION_KEYS.map((key) => ({
            key,
            enabled: values.sections?.[key] !== false,
        }));

        const result = await updateSystemSettings({
            settings: {
                'site.homeBanner': {
                    enabled: values.enabled,
                    title: values.title || '',
                    subtitle: values.subtitle || '',
                    imageUrl: values.imageUrl || '',
                    ctaText: values.ctaText || '',
                    ctaLink: values.ctaLink || '',
                },
                'site.homeLayout': {
                    sections: payloadSections,
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
            <Title level={2}>{t('admin.homeConfig.title')}</Title>
            <Text type="secondary">{t('admin.homeConfig.subtitle')}</Text>

            <Card loading={loading} style={{ marginTop: 16 }}>
                <Alert
                    type="info"
                    showIcon
                    title={t('admin.homeConfig.notice')}
                    style={{ marginBottom: 16 }}
                />

                <Form form={form} layout="vertical" initialValues={{ sections: defaultSections(), enabled: true }}>
                    <Divider>{t('admin.homeConfig.bannerSection')}</Divider>

                    <Form.Item label={t('admin.homeConfig.fields.enabled')} name="enabled" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={t('admin.homeConfig.fields.title')}
                        name="title"
                        rules={[{ max: 120, message: t('admin.homeConfig.validation.titleMax') }]}
                    >
                        <Input maxLength={120} />
                    </Form.Item>

                    <Form.Item
                        label={t('admin.homeConfig.fields.subtitle')}
                        name="subtitle"
                        rules={[{ max: 220, message: t('admin.homeConfig.validation.subtitleMax') }]}
                    >
                        <Input.TextArea maxLength={220} rows={3} />
                    </Form.Item>

                    <Form.Item label={t('admin.homeConfig.fields.imageUrl')} name="imageUrl">
                        <ImageUpload
                            value={imageUrl || ''}
                            onChange={(url) => form.setFieldValue('imageUrl', url)}
                            label=""
                            placeholder={t('admin.homeConfig.fields.uploadPlaceholder')}
                        />
                    </Form.Item>

                    <Space wrap style={{ width: '100%' }}>
                        <Form.Item
                            label={t('admin.homeConfig.fields.ctaText')}
                            name="ctaText"
                            rules={[{ max: 40, message: t('admin.homeConfig.validation.ctaTextMax') }]}
                        >
                            <Input maxLength={40} />
                        </Form.Item>
                        <Form.Item
                            label={t('admin.homeConfig.fields.ctaLink')}
                            name="ctaLink"
                            rules={[{ type: 'url', message: t('admin.homeConfig.validation.ctaLinkUrl') }]}
                        >
                            <Input placeholder="https://..." />
                        </Form.Item>
                    </Space>

                    <Divider>{t('admin.homeConfig.layoutSection')}</Divider>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        {HOME_SECTION_KEYS.map((key) => (
                            <Form.Item
                                key={key}
                                label={sectionLabels[key]}
                                name={['sections', key]}
                                valuePropName="checked"
                                style={{ marginBottom: 8 }}
                            >
                                <Switch />
                            </Form.Item>
                        ))}
                    </Space>

                    <Button type="primary" onClick={() => void onSave()} loading={saving}>
                        {t('admin.homeConfig.save')}
                    </Button>
                </Form>
            </Card>
        </div>
    );
}
