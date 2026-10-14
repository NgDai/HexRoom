import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header, Footer } from '@/app/features/home/components';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { getPublicBlogPostBySlugRequest, type BlogPostItem } from '@/lib/api';

export function BlogDetailPage() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const [post, setPost] = useState<BlogPostItem | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [lastFetchedSlug, setLastFetchedSlug] = useState<string>('');
    const loading = !!slug && lastFetchedSlug !== slug;

    const fetchPost = useCallback(async () => {
        if (!slug) return;
        try {
            const res = await getPublicBlogPostBySlugRequest(slug);
            setPost(res.data);
            setError(null);
        } catch (err) {
            setPost(null);
            setError(err instanceof Error ? err.message : 'Không tải được bài viết');
        } finally {
            setLastFetchedSlug(slug);
        }
    }, [slug]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    const publishedAt = post?.publishedAt ? new Date(post.publishedAt).toLocaleDateString('vi-VN') : '';

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                <button
                    type="button"
                    onClick={() => navigate('/blog')}
                    className="text-sm text-muted-foreground hover:text-primary mb-6"
                >
                    ← Quay lại blog
                </button>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-8 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-56 bg-muted rounded-2xl" />
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-5/6" />
                    </div>
                ) : error ? (
                    <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-muted/20">
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            type="button"
                            onClick={() => navigate('/blog')}
                            className="mt-4 text-primary font-semibold hover:underline"
                        >
                            Xem danh sach bai viet
                        </button>
                    </div>
                ) : post ? (
                    <article className="space-y-6">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                                {post.category?.name || 'Tin tuc'}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{post.title}</h1>
                            <p className="text-sm text-muted-foreground mt-2">
                                {publishedAt && `${publishedAt} · `}
                                {post.author?.fullName || 'HexRoom'}
                            </p>
                        </div>

                        {post.coverImageUrl && (
                            <div className="overflow-hidden rounded-2xl border border-border">
                                <ImageWithFallback
                                    src={post.coverImageUrl}
                                    alt={post.title}
                                    className="w-full h-72 object-cover"
                                />
                            </div>
                        )}

                        {post.excerpt && (
                            <p className="text-lg text-foreground/80">{post.excerpt}</p>
                        )}

                        <div className="prose max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                            {post.content}
                        </div>

                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-4">
                                {post.tags.map((tag) => (
                                    <span key={tag.id} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                                        #{tag.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </article>
                ) : null}
            </main>

            <Footer />
        </div>
    );
}
