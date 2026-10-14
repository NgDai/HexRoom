import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import type { PublicRental } from '@/lib/api';

const SLIDE_INTERVAL_MS = 5000;

interface HeroSlideshowProps {
    /** Rental images for background slides (from API). If empty, one placeholder slide. */
    rentals: PublicRental[];
    /** Search form or any content to overlay in the center */
    children: React.ReactNode;
    customImageUrl?: string;
    ctaText?: string;
    ctaLink?: string;
}

export function HeroSlideshow({ rentals, children, customImageUrl, ctaText, ctaLink }: HeroSlideshowProps) {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);

    const rawSlides = rentals.flatMap((r) =>
        (r.images?.length ? r.images : ['']).map((img) => ({ imageUrl: img, rentalId: r.id, rentalTitle: r.title }))
    ).filter((s) => s.imageUrl || s.rentalId);
    const slides =
        rawSlides.length > 0
            ? rawSlides
            : [{ imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200', rentalId: '', rentalTitle: '' }];
    const displaySlides = customImageUrl
        ? [{ imageUrl: customImageUrl, rentalId: '', rentalTitle: '' }]
        : slides;

    useEffect(() => {
        if (displaySlides.length <= 1) return undefined;
        const id = setInterval(() => {
            setCurrentIndex((i) => (i + 1) % displaySlides.length);
        }, SLIDE_INTERVAL_MS);
        return () => clearInterval(id);
    }, [displaySlides.length]);

    const normalizedIndex = displaySlides.length > 0 ? currentIndex % displaySlides.length : 0;
    const current = displaySlides[normalizedIndex] || displaySlides[0];

    return (
        <section className="relative min-h-100 sm:min-h-120 md:min-h-130 lg:min-h-140 flex items-center justify-center overflow-hidden">
            {/* Background slides – contain repaints so overlay stays stable */}
            <div className="absolute inset-0 contain-[paint]">
                {displaySlides.map((slide, i) => (
                    <div
                        key={`${slide.rentalId}-${i}`}
                        className={`absolute inset-0 transition-opacity duration-700 ${i === normalizedIndex ? 'opacity-100 z-0' : 'opacity-0 z-0'
                            }`}
                    >
                        {slide.imageUrl ? (
                            <ImageWithFallback
                                src={slide.imageUrl}
                                alt=""
                                crossOrigin="anonymous"
                                className="w-full h-full object-cover"
                                loading={i === 0 ? 'eager' : 'lazy'}
                            />
                        ) : (
                            <div className="w-full h-full bg-muted/80" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/45 to-black/60" />
                    </div>
                ))}
            </div>

            {/* Overlay content: isolate from carousel repaints to prevent text glitch */}
            <div className="relative z-10 w-full max-w-4xl px-3 sm:px-4 flex flex-col items-center gap-4 sm:gap-6 pb-4 isolate transform-[translateZ(0)] backface-hidden">
                {children}
                {ctaText && ctaLink && (
                    <a
                        href={ctaLink}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                        {ctaText}
                    </a>
                )}
                {current?.rentalId && (
                    <Link
                        to={`/rental/${current.rentalId}`}
                        className="inline-flex items-center gap-1.5 text-white/95 hover:text-white text-sm font-medium underline underline-offset-2 decoration-white/50 hover:decoration-white transition-all"
                    >
                        {t('home.heroViewListing')}
                        <span aria-hidden>→</span>
                    </Link>
                )}
            </div>

            {/* Pagination dots */}
            {displaySlides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2.5">
                    {displaySlides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Slide ${i + 1}`}
                            onClick={() => setCurrentIndex(i)}
                            className={`rounded-full transition-all duration-300 touch-manipulation ${i === normalizedIndex
                                ? 'w-6 h-2.5 bg-white shadow-md'
                                : 'w-2.5 h-2.5 bg-white/60 hover:bg-white/90 hover:scale-110'
                                }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
