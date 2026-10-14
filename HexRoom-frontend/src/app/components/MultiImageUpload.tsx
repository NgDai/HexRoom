import { useRef, useState } from 'react';
import { Loader2, X, ImagePlus } from 'lucide-react';
import { uploadImageRequest } from '@/lib/api';

interface MultiImageUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    label?: string;
    accept?: string;
    maxImages?: number;
    maxSizeMB?: number;
}

const DEFAULT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';

export function MultiImageUpload({
    value,
    onChange,
    label = 'Ảnh rental',
    accept = DEFAULT_ACCEPT,
    maxImages = 10,
    maxSizeMB = 5,
}: MultiImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadCount, setUploadCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            return;
        }

        // Convert to array NGAY LẬP TỨC - trước reset!
        const filesArray = Array.from(files);

        // Reset the input AFTER Array.from
        e.target.value = '';

        setError(null);

        const remaining = maxImages - value.length;
        if (remaining <= 0) {
            setError(`Tối đa ${maxImages} ảnh`);
            return;
        }

        const selectedFiles = filesArray.slice(0, remaining);

        // Validate sizes
        const oversized = selectedFiles.find((f) => f.size > maxSizeMB * 1024 * 1024);
        if (oversized) {
            const msg = `Ảnh "${oversized.name}" vượt quá ${maxSizeMB}MB`;
            setError(msg);
            return;
        }

        setUploading(true);
        setUploadCount(selectedFiles.length);

        try {
            // Upload song song tất cả ảnh
            const results = await Promise.allSettled(
                selectedFiles.map((file) => uploadImageRequest(file))
            );

            const newUrls: string[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    newUrls.push(result.value.url);
                } else {
                    const errMsg = result.reason instanceof Error
                        ? result.reason.message
                        : `Lỗi upload ${selectedFiles[index].name}`;
                    console.error(`Upload failed for ${selectedFiles[index].name}:`, result.reason);
                    errors.push(errMsg);
                }
            });

            if (newUrls.length > 0) {
                onChange([...value, ...newUrls]);
            }
            if (errors.length > 0) {
                setError(errors.join('; '));
            }
        } catch (err) {
            console.error('Unexpected upload error:', err);
            setError(err instanceof Error ? err.message : 'Lỗi không xác định khi tải ảnh');
        } finally {
            setUploading(false);
            setUploadCount(0);
        }
    };

    const removeImage = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleClickUpload = () => {
        if (inputRef.current) {
            inputRef.current.click();
        }
    };

    const canAddMore = value.length < maxImages && !uploading;

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            )}

            {/* Image preview grid */}
            {value.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                    {value.map((url, index) => (
                        <div key={url} className="group relative">
                            <img
                                src={url}
                                alt={`Rental image ${index + 1}`}
                                crossOrigin="anonymous"
                                className="w-full aspect-square rounded-xl object-cover border border-slate-200"
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-600"
                            >
                                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple
                onChange={handleFilesChange}
                disabled={!canAddMore}
                className="hidden"
            />

            {/* Upload trigger button */}
            {value.length < maxImages && (
                <button
                    type="button"
                    onClick={handleClickUpload}
                    disabled={!canAddMore}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-colors text-sm font-medium w-full justify-center ${!canAddMore ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang tải {uploadCount} ảnh...
                        </>
                    ) : (
                        <>
                            <ImagePlus className="w-4 h-4" strokeWidth={2} />
                            Thêm ảnh ({value.length}/{maxImages})
                        </>
                    )}
                </button>
            )}

            {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
            <p className="mt-1 text-xs text-slate-400">
                Định dạng: JPEG, PNG, GIF, WebP. Tối đa {maxSizeMB}MB/ảnh. Ảnh được lưu trên Cloudinary.
            </p>
        </div>
    );
}

