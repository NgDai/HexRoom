import React from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { REPORT_REASONS } from '../constants';
import type { ReportData } from '../types';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ReportData) => void | Promise<void>;
    propertyName: string;
}

export function ReportModal({ isOpen, onClose, onSubmit, propertyName }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = React.useState('');
    const [details, setDetails] = React.useState('');
    const [errors, setErrors] = React.useState<{ reason?: string; details?: string }>({});
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: typeof errors = {};

        if (!selectedReason) {
            newErrors.reason = 'Vui lòng chọn lý do báo cáo';
        }

        if (!details.trim()) {
            newErrors.details = 'Vui lòng mô tả chi tiết';
        } else if (details.trim().length < 20) {
            newErrors.details = 'Mô tả phải có ít nhất 20 ký tự';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setSubmitting(true);
        try {
            await onSubmit({ reason: selectedReason, details });
            handleClose();
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason('');
        setDetails('');
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-135 my-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                            <Flag className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Báo cáo tin đăng</h2>
                            <p className="text-xs text-foreground/60">{propertyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Warning */}
                    <div className="flex gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground/70">
                            Báo cáo sẽ được kiểm duyệt trong 24–48 giờ.
                        </p>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/80">
                            Lý do báo cáo <span className="text-destructive">*</span>
                        </label>

                        <div className="space-y-1.5">
                            {REPORT_REASONS.map((reason) => (
                                <label
                                    key={reason.value}
                                    className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-all ${selectedReason === reason.value
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                            : 'border-border hover:border-primary/30 hover:bg-primary/5'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={reason.value}
                                        checked={selectedReason === reason.value}
                                        onChange={(e) => {
                                            setSelectedReason(e.target.value);
                                            if (errors.reason)
                                                setErrors({ ...errors, reason: undefined });
                                        }}
                                        className="mt-1 w-3.5 h-3.5 text-primary focus:ring-primary/20"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{reason.label}</div>
                                        <div className="text-xs text-foreground/60">
                                            {reason.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {errors.reason && (
                            <p className="text-xs text-destructive">{errors.reason}</p>
                        )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5">
                        <label htmlFor="details" className="text-sm text-foreground/80">
                            Mô tả chi tiết <span className="text-destructive">*</span>
                        </label>
                        <textarea
                            id="details"
                            rows={4}
                            value={details}
                            onChange={(e) => {
                                setDetails(e.target.value);
                                if (errors.details) setErrors({ ...errors, details: undefined });
                            }}
                            placeholder="Mô tả cụ thể vấn đề bạn gặp phải..."
                            className={`w-full px-3 py-2 bg-background border rounded-lg resize-none focus:outline-none focus:ring-2 text-sm ${errors.details
                                    ? 'border-destructive focus:ring-destructive/20'
                                    : 'border-border focus:ring-primary/20 focus:border-primary'
                                }`}
                        />
                        <div className="flex justify-between text-xs text-foreground/50">
                            {errors.details ? (
                                <span className="text-destructive">{errors.details}</span>
                            ) : (
                                <span />
                            )}
                            <span>{details.length} ký tự</span>
                        </div>
                    </div>

                    {/* Privacy */}
                    <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-foreground/70">
                        🔒 Thông tin của bạn được bảo mật, chủ nhà sẽ không biết ai đã báo cáo.
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm hover:bg-destructive/90 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                            <Flag className="w-3.5 h-3.5" />
                            {submitting ? 'Đang gửi…' : 'Gửi báo cáo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
