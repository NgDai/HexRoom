import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MultiImageUpload } from '@/app/components/MultiImageUpload';
import { MultiFileSelect } from '@/app/components/MultiFileSelect';
import { getRentalByIdRequest, updateRentalRequest, getRejectionInfoRequest, getLandlordRentalDocumentsRequest } from '@/lib/api';
import { useProvinces } from '@/app/hooks/useProvinces';
import { findOldAddress, type OldAddressInfo } from '@/app/constants/v1-v2-mapping';
import { PROPERTY_TYPE_OPTIONS, type PropertyType } from '../shared/types';

type RentalStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';

interface EditRentalFormState {
    title: string;
    summary: string;
    description: string;
    address: string;
    district: string;
    city: string;
    property_type: PropertyType;
    available_room: string;
    images: string[];
    status: RentalStatus;
}

interface DocumentsState {
    cccd: File[];      // Căn cước công dân (2 ảnh: mặt trước + mặt sau)
    soDo: File[];      // Sổ đỏ / Giấy CN quyền sử dụng đất
    gpkd: File[];      // Giấy phép kinh doanh
    other: File[];     // Giấy tờ khác (hợp đồng thuê, ủy quyền...)
}

const DOCUMENT_LABELS: Record<keyof DocumentsState, { label: string; required: boolean; description: string; minImages: number; maxImages: number }> = {
    cccd: { label: 'Căn cước công dân', required: false, description: 'Mặt trước và mặt sau', minImages: 2, maxImages: 2 },
    soDo: { label: 'Sổ đỏ / GCN quyền sử dụng đất', required: false, description: 'Các trang cần thiết', minImages: 1, maxImages: 1 },
    gpkd: { label: 'Giấy phép kinh doanh', required: false, description: 'Ảnh chụp rõ nét', minImages: 1, maxImages: 1 },
    other: { label: 'Giấy tờ khác', required: false, description: 'Hợp đồng thuê nhà, ủy quyền...', minImages: 0, maxImages: 5 },
};

const initialDocuments: DocumentsState = {
    cccd: [],
    soDo: [],
    gpkd: [],
    other: [],
};

type FormErrors = Partial<Record<keyof EditRentalFormState | keyof DocumentsState, string>>;

