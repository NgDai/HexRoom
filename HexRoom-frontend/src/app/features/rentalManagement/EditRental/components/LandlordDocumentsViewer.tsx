import { useState, useEffect } from 'react';
import { getLandlordRentalDocumentsRequest } from '@/lib/api';
import { Eye, ShieldCheck, XCircle, Clock } from 'lucide-react';

interface DocumentInfo {
    id: string;
    documentType: string;
    status: string;
    signedUrl: string | null;
    uploadedAt: string;
}

interface Props {
    rentalId: string;
}

const DOCUMENT_LABELS = {
    CCCD: { key: 'CCCD' as const, label: 'Căn cước công dân', description: 'Mặt trước và mặt sau' },
    SO_DO: { key: 'SO_DO' as const, label: 'Sổ đỏ / GCN quyền sử dụng đất', description: 'Các trang cần thiết' },
    GPKD: { key: 'GPKD' as const, label: 'Giấy phép kinh doanh', description: 'Ảnh chụp rõ nét' },
    OTHER: { key: 'OTHER' as const, label: 'Giấy tờ khác', description: 'Hợp đồng thuê nhà, ủy quyền...' },
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'APPROVED':
            return <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded-md text-[10px] font-medium"><ShieldCheck size={12} /> Đã duyệt</div>;
        case 'REJECTED':
            return <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-700 rounded-md text-[10px] font-medium"><XCircle size={12} /> Bị từ chối</div>;
        default:
            return <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-medium"><Clock size={12} /> Chờ duyệt</div>;
    }
};

export function LandlordDocumentsViewer({ rentalId }: Props) {
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const fetchDocs = async () => {
            try {
                const res = await getLandlordRentalDocumentsRequest(rentalId);
                if (active) setDocuments(res.data.documents || []);
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Không thể tải tài liệu');
            } finally {
                if (active) setLoading(false);
            }
        };

        if (rentalId) fetchDocs();

        return () => { active = false; };
    }, [rentalId]);

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div>;
    if (error) return <div className="text-sm text-red-600 p-4 bg-red-50 rounded-xl">{error}</div>;

    const groupedDocs = {
        CCCD: documents.filter(d => d.documentType === 'CCCD'),
        SO_DO: documents.filter(d => d.documentType === 'SO_DO'),
        GPKD: documents.filter(d => d.documentType === 'GPKD'),
        OTHER: documents.filter(d => !['CCCD', 'SO_DO', 'GPKD'].includes(d.documentType))
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Eye size={16} className="text-indigo-600" />
                Giấy tờ xác minh đã nộp (không hiển thị công khai)
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
                {Object.values(DOCUMENT_LABELS).map((cat) => {
                    const docs = groupedDocs[cat.key];
                    return (
                        <div key={cat.key} className="bg-white rounded-lg p-3 border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-1">{cat.label}</label>

                            {docs.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {docs.map(doc => (
                                        <div key={doc.id} className="group relative block rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50 hover:border-emerald-400 transition-colors">
                                            {doc.signedUrl ? (
                                                <img
                                                    src={doc.signedUrl}
                                                    alt={cat.label}
                                                    crossOrigin="anonymous"
                                                    className="w-full h-24 object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`${doc.signedUrl ? 'hidden' : ''} w-full h-24 flex items-center justify-center text-xs text-slate-400 bg-slate-100`}>
                                                Không tải được ảnh
                                            </div>

                                            <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <a href={doc.signedUrl || '#'} target="_blank" rel="noreferrer" className="pointer-events-auto text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded hover:bg-black/70">
                                                    Xem ảnh gốc
                                                </a>
                                            </div>

                                            <div className="flex items-center justify-between px-2 py-1.5 border-t border-emerald-100 bg-emerald-50/50">
                                                <span className="text-[11px] font-medium text-emerald-700 truncate pr-1">Đã nộp</span>
                                                {getStatusBadge(doc.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-3 flex items-center justify-center h-[126px] rounded-lg border border-dashed border-slate-200 bg-slate-50">
                                    <span className="text-xs text-slate-400">Không có giấy tờ</span>
                                </div>
                            )}

                            <div className="mt-2 text-[11px] text-slate-500">
                                {cat.description}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
