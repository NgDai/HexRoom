import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header, Footer } from '@/app/features/home/components';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { getPublicBlogPostsRequest, type BlogPostItem } from '@/lib/api';

const PAGE_SIZE = 9;

export function BlogListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('search') || '';
    const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<BlogPostItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    const [draftSearch, setDraftSearch] = useState(search);

    useEffect(() => {
        setDraftSearch(search);
    }, [search]);

    useEffect(() => {
        setLoading(true);
        getPublicBlogPostsRequest({
            page: pageFromUrl,
            limit: PAGE_SIZE,
            search: search || undefined,
        })
            .then((res) => {
                setPosts(res.data || []);
                setPagination(res.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
            })
            .catch(() => {
                setPosts([]);
                setPagination((p) => ({ ...p, total: 0, totalPages: 1 }));
            })
            .finally(() => setLoading(false));
    }, [pageFromUrl, search]);

    const updateParams = (updates: { page?: number; search?: string }) => {
        const next = new URLSearchParams(searchParams);
        if (updates.search !== undefined) {
            const value = updates.search.trim();
            if (value) next.set('search', value);
            else next.delete('search');
        }
        if (updates.page !== undefined) {
            if (updates.page > 1) next.set('page', String(updates.page));
            else next.delete('page');
        }
        setSearchParams(next);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams({ search: draftSearch, page: 1 });
    };

    const goToPage = (nextPage: number) => {
        if (nextPage < 1 || nextPage > pagination.totalPages) return;
        updateParams({ page: nextPage });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const headerText = useMemo(() => {
        if (search) return `Kết quả cho "${search}"`;
        return 'Blog & tin tức';
    }, [search]);

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{headerText}</h1>
                        <p className="text-muted-foreground">Khám phá bài viết, kinh nghiệm và tin tức phòng trọ.</p>
                    </div>
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            value={draftSearch}
                            onChange={(e) => setDraftSearch(e.target.value)}
                            placeholder="Tìm bài viết..."
                            className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                        >
                            Tìm
                        </button>
                    </form>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                                <div className="h-44 bg-muted" />
                                <div className="p-5 space-y-3">
                                    <div className="h-5 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-5/6" />
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
                        <p className="text-muted-foreground">Chưa có bài viết phù hợp.</p>
                        <button
                            type="button"
                            onClick={() => updateParams({ search: '', page: 1 })}
                            className="mt-4 text-primary font-semibold hover:underline"
                        >
                            Xem tất cả bài viết
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post) => (
                            <article
                                key={post.id}
                                onClick={() => navigate(`/blog/${post.slug}`)}
                                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                            >
                                <div className="h-44 overflow-hidden">
                                    <ImageWithFallback
                                        src={post.coverImageUrl || ''}
                                        alt={post.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-5">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                                        {post.category?.name || 'Tin tức'}
                                    </p>
                                    <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                                        {post.title}
                                    </h2>
                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                        {post.excerpt || post.content.slice(0, 120) + '...'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {post.tags.slice(0, 3).map((tag) => (
                                            <span key={tag.id} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                                #{tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                        <button
                            type="button"
                            onClick={() => goToPage(pagination.page - 1)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
                            disabled={pagination.page <= 1}
                        >
                            Trước
                        </button>
                        <span className="text-sm text-muted-foreground">
                            Trang {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => goToPage(pagination.page + 1)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
                            disabled={pagination.page >= pagination.totalPages}
                        >
                            Sau
                        </button>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