export function EditRentalPage() {
    const navigate = useNavigate();
    const { rentalId = '' } = useParams();
    const [form, setForm] = useState<EditRentalFormState>({
        title: '',
        summary: '',
        description: '',
        address: '',
        district: '',
        city: 'Thành phố Hà Nội',
        property_type: 'boarding_house',
        available_room: '1',
        images: [],
        status: 'AVAILABLE',
    });
    const [documents, setDocuments] = useState<DocumentsState>(initialDocuments);
    const [existingDocuments, setExistingDocuments] = useState<Record<string, Array<{ id: string, name: string, url?: string }>>>({});
    const [deletedDocuments, setDeletedDocuments] = useState<string[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [originalStatus, setOriginalStatus] = useState<string>('');
    const [oldAddress, setOldAddress] = useState<OldAddressInfo | null>(null);
    const [rejectionInfo, setRejectionInfo] = useState<{
        hasRejection: boolean;
        reason?: string | null;
        moderatorName?: string | null;
        rejectedAt?: string;
    } | null>(null);

    const isRejected = originalStatus === 'HIDDEN' && rejectionInfo?.hasRejection;

    // Landlord chỉ được thay đổi status khi đã được moderator duyệt
    const canEditStatus = ['AVAILABLE', 'UNAVAILABLE', 'HIDDEN'].includes(originalStatus);

    // Provinces / wards
    const { getWardsFor, loading: locationsLoading } = useProvinces();
    const wardOptions = form.city ? getWardsFor(form.city) : [];

    // Auto-detect old address when district/city changes
    useEffect(() => {
        const loadOldAddress = async () => {
            if (form.district && form.city) {
                const old = await findOldAddress(form.district, form.city);
                setOldAddress(old);
            } else {
                setOldAddress(null);
            }
        };
        loadOldAddress();
    }, [form.district, form.city]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setIsLoading(true);
            try {
                const result = await getRentalByIdRequest(rentalId);
                if (!active) return;
                const rental = result.data;
                setOriginalStatus(rental.status || '');
                setForm({
                    title: rental.title || '',
                    summary: '', // We don't fetch from backend since it doesn't exist
                    description: rental.description || '',
                    address: rental.location?.address || '',
                    district: rental.location?.district || '',
                    city: 'Thành phố Hà Nội',
                    property_type: 'boarding_house', // Default since it doesn't exist on rental
                    available_room: rental.rooms?.length?.toString() || '1', // Guess from rooms
                    images: rental.images || [],
                    status: (['AVAILABLE', 'UNAVAILABLE', 'HIDDEN'].includes(rental.status) ? rental.status : 'AVAILABLE') as RentalStatus,
                });

                // Lấy thông tin từ chối nếu bài đăng bị reject (HIDDEN)
                if (rental.status === 'HIDDEN') {
                    try {
                        const rejInfo = await getRejectionInfoRequest('RENTAL', rentalId);
                        if (active && rejInfo.data?.hasRejection) {
                            setRejectionInfo(rejInfo.data);
                        }
                    } catch {
                        // Bỏ qua lỗi
                    }
                }

                // Lấy existing documents cho phần giấy tờ xác minh
                try {
                    const docsReq = await getLandlordRentalDocumentsRequest(rentalId);
                    if (active && docsReq.data?.documents) {
                        const existingOpts: Record<string, Array<{ id: string, name: string, url?: string }>> = {};
                        docsReq.data.documents.forEach((doc) => {
                            let mappedKey = 'other';
                            let label = 'Giấy tờ khác';
                            if (doc.documentType === 'CCCD') { mappedKey = 'cccd'; label = 'CCCD'; }
                            if (doc.documentType === 'SO_DO') { mappedKey = 'soDo'; label = 'Sổ đỏ'; }
                            if (doc.documentType === 'GPKD') { mappedKey = 'gpkd'; label = 'GPKD'; }

                            if (!existingOpts[mappedKey]) existingOpts[mappedKey] = [];
                            existingOpts[mappedKey].push({
                                id: doc.id,
                                name: label,
                                url: doc.signedUrl || undefined,
                            });
                        });
                        setExistingDocuments(existingOpts);
                    }
                } catch {
                    // Ignore doc error
                }
            } catch (err) {
                if (!active) return;
                setSubmitError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
            } finally {
                if (active) setIsLoading(false);
            }
        };

        if (rentalId) {
            void load();
        }

        return () => {
            active = false;
        };
    }, [rentalId]);

    const validateForm = () => {
        const nextErrors: FormErrors = {};

        if (!form.title.trim()) nextErrors.title = 'Tiêu đề là bắt buộc.';
        if (!form.district.trim()) nextErrors.district = 'Phường/xã là bắt buộc.';
        if (!form.address.trim()) nextErrors.address = 'Địa chỉ là bắt buộc.';

        const availableRoomNumber = Number(form.available_room);
        if (!Number.isFinite(availableRoomNumber) || availableRoomNumber < 0) {
            nextErrors.available_room = 'Số phòng phải là số nguyên dương.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const onChangeField =
        <K extends keyof EditRentalFormState>(key: K) =>
            (value: EditRentalFormState[K]) => {
                setForm((prev) => {
                    const next = { ...prev, [key]: value };
                    // Reset district khi thay đổi city
                    if (key === 'city') next.district = '';
                    return next;
                });
                setErrors((prev) => ({ ...prev, [key]: undefined }));
            };

    const handleRemoveExistingDocument = (key: keyof DocumentsState, docId: string) => {
        setExistingDocuments(prev => ({
            ...prev,
            [key]: prev[key]?.filter(d => d.id !== docId) || []
        }));
        setDeletedDocuments(prev => [...Array.from(new Set([...prev, docId]))]);
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateForm()) return;

        setSubmitError(null);
        setIsSubmitting(true);

        // Collect all document files kèm type tương ứng
        const allDocumentFiles: File[] = [];
        const allDocumentTypes: string[] = [];

        const docMapping: Array<{ files: File[]; type: string }> = [
            { files: documents.cccd, type: 'CCCD' },
            { files: documents.soDo, type: 'SO_DO' },
            { files: documents.gpkd, type: 'GPKD' },
            { files: documents.other, type: 'OTHER' },
        ];

        for (const { files, type } of docMapping) {
            for (const file of files) {
                allDocumentFiles.push(file);
                allDocumentTypes.push(type);
            }
        }

        try {
            await updateRentalRequest(rentalId, {
                title: form.title,
                description: form.description || undefined,
                address: form.address,
                district: form.district,
                city: form.city,
                images: form.images,
                ...(canEditStatus && !isRejected ? { status: form.status } : {}),
                ...(isRejected ? { resubmit: true } : {}),
                documentFiles: allDocumentFiles.length > 0 ? allDocumentFiles : undefined,
                documentTypes: allDocumentTypes.length > 0 ? allDocumentTypes : undefined,
                deletedDocuments: deletedDocuments.length > 0 ? deletedDocuments : undefined,
            });

            navigate(`/rental-management/rentals/${rentalId}`);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Cập nhật bài đăng thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-600">Đang tải...</p>
            </section>
        );
    }

    // Chặn edit khi đang chờ duyệt
    if (originalStatus === 'PENDING') {
        return (
            <section className="mx-auto w-full max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                <p className="text-amber-800 font-medium">⏳ Bài đăng đang chờ moderator duyệt</p>
                <p className="mt-1 text-sm text-amber-700">Bạn không thể chỉnh sửa trong khi chờ duyệt.</p>
                <button
                    type="button"
                    onClick={() => navigate(`/rental-management/rentals/${rentalId}`)}
                    className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    Quay lại
                </button>
            </section>
        );
    }

    const isEditApproved = ['AVAILABLE', 'UNAVAILABLE'].includes(originalStatus);

    return (
        <section className="mx-auto w-full max-w-4xl">
            <header className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900">Chỉnh sửa bài đăng</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Cập nhật thông tin bài đăng của bạn.
                </p>
            </header>

            <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                {/* Rejection Banner */}
                {isRejected && (
                    <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-xl"></span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-rose-800">Bài đăng bị từ chối</h3>
                                {rejectionInfo?.reason && (
                                    <p className="mt-1 text-sm text-rose-700">
                                        <strong>Lý do:</strong> {rejectionInfo.reason}
                                    </p>
                                )}
                                <p className="mt-1 text-sm text-rose-700">
                                    Vui lòng chỉnh sửa và ấn "Lưu & Gửi lại" bên dưới.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Edit-on-approved notice */}
                {isEditApproved && !isRejected && (
                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">ℹ</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-800">Lưu ý</h3>
                                <p className="mt-1 text-sm text-blue-700">
                                    Sau khi lưu, bài đăng sẽ được gửi cho Moderator duyệt lại. Trong thời gian chờ duyệt, bạn sẽ không thể chỉnh sửa tiếp.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {oldAddress && (
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm text-blue-900">
                            <strong> Cập nhật địa chỉ hành chính:</strong><br />
                            Trước đó: <strong>{oldAddress.v1District}, {oldAddress.v1Province}</strong><br />
                            Bây giờ: <strong>{form.district}, {form.city}</strong>
                        </p>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiêu đề *</label>
                        <input
                            value={form.title}
                            onChange={(event) => onChangeField('title')(event.target.value)}
                            placeholder="VD: Maple Residence - gần đại học"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Loại bất động sản</label>
                        <select
                            value={form.property_type}
                            onChange={(event) =>
                                onChangeField('property_type')(event.target.value as PropertyType)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        >
                            {PROPERTY_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Tỉnh / Thành phố *</label>
                        <input
                            value="Thành phố Hà Nội"
                            disabled
                            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Phường / Xã *</label>
                        <select
                            value={form.district}
                            onChange={(event) => onChangeField('district')(event.target.value)}
                            disabled={!form.city || locationsLoading}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        >
                            <option value="">Chọn phường / xã</option>
                            {/* Nếu district đã lưu không có trong danh sách, hiển thị nó như option riêng */}
                            {form.district && !wardOptions.some(w => w.name === form.district) && (
                                <option value={form.district}>{form.district} (đã lưu)</option>
                            )}
                            {wardOptions.map((w) => (
                                <option key={w.code} value={w.name}>{w.name}</option>
                            ))}
                        </select>
                        {errors.district ? <p className="mt-1 text-xs text-rose-600">{errors.district}</p> : null}
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Địa chỉ chi tiết (đường, số nhà) *</label>
                        <input
                            value={form.address}
                            onChange={(event) => onChangeField('address')(event.target.value)}
                            placeholder="VD: 268 Tây Sơn"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.address ? <p className="mt-1 text-xs text-rose-600">{errors.address}</p> : null}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Số phòng trống *
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.available_room}
                            onChange={(event) => onChangeField('available_room')(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.available_room ? <p className="mt-1 text-xs text-rose-600">{errors.available_room}</p> : null}
                    </div>

                    <div className="md:col-span-2">
                        <MultiImageUpload
                            label="Ảnh bài đăng"
                            value={form.images}
                            onChange={(urls) => onChangeField('images')(urls)}
                            maxImages={10}
                        />
                    </div>

                    {/* Giấy tờ xác minh */}
                    <div className="md:col-span-2 mt-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3">
                                Giấy tờ xác minh (không hiển thị công khai)
                            </h3>
                            <p className="text-xs text-slate-600 mb-4">
                                Ảnh giấy tờ chỉ dùng để xác minh bạn là chủ sở hữu hợp pháp. Bạn có thể tải lên lại nếu bài đăng bị thiếu giấy tờ hoặc bị từ chối do giấy tờ chưa hợp lệ.
                            </p>
                            <div className="grid gap-4 md:grid-cols-2">
                                {(Object.keys(DOCUMENT_LABELS) as Array<keyof DocumentsState>).map((key) => {
                                    const { label, required, description, maxImages } = DOCUMENT_LABELS[key];
                                    const hasError = errors[key];
                                    return (
                                        <div key={key} className={`bg-white rounded-lg p-3 border ${hasError ? 'border-rose-300' : 'border-slate-200'}`}>
                                            <MultiFileSelect
                                                label={`${label}${required ? ' *' : ''}`}
                                                value={documents[key]}
                                                existingFiles={existingDocuments[key]}
                                                onRemoveExisting={(id) => handleRemoveExistingDocument(key, id)}
                                                onChange={(files) => {
                                                    setDocuments(prev => ({ ...prev, [key]: files }));
                                                    if (errors[key]) {
                                                        setErrors(prev => ({ ...prev, [key]: undefined }));
                                                    }
                                                }}
                                                maxFiles={maxImages}
                                                accept="image/*,application/pdf"
                                            />
                                            <div className="mt-1 text-[11px] text-slate-500">
                                                {description}. Tối đa {maxImages} tệp.
                                            </div>
                                            {hasError && <p className="mt-1 text-xs text-rose-600">{hasError}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Tóm tắt</label>
                        <textarea
                            value={form.summary}
                            onChange={(event) => onChangeField('summary')(event.target.value)}
                            rows={2}
                            placeholder="Mô tả ngắn gọn cho bài đăng"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả chi tiết</label>
                        <textarea
                            value={form.description}
                            onChange={(event) => onChangeField('description')(event.target.value)}
                            rows={5}
                            placeholder="Thông tin chi tiết về dịch vụ, nội quy, tiện ích..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                    </div>
                </div>

                {submitError && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-sm text-rose-700">{submitError}</p>
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/rental-management/rentals/${rentalId}`)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 ${isRejected
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : isEditApproved
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-slate-900 hover:bg-slate-800'
                            }`}
                    >
                        {isSubmitting
                            ? 'Đang lưu...'
                            : isRejected
                                ? '📤 Lưu & Gửi lại để duyệt'
                                : isEditApproved
                                    ? '📤 Lưu & Gửi để duyệt lại'
                                    : 'Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </section>
    );
}
