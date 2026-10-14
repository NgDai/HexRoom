import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/context/useAuth';
import { checkQueueStatus, handleViolationReport, listViolationReports, type QueueLockStatus } from '../shared/moderator-storage';
import type { ReportAction, ReportStatus, ViolationReport } from '../shared/types';

const statusBadgeClass: Record<ReportStatus, string> = {
    open: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    dismissed: 'bg-slate-200 text-slate-700',
};

const statusLabel: Record<ReportStatus, string> = {
    open: 'Đang chờ',
    resolved: 'Đã xử lý',
    dismissed: 'Bị từ chối',
};

const actionLabel: Record<ReportAction, string> = {
    warning: 'Cảnh cáo người dùng',
    remove_content: 'Gỡ nội dung',
    restrict_content: 'Hạn chế nội dung',
    suspend_user: 'Khóa tài khoản',
    dismiss_report: 'Từ chối báo cáo',
};

function formatDateTime(dateString?: string) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function HandleReportsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const highlightApplied = useRef(false);

    const [reports, setReports] = useState<ViolationReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('open');
    const [selectedId, setSelectedId] = useState(highlightId ?? '');
    const [note, setNote] = useState('');
    const [selectedAction, setSelectedAction] = useState<ReportAction>('dismiss_report');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [queueLock, setQueueLock] = useState<QueueLockStatus>({ hasQueue: false });
    const { user } = useAuth();

    const loadData = async () => {
        setIsLoading(true);
        const data = await listViolationReports();
        setReports(data);
        setSelectedId((current) => current || data[0]?.report_id || '');
        setIsLoading(false);
    };

    useEffect(() => {
        void loadData();
    }, []);

    // Auto-select highlighted item from queue navigation
    useEffect(() => {
        if (highlightId && !highlightApplied.current && reports.length > 0) {
            const exists = reports.some((item) => item.report_id === highlightId);
            if (exists) {
                setSelectedId(highlightId);
                setStatusFilter('all');
            }
            highlightApplied.current = true;
            setSearchParams({}, { replace: true });
        }
    }, [reports, highlightId, setSearchParams]);

    const filteredReports = useMemo(() => {
        if (statusFilter === 'all') return reports;
        return reports.filter((item) => item.status === statusFilter);
    }, [reports, statusFilter]);

    useEffect(() => {
        if (filteredReports.length === 0) {
            setSelectedId('');
            return;
        }
        const exists = filteredReports.some((item) => item.report_id === selectedId);
        if (!exists) {
            setSelectedId(filteredReports[0].report_id);
        }
    }, [filteredReports, selectedId]);

    const selectedReport = filteredReports.find((item) => item.report_id === selectedId) ?? null;
    const isReportOpen = selectedReport?.status === 'open';

    // Check queue lock status when selection changes
    useEffect(() => {
        if (!selectedId) { setQueueLock({ hasQueue: false }); return; }
        checkQueueStatus('REPORT', selectedId).then(setQueueLock);
    }, [selectedId]);

    const onHandleReport = async () => {
        if (!selectedReport || !isReportOpen) return;
        setIsSubmitting(true);
        try {
            await handleViolationReport({
                report_id: selectedReport.report_id,
                action: selectedAction,
                note,
                moderator_id: 'moderator-demo',
            });
            setNote('');
            await loadData();
            setQueueLock({ hasQueue: false });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Thao tác thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="mx-auto w-full max-w-7xl py-6">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">Xử lý báo cáo vi phạm</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Xem xét và xử lý các báo cáo vi phạm từ người dùng.
                </p>
            </header>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Lọc theo trạng thái</label>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | ReportStatus)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 md:w-72"
                >
                    <option value="all">Tất cả</option>
                    <option value="open">Đang chờ</option>
                    <option value="resolved">Đã xử lý</option>
                    <option value="dismissed">Bị từ chối</option>
                </select>
            </div>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                    Đang tải danh sách báo cáo...
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-2">
                        {filteredReports.length === 0 ? (
                            <p className="p-4 text-sm text-slate-600">Không tìm thấy báo cáo nào phù hợp.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {filteredReports.map((report) => (
                                    <li key={report.report_id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(report.report_id)}
                                            className={`w-full px-4 py-3 text-left transition ${selectedId === report.report_id ? 'bg-slate-50' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-medium text-slate-900">{report.category}</p>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[report.status]}`}
                                                >
                                                    {statusLabel[report.status]}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-600">
                                                Mục tiêu: {report.target_type} ({report.target_id})
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Đã gửi lúc: {formatDateTime(report.created_at)}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        {!selectedReport ? (
                            <p className="text-sm text-slate-600">Chọn một báo cáo để xem chi tiết.</p>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {selectedReport.category}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600">{selectedReport.details}</p>
                                </div>

                                <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <dt className="text-xs text-slate-500">Người tác cáo</dt>
                                        <dd className="font-medium">{selectedReport.reporter_id}</dd>
                                        {selectedReport.reporter_email && (
                                            <dd className="mt-0.5 text-xs text-slate-500">📧 {selectedReport.reporter_email}</dd>
                                        )}
                                        {selectedReport.reporter_phone && (
                                            <dd className="mt-0.5 text-xs text-slate-500">📱 {selectedReport.reporter_phone}</dd>
                                        )}
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <dt className="text-xs text-slate-500">Người / Đối tượng bị báo cáo</dt>
                                        <dd className="font-medium">{selectedReport.target_user_id}</dd>
                                        {selectedReport.target_user_email && (
                                            <dd className="mt-0.5 text-xs text-slate-500">📧 {selectedReport.target_user_email}</dd>
                                        )}
                                        {selectedReport.target_user_phone && (
                                            <dd className="mt-0.5 text-xs text-slate-500">📱 {selectedReport.target_user_phone}</dd>
                                        )}
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <dt className="text-xs text-slate-500">Trạng thái</dt>
                                        <dd className="font-medium">{statusLabel[selectedReport.status]}</dd>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <dt className="text-xs text-slate-500">Đã xử lý lúc</dt>
                                        <dd className="font-medium">{formatDateTime(selectedReport.resolved_at)}</dd>
                                    </div>
                                </dl>

                                {selectedReport.action_taken ? (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Hành động đã xứ lý</p>
                                        <p className="mt-1 text-sm text-slate-700">
                                            {actionLabel[selectedReport.action_taken]}
                                        </p>
                                    </div>
                                ) : null}

                                {queueLock.hasQueue && queueLock.status === 'OPEN' && (
                                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                        ⚠ Bạn cần nhận task từ <strong>Moderation Queue</strong> trước khi xử lý mục này.
                                    </div>
                                )}
                                {queueLock.hasQueue && queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id && (
                                    <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                        🔒 Task này đang được <strong>{queueLock.assignedToName || 'moderator khác'}</strong> xử lý.
                                    </div>
                                )}

                                {isReportOpen && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">Hành động xử lý</label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="moderator_action"
                                                    value="dismiss_report"
                                                    checked={selectedAction === 'dismiss_report'}
                                                    onChange={(e) => setSelectedAction(e.target.value as ReportAction)}
                                                    className="h-4 w-4 text-slate-900 focus:ring-slate-500"
                                                />
                                                Báo cáo không hợp lệ (Dismiss)
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="moderator_action"
                                                    value="warning"
                                                    checked={selectedAction === 'warning'}
                                                    onChange={(e) => setSelectedAction(e.target.value as ReportAction)}
                                                    className="h-4 w-4 text-slate-900 focus:ring-slate-500"
                                                />
                                                Cảnh cáo người dùng (Warning)
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Ghi chú của quản trị viên
                                    </label>
                                    <textarea
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        rows={3}
                                        placeholder="Ghi chú điều tra (không bắt buộc)"
                                        disabled={!isReportOpen}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100"
                                    />
                                </div>

                                <button
                                    type="button"
                                    disabled={!isReportOpen || isSubmitting || (queueLock.hasQueue && (queueLock.status === 'OPEN' || (queueLock.status === 'IN_PROGRESS' && queueLock.assignedTo !== user?.id)))}
                                    onClick={onHandleReport}
                                    className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
                                >
                                    {isReportOpen ? 'Áp dụng' : 'Báo cáo đã được xử lý'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
