import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, User, Mail, Phone, Lock, Eye, EyeOff, Loader2, Sparkles, Check, Circle } from 'lucide-react';
import { useAuth } from '@/app/context/useAuth';
import { suggestPasswordRequest, registerRequest } from '@/lib/api';

function passwordRequirements(pwd: string) {
    return {
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        number: /[0-9]/.test(pwd),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
    };
}

export function RegisterPage() {
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'TENANT' as 'TENANT' | 'LANDLORD',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<string[]>([]);
    const [showProfileReminder, setShowProfileReminder] = useState(false);
    const pwdReqs = passwordRequirements(form.password);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name;
        const value = e.target.value;
        setForm((f) => ({ ...f, [name]: value }));
        setError(null);
        setFieldErrors([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors([]);
        setLoading(true);

        try {
            await registerRequest({
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                password: form.password,
                confirmPassword: form.confirmPassword,
                role: form.role,
            });
            setShowProfileReminder(true);
        } catch (err: unknown) {
            const e = err as Error & { errors?: unknown[] };
            setError(e.message || 'Đăng ký thất bại');
            if (Array.isArray(e.errors)) setFieldErrors(e.errors as string[]);
        } finally {
            setLoading(false);
        }
    };

    // Redirect to home when signed in via OAuth (Google)
    useEffect(() => {
        if (!isLoading && user) {
            navigate('/home', { replace: true });
        }
    }, [user, isLoading, navigate]);

    const handleSuggestPassword = async () => {
        setSuggestLoading(true);
        setError(null);
        try {
            const { suggestedPassword } = await suggestPasswordRequest();
            setForm((f) => ({ ...f, password: suggestedPassword, confirmPassword: suggestedPassword }));
        } catch {
            setError('Không thể tạo mật khẩu gợi ý. Thử lại sau.');
        } finally {
            setSuggestLoading(false);
        }
    };

    const inputClass =
        'w-full pl-11 pr-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
    const inputClassWithRight = 'w-full pl-11 pr-11 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
    const iconClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground';
    const toggleClass = 'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors';
    const goToLogin = (focusProfile: boolean) => {
        navigate('/login', {
            state: {
                registered: true,
                postLoginRedirect: focusProfile ? '/profile' : undefined,
            },
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-sm border border-border px-8 py-10">
                    <div className="flex justify-center mb-8">
                        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-sm">
                            <Home className="w-7 h-7 text-primary-foreground" strokeWidth={2} />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-heading font-bold text-foreground">Đăng ký</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Tạo tài khoản mới để bắt đầu</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                            <p className="font-medium">{error}</p>
                            {fieldErrors.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-xs">
                                    {fieldErrors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Họ và tên</label>
                            <div className="relative">
                                <User className={iconClass} strokeWidth={2} />
                                <input type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" className={inputClass} required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className={iconClass} strokeWidth={2} />
                                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="your.email@example.com" className={inputClass} required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Số điện thoại</label>
                            <div className="relative">
                                <Phone className={iconClass} strokeWidth={2} />
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0123456789" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Vai trò tài khoản</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, role: 'TENANT' }))}
                                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                        form.role === 'TENANT'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-foreground hover:bg-muted'
                                    }`}
                                >
                                    Tenant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, role: 'LANDLORD' }))}
                                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                        form.role === 'LANDLORD'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-foreground hover:bg-muted'
                                    }`}
                                >
                                    Landlord
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <label className="block text-sm font-medium text-foreground">Mật khẩu</label>
                                <button
                                    type="button"
                                    onClick={handleSuggestPassword}
                                    disabled={suggestLoading}
                                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                                >
                                    {suggestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    Gợi ý mật khẩu mạnh
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className={iconClass} strokeWidth={2} />
                                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="••••••••" className={inputClassWithRight} required minLength={8} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className={toggleClass} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                                    {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
                                </button>
                            </div>
                            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <li className={pwdReqs.length ? 'text-primary' : ''}>
                                    {pwdReqs.length ? <Check className="w-3.5 h-3.5 inline mr-1.5 text-primary" /> : <Circle className="w-3.5 h-3.5 inline mr-1.5 opacity-50" />}
                                    Ít nhất 8 ký tự
                                </li>
                                <li className={pwdReqs.upper ? 'text-primary' : ''}>
                                    {pwdReqs.upper ? <Check className="w-3.5 h-3.5 inline mr-1.5 text-primary" /> : <Circle className="w-3.5 h-3.5 inline mr-1.5 opacity-50" />}
                                    Ít nhất 1 chữ in hoa
                                </li>
                                <li className={pwdReqs.number ? 'text-primary' : ''}>
                                    {pwdReqs.number ? <Check className="w-3.5 h-3.5 inline mr-1.5 text-primary" /> : <Circle className="w-3.5 h-3.5 inline mr-1.5 opacity-50" />}
                                    Ít nhất 1 chữ số
                                </li>
                                <li className={pwdReqs.special ? 'text-primary' : ''}>
                                    {pwdReqs.special ? <Check className="w-3.5 h-3.5 inline mr-1.5 text-primary" /> : <Circle className="w-3.5 h-3.5 inline mr-1.5 opacity-50" />}
                                    Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)
                                </li>
                            </ul>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className={iconClass} strokeWidth={2} />
                                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" className={inputClassWithRight} required />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className={toggleClass} aria-label={showConfirm ? 'Ẩn' : 'Hiện'}>
                                    {showConfirm ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
                            {loading ? 'Đang xử lý...' : 'Đăng ký'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground mt-8">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="text-primary font-semibold hover:underline">
                            Đăng nhập ngay
                        </Link>
                    </p>
                </div>
            </div>
            {showProfileReminder && (
                <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-4">
                    <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground">Hoan nghênh bạn đến HexRoom</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Tài khoản của bạn đã được tạo với vai trò <strong>{form.role === 'LANDLORD' ? 'Landlord' : 'Tenant'}</strong>.
                            Bạn có thể đăng nhập ngay để bắt đầu sử dụng HexRoom.
                        </p>
                        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <button
                                type="button"
                                onClick={() => goToLogin(false)}
                                className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                Bỏ qua
                            </button>
                            <button
                                type="button"
                                onClick={() => goToLogin(true)}
                                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                Đăng nhập và cập nhật ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
