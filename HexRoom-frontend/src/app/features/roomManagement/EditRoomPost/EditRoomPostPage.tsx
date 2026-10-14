import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RoomStatus } from '@/lib/models/room.model';
import { MultiImageUpload } from '@/app/components/MultiImageUpload';
import { getManagedRentalById } from '@/app/features/rentalManagement/shared/rental-storage';
import { getRoomPostById, updateRoomPost, fetchAmenities } from '../shared/room-post-storage';
import { getRejectionInfoRequest } from '@/lib/api';

interface Amenity {
    id: string;
    name: string;
}

interface EditRoomPostFormState {
    title: string;
    description: string;
    price: string;
    area: string;
    max_occupants: string;
    status: RoomStatus;
    images: string[];
    amenityIds: string[];
}

type FormErrors = Partial<Record<keyof EditRoomPostFormState, string>>;

export function EditRoomPostPage() {
    const navigate = useNavigate();
    const { rentalId = '', roomPostId = '' } = useParams();
    const [rentalTitle, setRentalTitle] = useState('');
    const [form, setForm] = useState<EditRoomPostFormState>({
        title: '',
        description: '',
        price: '',
        area: '',
        max_occupants: '1',
        status: 'PENDING',
        images: [],
        amenityIds: [],
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [rejectionInfo, setRejectionInfo] = useState<{
        hasRejection: boolean;
        reason?: string | null;
        moderatorName?: string | null;
        rejectedAt?: string;
    } | null>(null);

    const isRejected = form.status === 'MAINTENANCE' && rejectionInfo?.hasRejection;

    useEffect(() => {
        let active = true;

        const load = async () => {
            setIsLoading(true);
            const [rental, roomPost, amenitiesList] = await Promise.all([
                getManagedRentalById(rentalId),
                getRoomPostById(rentalId, roomPostId),
                fetchAmenities(),
            ]);
            if (!active) return;
            setRentalTitle(rental?.title ?? '');
            setAmenities(amenitiesList);
            if (roomPost) {
                setForm({
                    title: roomPost.title || '',
                    description: roomPost.description || '',
                    price: String(roomPost.price || ''),
                    area: String(roomPost.area || ''),
                    max_occupants: String(roomPost.max_occupants || '1'),
                    status: roomPost.status || 'PENDING',
                    images: roomPost.images || [],
                    amenityIds: roomPost.amenities?.map(a => a.id) || [],
                });

                // Lấy thông tin từ chối nếu phòng bị reject (MAINTENANCE)
                if (roomPost.status === 'MAINTENANCE') {
                    try {
                        const rejInfo = await getRejectionInfoRequest('ROOM', roomPostId);
                        if (active && rejInfo.data?.hasRejection) {
                            setRejectionInfo(rejInfo.data);
                        }
                    } catch {
                        // Bỏ qua lỗi
                    }
                }
            }
            setIsLoading(false);
        };

        if (rentalId && roomPostId) {
            void load();
        }

        return () => {
            active = false;
        };
    }, [rentalId, roomPostId]);

    const parsed = useMemo(() => ({
        price: parseFloat(form.price) || 0,
        area: parseFloat(form.area) || 0,
        maxOccupants: parseInt(form.max_occupants, 10) || 1,
    }), [form.price, form.area, form.max_occupants]);

    const validate = () => {
        const next: FormErrors = {};
        if (!form.title.trim()) next.title = 'Tên phòng là bắt buộc.';
        if (parsed.price <= 0) next.price = 'Giá phòng phải lớn hơn 0.';
        if (parsed.area <= 0) next.area = 'Diện tích phải lớn hơn 0.';
        if (parsed.maxOccupants <= 0) next.max_occupants = 'Số người tối đa phải lớn hơn 0.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const onChangeField = <K extends keyof EditRoomPostFormState>(key: K) => (value: EditRoomPostFormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        const result = await updateRoomPost(roomPostId, {
            title: form.title,
            description: form.description,
            price: parsed.price,
            area: parsed.area,
            max_occupants: parsed.maxOccupants,
            thumbnail_url: form.images[0] || '',
            images: form.images,
            amenityIds: form.amenityIds,
            ...(isRejected ? { resubmit: true } : {}),
        });
        setIsSubmitting(false);

        if (result) {
            navigate(`/rental-management/rentals/${rentalId}/room-posts/${roomPostId}`);
        } else {
            setErrors({ title: 'Cập nhật phòng thất bại' });
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
    if (form.status === 'PENDING') {
        return (
            <section className="mx-auto w-full max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                <p className="text-amber-800 font-medium">⏳ Phòng đang chờ moderator duyệt</p>
                <p className="mt-1 text-sm text-amber-700">Bạn không thể chỉnh sửa trong khi chờ duyệt.</p>
                <button
                    type="button"
                    onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts/${roomPostId}`)}
                    className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    Quay lại
                </button>
            </section>
        );
    }

    const isEditApproved = form.status === 'AVAILABLE';

    return (
        <section className="mx-auto w-full max-w-4xl">
            <header className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900">Chỉnh sửa phòng</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Cập nhật thông tin phòng trong: <strong>{rentalTitle || rentalId}</strong>
                </p>
            </header>

            <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                {/* Rejection Banner */}
                {isRejected && (
                    <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-rose-800">Phòng bị từ chối</h3>
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
                            <span className="text-xl">ℹ️</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-800">Lưu ý</h3>
                                <p className="mt-1 text-sm text-blue-700">
                                    Sau khi lưu, phòng sẽ được gửi cho Moderator duyệt lại. Trong thời gian chờ duyệt, bạn sẽ không thể chỉnh sửa tiếp.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Tên phòng *</label>
                        <input
                            value={form.title}
                            onChange={(e) => onChangeField('title')(e.target.value)}
                            placeholder="VD: Phòng 101"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Giá thuê (VNĐ/tháng) *</label>
                        <input
                            type="number"
                            min={0}
                            value={form.price}
                            onChange={(e) => onChangeField('price')(e.target.value)}
                            placeholder="3000000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Diện tích (m²) *</label>
                        <input
                            type="number"
                            min={0}
                            value={form.area}
                            onChange={(e) => onChangeField('area')(e.target.value)}
                            placeholder="20"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.area && <p className="mt-1 text-xs text-rose-600">{errors.area}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Số người tối đa *</label>
                        <input
                            type="number"
                            min={1}
                            value={form.max_occupants}
                            onChange={(e) => onChangeField('max_occupants')(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.max_occupants && <p className="mt-1 text-xs text-rose-600">{errors.max_occupants}</p>}
                    </div>

                    <div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <p className="text-sm font-medium text-slate-700">Trạng thái: {form.status}</p>
                        </div>
                    </div>

                    {/* Amenities */}
                    {amenities.length > 0 && (
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiện ích</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {amenities.map((amenity) => (
                                    <label
                                        key={amenity.id}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.amenityIds.includes(amenity.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onChangeField('amenityIds')([...form.amenityIds, amenity.id]);
                                                } else {
                                                    onChangeField('amenityIds')(form.amenityIds.filter(id => id !== amenity.id));
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                        />
                                        <span className="text-sm text-slate-700">{amenity.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <MultiImageUpload
                            label="Ảnh phòng"
                            value={form.images}
                            onChange={(urls) => onChangeField('images')(urls)}
                            maxImages={10}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả phòng</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => onChangeField('description')(e.target.value)}
                            rows={4}
                            placeholder="Mô tả chi tiết về phòng..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts/${roomPostId}`)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 ${
                            isRejected
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
