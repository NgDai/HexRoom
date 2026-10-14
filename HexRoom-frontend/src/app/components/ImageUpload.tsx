import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadImageRequest } from '@/lib/api';

interface ImageUploadProps {
    value?: string;
    onChange?: (url: string) => void;
    label?: string;
    accept?: string;
    placeholder?: string;
    previewClassName?: string;
    maxSizeMB?: number;
}

const DEFAULT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';

export function ImageUpload({
    value = '',
    onChange = () => { },
    label = 'Ảnh',
    accept = DEFAULT_ACCEPT,
    placeholder = 'Chọn ảnh từ máy tính',
    previewClassName = 'w-24 h-24 rounded-xl object-cover border border-border',
    maxSizeMB = 5,
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        setError(null);
        if (!file) return;

        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`Ảnh tối đa ${maxSizeMB}MB`);
            return;
        }

        setUploading(true);
        try {
            const { url } = await uploadImageRequest(file);
            onChange(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Tải ảnh lên thất bại');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
            )}
            <div className="flex flex-wrap items-center gap-4">
                {(value || uploading) && (
                    <div className="relative">
                        {uploading ? (
                            <div
                                className={`${previewClassName} flex items-center justify-center bg-muted`}
                            >
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <img
                                src={value}
                                alt="Preview"
                                crossOrigin="anonymous"
                                className={previewClassName}
                            />
                        )}
                    </div>
                )}
                <div className="flex flex-col gap-1">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-60"
                    >
                        <Upload className="w-4 h-4" strokeWidth={2} />
                        {uploading ? 'Đang tải lên...' : placeholder}
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            disabled={uploading}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Xóa ảnh
                        </button>
                    )}
                </div>
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-destructive">{error}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
                Định dạng: JPEG, PNG, GIF, WebP. Tối đa {maxSizeMB}MB. Ảnh được lưu trên Cloudinary.
            </p>
        </div>
    );
}
