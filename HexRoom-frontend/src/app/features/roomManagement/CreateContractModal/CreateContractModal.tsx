import { useCallback, useState } from 'react';
import {
    searchTenants,
    createRentalContract,
    type TenantSearchResult,
    type CreateContractInput,
} from '../shared/room-post-storage';

interface CreateContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    roomTitle: string;
    listedPrice: number;
    onSuccess: () => void;
}

export function CreateContractModal({
    isOpen,
    onClose,
    roomId,
    roomTitle,
    listedPrice,
    onSuccess,
}: CreateContractModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TenantSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<TenantSearchResult | null>(null);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        const q = searchQuery.trim();
        if (q.length < 2) {
            setSearchError('Nhập ít nhất 2 ký tự (email hoặc số điện thoại)');
            return;
        }
        setSearchError(null);
        setIsSearching(true);
        setSearchResults([]);
        try {
            const results = await searchTenants(q);
            setSearchResults(results);
            if (results.length === 0) {
                setSearchError('Người dùng chưa có tài khoản hoặc không tìm thấy');
            }
        } catch {
            setSearchError('Lỗi khi tìm kiếm');
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    const selectTenant = (tenant: TenantSearchResult) => {
        setSelectedTenant(tenant);
        setStep(2);
        setFormErrors({});
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!startDate) errs.startDate = 'Chọn ngày bắt đầu thuê';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const goToStep3 = () => {
        if (validateStep2()) setStep(3);
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        setIsSubmitting(true);
        try {
            const input: CreateContractInput = {
                tenantId: selectedTenant!.id,
                startDate,
                endDate: endDate || undefined,
                actualPrice: listedPrice,
                deposit: 0,
            };
            await createRentalContract(roomId, input);
            onSuccess();
            onClose();
            resetForm();
        } catch (e: unknown) {
            setSubmitError((e as Error)?.message || 'Thêm người ở thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedTenant(null);
        setStartDate('');
        setEndDate('');
        setFormErrors({});
        setSearchError(null);
        setSubmitError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-slate-900">Thêm người ở</h3>
                    <p className="mt-0.5 text-sm text-slate-600">{roomTitle}</p>
                </div>

                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                    {/* Step indicator */}
                    <div className="mb-4 flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <span
                                key={s}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${step >= s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}
                            >
                                Bước {s}
                            </span>
                        ))}
                    </div>

                    {/* Step 1: Search tenant */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Tìm kiếm người thuê (email hoặc số điện thoại)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="VD: nguyenvana@gmail.com hoặc 0901234567"
                                        className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                                    >
                                        {isSearching ? 'Đang tìm...' : 'Tìm'}
                                    </button>
                                </div>
                                {searchError && (
                                    <p className="mt-2 text-sm text-rose-600">{searchError}</p>
                                )}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-slate-500">Chọn người thuê</p>
                                    <div className="space-y-2">
                                        {searchResults.map((u) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => selectTenant(u)}
                                                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                                            >
                                                {u.avatarUrl ? (
                                                    <img
                                                        src={u.avatarUrl}
                                                        alt=""
                                                        crossOrigin="anonymous"
                                                        className="h-12 w-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                        {u.fullName.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-900">{u.fullName}</p>
                                                    <p className="text-sm text-slate-600">{u.email}</p>
                                                    {u.phone && (
                                                        <p className="text-xs text-slate-500">{u.phone}</p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Occupancy details */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {selectedTenant && (
                                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                    {selectedTenant.avatarUrl ? (
                                        <img
                                            src={selectedTenant.avatarUrl}
                                            alt=""
                                            crossOrigin="anonymous"
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                            {selectedTenant.fullName.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-slate-900">{selectedTenant.fullName}</p>
                                        <p className="text-sm text-slate-600">{selectedTenant.email}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Ngày bắt đầu thuê *
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${formErrors.startDate
                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                                        : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
                                        }`}
                                />
                                {formErrors.startDate && (
                                    <p className="mt-1 text-sm text-rose-600">{formErrors.startDate}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Ngày kết thúc dự kiến
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">Xác nhận thông tin trước khi thêm người ở:</p>
                            <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                                <div>
                                    <dt className="text-slate-500">Người thuê</dt>
                                    <dd className="font-medium text-slate-900">{selectedTenant?.fullName}</dd>
                                    <dd className="text-slate-600">{selectedTenant?.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">Phòng</dt>
                                    <dd className="font-medium text-slate-900">{roomTitle}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">Ngày bắt đầu</dt>
                                    <dd className="font-medium text-slate-900">
                                        {new Date(startDate).toLocaleDateString('vi-VN')}
                                    </dd>
                                </div>
                                {endDate && (
                                    <div>
                                        <dt className="text-slate-500">Ngày kết thúc</dt>
                                        <dd className="font-medium text-slate-900">
                                            {new Date(endDate).toLocaleDateString('vi-VN')}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            {submitError && (
                                <p className="text-sm text-rose-600">{submitError}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between gap-2 border-t border-slate-200 px-6 py-4">
                    <div>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Quay lại
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        {step === 1 && (
                            <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500">
                                Chọn người ở trước
                            </span>
                        )}
                        {step === 2 && (
                            <button
                                type="button"
                                onClick={goToStep3}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            >
                                Tiếp tục
                            </button>
                        )}
                        {step === 3 && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang thêm...' : 'Thêm người ở'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
