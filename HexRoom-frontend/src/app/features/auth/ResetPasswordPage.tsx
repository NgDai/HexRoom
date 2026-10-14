import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Home, Loader2, Sparkles, Check, Circle } from 'lucide-react';
import { resetPasswordRequest, suggestPasswordRequest } from '@/lib/api';

function passwordRequirements(pwd: string) {
    return {
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        number: /[0-9]/.test(pwd),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
    };
}

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const pwdReqs = passwordRequirements(newPassword);

    useEffect(() => {
        if (!token) setError('Link đặt lại mật khẩu không hợp lệ hoặc thiếu.');
    }, [token]);

    const handleSuggestPassword = async () => {
        setSuggestLoading(true);
        setError(null);
        try {
            const { suggestedPassword } = await suggestPasswordRequest();
            setNewPassword(suggestedPassword);
            setConfirmPassword(suggestedPassword);
        } catch {
            setError('Không thể tạo mật khẩu gợi ý. Thử lại sau.');
        } finally {
            setSuggestLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!token) return;
        if (!pwdReqs.length || !pwdReqs.upper || !pwdReqs.number || !pwdReqs.special) {
            setError('Mật khẩu cần ít nhất 8 ký tự, 1 in hoa, 1 số, 1 ký tự đặc biệt');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Xác nhận mật khẩu không khớp');
            return;
        }
        setLoading(true);
        try {
            await resetPasswordRequest(token, newPassword, confirmPassword);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="bg-card rounded-2xl shadow-sm border border-border px-8 py-10 text-center">
                        <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-7 h-7 text-destructive" strokeWidth={2} />
                        </div>
                        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Link không hợp lệ</h1>
                        <p className="text-muted-foreground text-sm mb-6">
                            Link đặt lại mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại từ trang quên mật khẩu.
                        </p>
                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center justify-center w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90"
                        >
                            Quên mật khẩu
                        </Link>
                        <p className="mt-6 text-sm text-muted-foreground">
                            <Link to="/login" className="text-primary font-semibold hover:underline">Quay lại đăng nhập</Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="bg-card rounded-2xl shadow-sm border border-border px-8 py-10 text-center">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-7 h-7 text-primary" strokeWidth={2} />
                        </div>
                        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Đặt lại mật khẩu thành công</h1>
                        <p className="text-muted-foreground text-sm mb-8">
                            Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                        <h1 className="text-2xl font-heading font-bold text-foreground">Đặt lại mật khẩu</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Nhập mật khẩu mới cho tài khoản của bạn</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <label className="block text-sm font-medium text-foreground">Mật khẩu mới</label>
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
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={2} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={showPassword ? 'Ẩn' : 'Hiện'}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
                                </button>
                            </div>
                            <ul className="mt-2 space-y-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
                                <li className={`flex items-center gap-1.5 ${pwdReqs.length ? 'text-green-600' : ''}`}>{pwdReqs.length ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />} Ít nhất 8 ký tự</li>
                                <li className={`flex items-center gap-1.5 ${pwdReqs.upper ? 'text-green-600' : ''}`}>{pwdReqs.upper ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />} 1 chữ in hoa</li>
                                <li className={`flex items-center gap-1.5 ${pwdReqs.number ? 'text-green-600' : ''}`}>{pwdReqs.number ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />} 1 chữ số</li>
                                <li className={`flex items-center gap-1.5 ${pwdReqs.special ? 'text-green-600' : ''}`}>{pwdReqs.special ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />} 1 ký tự đặc biệt</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={2} />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={showConfirm ? 'Ẩn' : 'Hiện'}
                                >
                                    {showConfirm ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
                            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground mt-8">
                        <Link to="/login" className="text-primary font-semibold hover:underline">Quay lại đăng nhập</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
