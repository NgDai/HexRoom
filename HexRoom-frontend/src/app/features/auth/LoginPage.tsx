import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HomeOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useAuth } from '@/app/context/useAuth';
import { getRedirectByRole } from '@/lib/auth/roleRedirect';

const { Title, Paragraph } = Typography;

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { user, signInWithEmail, isLoading } = useAuth();
    const loginState = location.state as { registered?: boolean; postLoginRedirect?: string; from?: { pathname: string } } | null;
    const justRegistered = loginState?.registered === true;

    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form] = Form.useForm();
    const success = justRegistered ? t('auth.registerSuccess') : null;

    useEffect(() => {
        if (!isLoading && user) {
            const from = loginState?.from?.pathname;
            const postLoginRedirect = loginState?.postLoginRedirect;
            const roleDestination = getRedirectByRole(user.role);
            const destination =
                user.role === 'ADMIN'
                    ? roleDestination
                    : from || postLoginRedirect || roleDestination;
            navigate(destination, { replace: true });
        }
    }, [user, isLoading, navigate, loginState]);

    const handleSubmit = async (values: { email: string; password: string }) => {
        setError(null);
        setSubmitLoading(true);
        try {
            await signInWithEmail(values.email.trim(), values.password);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.loginError'));
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12">
            <div className="w-full max-w-md">
                <Card className="rounded-2xl shadow-lg border-border [&_.ant-card-body]:!p-5 sm:[&_.ant-card-body]:!p-8 hover:shadow-xl transition-shadow" styles={{ body: { padding: 0 } }}>
                    <div className="flex justify-center mb-8">
                        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-md ring-4 ring-primary/10">
                            <HomeOutlined className="text-white text-2xl" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <Title level={3} className="!font-heading !mb-1">{t('auth.login')}</Title>
                        <Paragraph type="secondary" className="!mb-0 text-sm">{t('auth.loginWelcome')}</Paragraph>
                    </div>

                    {success && (
                        <Alert title={success} type="success" showIcon className="mb-5 rounded-xl" />
                    )}

                    {error && (
                        <Alert title={error} type="error" showIcon className="mb-5 rounded-xl" role="alert" />
                    )}

                    <Form
                        form={form}
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handleSubmit}
                        className="space-y-0"
                    >
                        <Form.Item
                            name="email"
                            label={t('auth.email')}
                            rules={[{ required: true, message: t('auth.emailRequired') }, { type: 'email', message: t('auth.emailInvalid') }]}
                        >
                            <Input size="large" placeholder="your.email@example.com" autoComplete="email" className="rounded-xl" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={t('auth.password')}
                            rules={[{ required: true, message: t('auth.passwordRequired') }]}
                            extra={
                                <div className="text-right mt-1.5">
                                    <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                                        {t('auth.forgotPassword')}
                                    </Link>
                                </div>
                            }
                        >
                            <Input.Password size="large" placeholder="••••••••" autoComplete="current-password" className="rounded-xl" />
                        </Form.Item>

                        <Form.Item className="!mb-0 mt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                loading={submitLoading || isLoading}
                                block
                                className="rounded-xl font-semibold h-11 sm:h-12 min-h-[44px] touch-manipulation"
                            >
                                {t('auth.submitLogin')}
                            </Button>
                        </Form.Item>
                    </Form>

                    <Paragraph className="text-center text-sm text-muted-foreground mt-8 !mb-0">
                        {t('auth.noAccount')}{' '}
                        <Link to="/register" className="text-primary font-semibold hover:underline">
                            {t('auth.registerNow')}
                        </Link>
                    </Paragraph>
                </Card>

                <Paragraph className="text-center text-xs text-muted-foreground mt-10 !mb-0">
                    © 2026 HexRoom - Smart Renting Room System
                </Paragraph>
            </div>
        </div>
    );
}
