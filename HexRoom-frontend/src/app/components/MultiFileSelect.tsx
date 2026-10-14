import { useRef, useState } from 'react';
import { X, FileUp } from 'lucide-react';

interface MultiFileSelectProps {
    value: File[];
    onChange: (files: File[]) => void;
    label?: string;
    accept?: string;
    maxFiles?: number;
    maxSizeMB?: number;
    existingFiles?: Array<{ id: string; name: string; url?: string }>;
    onRemoveExisting?: (id: string) => void;
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

export function MultiFileSelect({
    value,
    onChange,
    label = 'Chọn file',
    accept = DEFAULT_ACCEPT,
    maxFiles = 5,
    maxSizeMB = 10,
    existingFiles = [],
    onRemoveExisting,
}: MultiFileSelectProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            return;
        }

        const filesArray = Array.from(files);
        e.target.value = '';
        setError(null);

        const totalCount = value.length + existingFiles.length;
        const remaining = maxFiles - totalCount;
        if (remaining <= 0) {
            setError(`Tối đa ${maxFiles} file`);
            return;
        }

        const selectedFiles = filesArray.slice(0, remaining);

        // Validate sizes
        const oversized = selectedFiles.find((f) => f.size > maxSizeMB * 1024 * 1024);
        if (oversized) {
            const msg = `File "${oversized.name}" vượt quá ${maxSizeMB}MB`;
            setError(msg);
            return;
        }

        // Add files to existing list
        onChange([...value, ...selectedFiles]);
    };

    const handleRemove = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleClear = () => {
        onChange([]);
        setError(null);
    };

    return (
        <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>

            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-slate-400 hover:bg-slate-100">
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={accept}
                    onChange={handleFilesChange}
                    className="hidden"
                    aria-label={label}
                />

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 text-center"
                >
                    <FileUp className="h-6 w-6 text-slate-400" />
                    <div>
                        <p className="text-sm font-medium text-slate-700">
                            Nhấp để chọn file hoặc kéo thả
                        </p>
                        <p className="text-xs text-slate-500">
                            PDF, JPG, PNG, WebP (tối đa {maxSizeMB}MB/file)
                        </p>
                    </div>
                </button>
            </div>

            {error && (
                <p className="mt-2 text-xs text-rose-600">{error}</p>
            )}

            {(value.length > 0 || existingFiles.length > 0) && (
                <div className="mt-3 space-y-2">
                    {/* Render Existing Files */}
                    {existingFiles.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {existingFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="group relative block rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50 hover:border-emerald-400 transition-colors"
                                >
                                    {file.url ? (
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            crossOrigin="anonymous"
                                            className="w-full h-24 object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`${file.url ? 'hidden' : ''} w-full h-24 flex items-center justify-center text-xs text-slate-400`}>
                                        Không tải được ảnh
                                    </div>

                                    {/* Overlay for viewing image */}
                                    <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <a
                                            href={file.url || '#'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="pointer-events-auto text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded hover:bg-black/70"
                                        >
                                            Xem ảnh gốc
                                        </a>
                                    </div>

                                    {/* Remove button */}
                                    {onRemoveExisting && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onRemoveExisting(file.id);
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-full transition-colors z-10"
                                            title="Xóa giấy tờ này"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}

                                    <div className="px-2 py-1.5 text-[11px] font-medium text-emerald-700 truncate border-t border-emerald-100">
                                        ✓ {file.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Render New Files */}
                    {value.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm text-slate-700">
                                    {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {(file.size / 1024 / 1024).toFixed(2)}MB
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="ml-2 inline-flex p-1 text-slate-400 hover:text-rose-600"
                                aria-label="Remove file"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    {value.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="mt-2 text-xs text-slate-600 hover:text-slate-900 underline"
                        >
                            Xóa tất cả
                        </button>
                    )}
                </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
                {value.length + existingFiles.length}/{maxFiles} file được chọn
            </p>
        </div>
    );
}
