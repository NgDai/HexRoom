import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RoomStatus } from '@/lib/models/room.model';
import { MultiImageUpload } from '@/app/components/MultiImageUpload';
import { getManagedRentalById } from '@/app/features/rentalManagement/shared/rental-storage';
import { createRoomPost, fetchAmenities } from '../shared/room-post-storage';
import type { RoomPostApiError } from '../shared/room-post-storage';
import {
    type CreateManagedRoomPostInput,
} from '../shared/types';

interface Amenity {
    id: string;
    name: string;
}

interface CreateRoomPostFormState {
    title: string;
    description: string;
    price: string;
    area: string;
    max_occupants: string;
    status: RoomStatus;
    images: string[];
    amenityIds: string[];
}

type FormErrors = Partial<Record<keyof CreateRoomPostFormState, string>>;

const initialForm: CreateRoomPostFormState = {
    title: '',
    description: '',
    price: '',
    area: '',
    max_occupants: '1',
    status: 'PENDING',
    images: [],
    amenityIds: [],
};

export function CreateRoomPostPage() {
    const navigate = useNavigate();
    const { rentalId = '' } = useParams();
    const [rentalTitle, setRentalTitle] = useState('');
    const [form, setForm] = useState<CreateRoomPostFormState>(initialForm);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [upgradePath, setUpgradePath] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const loadData = async () => {
            // Load rental + amenities in parallel
            const [rental, amenitiesList] = await Promise.all([
                getManagedRentalById(rentalId),
                fetchAmenities(),
            ]);
            if (!active) return;
            setRentalTitle(rental?.title ?? '');
            setAmenities(amenitiesList || []);
        };
        if (rentalId) void loadData();
        return () => {
            active = false;
        };
    }, [rentalId]);

    const parsed = useMemo(() => {
        return {
            price: Number(form.price),
            area: Number(form.area),
            maxOccupants: Number(form.max_occupants),
        };
    }, [form.area, form.max_occupants, form.price]);

    const onChangeField =
        <K extends keyof CreateRoomPostFormState>(key: K) =>
            (value: CreateRoomPostFormState[K]) => {
                setForm((prev) => ({ ...prev, [key]: value }));
                setErrors((prev) => ({ ...prev, [key]: undefined }));
            };

    const validate = () => {
        const nextErrors: FormErrors = {};
        if (!form.title.trim()) nextErrors.title = 'Tiêu đề là bắt buộc.';
        if (!Number.isFinite(parsed.price) || parsed.price <= 0)
            nextErrors.price = 'Giá phải lớn hơn 0.';
        if (!Number.isFinite(parsed.area) || parsed.area <= 0)
            nextErrors.area = 'Diện tích phải lớn hơn 0.';
        if (!Number.isFinite(parsed.maxOccupants) || parsed.maxOccupants <= 0)
            nextErrors.max_occupants = 'Số người tối đa phải lớn hơn 0.';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!rentalId) return;
        if (!validate()) return;

        const payload: CreateManagedRoomPostInput & { amenityIds?: string[] } = {
            rental_id: rentalId,
            title: form.title,
            description: form.description,
            price: parsed.price,
            area: parsed.area,
            max_occupants: parsed.maxOccupants,
            status: form.status,
            thumbnail_url: form.images[0] || '',
            images: form.images,
            amenityIds: form.amenityIds,
        };

        setIsSubmitting(true);
        setSubmitError(null);
        setUpgradePath(null);
        try {
            await createRoomPost(payload);
            navigate(`/rental-management/rentals/${rentalId}/room-posts`);
        } catch (err) {
            const apiErr = err as RoomPostApiError;
            setSubmitError(apiErr?.message || 'Không thể tạo phòng. Vui lòng thử lại.');
            if (apiErr?.code === 'FREE_TIER_ROOM_LIMIT_REACHED') {
                setUpgradePath(apiErr.upgradePath || '/vip-plans');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!rentalId) {
        return (
            <section className="mx-auto w-full max-w-4xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-slate-700">Missing rental id.</p>
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals')}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                    Back to rental list
                </button>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-4xl">
            <header className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900">Thêm phòng mới</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Điền thông tin phòng bên dưới để thêm vào bài đăng: <strong>{rentalTitle || rentalId}</strong>
                </p>
            </header>

            <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                {submitError && (
                    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-900">{submitError}</p>
                        {upgradePath && (
                            <button
                                type="button"
                                onClick={() => navigate(upgradePath)}
                                className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                            >
                                Nâng cấp VIP để mở rộng quota
                            </button>
                        )}
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiêu đề phòng *</label>
                        <input
                            value={form.title}
                            onChange={(event) => onChangeField('title')(event.target.value)}
                            placeholder="VD: Phòng kép - tầng 2"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Giá (VND) *</label>
                        <input
                            type="number"
                            min={0}
                            value={form.price}
                            onChange={(event) => onChangeField('price')(event.target.value)}
                            placeholder="VD: 3000000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.price ? <p className="mt-1 text-xs text-rose-600">{errors.price}</p> : null}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Diện tích (m²) *</label>
                        <input
                            type="number"
                            min={0}
                            value={form.area}
                            onChange={(event) => onChangeField('area')(event.target.value)}
                            placeholder="VD: 20"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.area ? <p className="mt-1 text-xs text-rose-600">{errors.area}</p> : null}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Số người tối đa *
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={form.max_occupants}
                            onChange={(event) => onChangeField('max_occupants')(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        {errors.max_occupants ? (
                            <p className="mt-1 text-xs text-rose-600">{errors.max_occupants}</p>
                        ) : null}
                    </div>

                    <div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                            <p className="text-sm font-medium text-amber-800"> Trạng thái: Chờ duyệt</p>
                            <p className="mt-0.5 text-xs text-amber-600">
                                Phòng mới tạo sẽ ở trạng thái chờ duyệt. Moderator sẽ duyệt để chuyển sang Available.
                            </p>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">Tiện ích</label>
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-3">
                            {amenities.length > 0 ? (
                                amenities.map((amenity) => (
                                    <label key={amenity.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.amenityIds.includes(amenity.id)}
                                            onChange={(event) => {
                                                const newAmenityIds = event.target.checked
                                                    ? [...form.amenityIds, amenity.id]
                                                    : form.amenityIds.filter((id) => id !== amenity.id);
                                                onChangeField('amenityIds')(newAmenityIds);
                                            }}
                                            className="rounded border-slate-300"
                                        />
                                        <span className="text-sm text-slate-700">{amenity.name}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="col-span-2 text-xs text-slate-500 md:col-span-3">Đang tải tiện ích...</p>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <MultiImageUpload
                            label="Ảnh phòng"
                            value={form.images}
                            onChange={(urls) => onChangeField('images')(urls)}
                            maxImages={10}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả chi tiết</label>
                        <textarea
                            value={form.description}
                            onChange={(event) => onChangeField('description')(event.target.value)}
                            rows={4}
                            placeholder="Mô tả tình trạng phòng, thông tin tiện ích, lệ phí,..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/rental-management/rentals/${rentalId}/room-posts`)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSubmitting ? 'Đang tạo...' : 'Tạo phòng'}
                    </button>
                </div>
            </form>
        </section>
    );
}
