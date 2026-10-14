import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    SearchTabs,
    SearchByText,
    SearchByImage,
    SearchResults,
    NearbyPlaceholder,
} from './components';
import { useSearch, useAuthLevel } from './hooks';
import { Header } from '@/app/features/home/components';

export function SearchPage() {
    const navigate = useNavigate();
    const [urlSearchParams] = useSearchParams();
    const { t } = useTranslation();
    const { isGuest, isTenant, isVip, loading: authLoading, authVerified } = useAuthLevel();
    const isLoggedIn = !authLoading && !isGuest;
    const [useMyLocation, setUseMyLocation] = useState(false);
    const basicOnly = !authLoading && isGuest;

    const {
        results,
        isSearching,
        hasSearched,
        searchByText,
        searchByImage,
        searchNearby,
        resetSearch,
        imageSearchError,
        searchError,
        searchMode,
        translatedQuery,
    } = useSearch(isLoggedIn);

    // Image tab: logged-in tenants/landlord/staff see the tab; non-VIP see locked upgrade UI inside the panel.
    const showImageTab = authVerified ? (isTenant || isVip) : false;

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            {/* Hero section with search */}
            <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 py-6 sm:py-10 lg:py-14">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-heading mb-2">
                        {isLoggedIn ? t('search.pageTitle') : t('search.pageTitleGuest')}
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg">
                        {isLoggedIn ? t('search.aiSubtitle') : t('search.guestSubtitle')}
                        {showImageTab && isVip && ` • ${t('search.subtitleImageSearchVip')}`}
                        {showImageTab && !isVip && ` • ${t('search.subtitleImageSearchLocked')}`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        {isLoggedIn && searchMode && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {searchMode === 'ai_embedding' && '🤖 AI Embedding Search'}
                                {searchMode === 'smart_keyword' && '🔍 Smart Keyword Search'}
                                {searchMode === 'clip_visual' && '🖼️ CLIP Visual Search'}
                                {searchMode === 'clip_multimodal' && '🧠 CLIP Multimodal Search (Image + Text)'}
                                {searchMode === 'basic' && '📝 Basic Search'}
                                {searchMode === 'advanced' && '⚡ Advanced Search'}
                                {searchMode === 'nearby' && '📍 Nearby Search'}
                            </div>
                        )}
                        {translatedQuery && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                🌐 Searching as: <span className="font-semibold">"{translatedQuery}"</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <SearchTabs showImageTab={showImageTab}>
                        {(activeTab) => (
                            <>
                                {activeTab === 'text' ? (
                                    <SearchByText
                                        key={`search-text-${urlSearchParams.toString()}`}
                                        onSearch={searchByText}
                                        isSearching={isSearching}
                                        basicOnly={basicOnly}
                                        onUseMyLocationChange={setUseMyLocation}
                                    />
                                ) : (
                                    <SearchByImage
                                        onSearch={searchByImage}
                                        isSearching={isSearching}
                                        imageSearchError={imageSearchError}
                                        isVip={isVip}
                                    />
                                )}
                            </>
                        )}
                    </SearchTabs>

                    {basicOnly && (
                        <div className="mt-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                                {t('search.guestLoginPrompt')}
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                                {t('search.loginNow')}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {useMyLocation && (
                    <NearbyPlaceholder
                        onSearchNearby={searchNearby}
                        isSearching={isSearching}
                        isLoggedIn={isLoggedIn}
                    />
                )}

                <SearchResults
                    results={results}
                    isSearching={isSearching}
                    hasSearched={hasSearched}
                    searchError={searchError}
                    onReset={resetSearch}
                />
            </main>
        </div>
    );
}
