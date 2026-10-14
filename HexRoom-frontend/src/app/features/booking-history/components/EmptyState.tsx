import { Calendar } from 'lucide-react';

interface EmptyStateProps {
    onExplore: () => void;
}

export function EmptyState({ onExplore }: EmptyStateProps) {
    return (
        <div className="bg-card rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Chưa có booking nào</h3>
            <p className="text-foreground/60 mb-6">
                Bắt đầu tìm kiếm phòng trọ phù hợp với bạn ngay hôm nay!
            </p>
            <button
                onClick={onExplore}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-sm"
            >
                Khám phá phòng trọ
            </button>
        </div>
    );
}
