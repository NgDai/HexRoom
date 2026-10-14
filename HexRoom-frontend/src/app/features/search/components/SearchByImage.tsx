import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, X, AlertCircle, CheckCircle, Sparkles, Brain, Camera, Info, Lock } from 'lucide-react';
import { MAX_IMAGE_SIZE, VALID_IMAGE_TYPES, VIP_IMAGE_SEARCH_ERROR } from '../constants';

interface SearchByImageProps {
    onSearch: (imageFile: File, options?: { district?: string; textHint?: string }) => void;
    isSearching: boolean;
    imageSearchError?: string | null;
    isVip?: boolean;
}

export function SearchByImage({ onSearch, isSearching, imageSearchError = null, isVip = false }: SearchByImageProps) {
    const { t } = useTranslation();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [textHint, setTextHint] = useState('');
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateImage = useCallback((file: File): boolean => {
        if (!VALID_IMAGE_TYPES.includes(file.type)) {
            setError(t('search.image.invalidFormat'));
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setError(t('search.image.tooLarge'));
            return false;
        }
        return true;
    }, [t]);

    const handleFileSelect = useCallback((file: File) => {
        setError('');
        if (!validateImage(file)) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
    }, [validateImage]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleRemoveImage = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!isVip) return;
        if (!selectedFile) { setError(t('search.image.noImage')); return; }
        onSearch(selectedFile, { textHint: textHint.trim() || undefined });
    };

    if (!isVip) {
        return (
            <div className="bg-card rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto border border-border">
                <div className="relative bg-linear-to-r from-violet-600/90 via-purple-600/90 to-indigo-600/90 px-6 py-6 text-center">
                    <Lock className="w-10 h-10 text-white/90 mx-auto mb-3" aria-hidden />
                    <h3 className="text-white font-heading font-semibold text-lg">{t('search.image.vipGateTitle')}</h3>
                    <p className="text-white/80 text-sm mt-2 max-w-md mx-auto">{t('search.image.vipGateDesc')}</p>
                    <Link
                        to="/vip-plans?source=search_image"
                        className="inline-flex items-center justify-center mt-5 px-6 py-2.5 rounded-xl bg-white text-violet-700 font-semibold text-sm hover:bg-white/95 transition-colors shadow-md"
                    >
                        {t('search.image.vipGateCta')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto">
            {/* AI header */}
            <div className="relative bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-4 overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }}
                />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">AI Visual Search · CLIP</h3>
                            <p className="text-white/70 text-xs">Image embeddings · pgvector cosine similarity</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white/90 text-xs font-medium">
                            {isVip ? 'VIP · Unlimited' : 'AI Active'}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Error */}
                {(error || imageSearchError) && (
                    <div
                        className={`p-4 rounded-xl flex flex-col gap-3 ${imageSearchError === VIP_IMAGE_SEARCH_ERROR
                            ? 'bg-violet-500/10 border border-violet-500/25'
                            : 'bg-destructive/10 border border-destructive/20'
                            }`}
                    >
                        {imageSearchError === VIP_IMAGE_SEARCH_ERROR ? (
                            <>
                                <div className="flex items-start gap-3">
                                    <Lock className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                                    <p className="text-foreground text-sm">{t('search.image.vipRequiredApi')}</p>
                                </div>
                                <Link
                                    to="/vip-plans?source=search_image_403"
                                    className="inline-flex w-fit items-center px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                                >
                                    {t('search.image.vipGateCta')}
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <p className="text-destructive text-sm">{error || imageSearchError}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload zone */}
                {!previewUrl ? (
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all cursor-pointer ${isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-border hover:border-violet-400/60 hover:bg-muted/30'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="flex flex-col items-center space-y-4">
                            <div className={`w-18 h-18 rounded-2xl p-4 transition-all ${isDragging ? 'bg-violet-500/20' : 'bg-primary/10'}`}>
                                <Camera className={`w-10 h-10 transition-colors ${isDragging ? 'text-violet-500' : 'text-primary'}`} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-foreground">{t('search.image.uploadTitle')}</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                    {t('search.image.dragDrop')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                disabled={isSearching}
                                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <ImageIcon className="w-4 h-4" />
                                {t('search.image.selectBtn')}
                            </button>
                            <p className="text-xs text-muted-foreground">{t('search.image.formats')}</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileInputChange} className="hidden" disabled={isSearching} />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden bg-muted group">
                            <img src={previewUrl} alt="Preview" crossOrigin="anonymous" className="w-full h-auto max-h-64 object-contain" />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                disabled={isSearching}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
                            >
                                <X className="w-4 h-4 text-foreground" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            <p className="text-primary text-sm">{t('search.image.imageReady')}</p>
                        </div>
                    </div>
                )}

                {/* Text hint — shown once image is selected */}
                {previewUrl && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-violet-500" />
                                {t('search.image.textHintLabel')} <span className="text-xs font-normal text-muted-foreground">{t('search.image.textHintOptional')}</span>
                            </label>
                            <div className="group relative">
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-popover border border-border rounded-lg text-xs text-muted-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {t('search.image.clipTooltip')}
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <textarea
                                value={textHint}
                                onChange={(e) => setTextHint(e.target.value)}
                                placeholder={t('search.image.textHintPlaceholder')}
                                disabled={isSearching}
                                rows={2}
                                maxLength={300}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all disabled:opacity-50 resize-none text-sm pr-16"
                            />
                            {textHint.trim() && (
                                <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 pointer-events-none">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">+hint</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground text-right">{textHint.length}/300</p>
                    </div>
                )}

                {/* Submit */}
                {previewUrl && (
                    <button
                        type="submit"
                        disabled={isSearching || !selectedFile}
                        className="w-full px-6 py-3 bg-linear-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSearching ? (
                            <>
                                <Sparkles className="w-4 h-4 animate-pulse" />
                                {textHint.trim() ? t('search.image.analyzingImageText') : t('search.image.analyzingImage')}
                            </>
                        ) : (
                            <>
                                <Brain className="w-4 h-4" />
                                {textHint.trim() ? t('search.image.searchByAiImageText') : t('search.image.searchByAiImage')}
                            </>
                        )}
                    </button>
                )}
            </form>
        </div>
    );
}
