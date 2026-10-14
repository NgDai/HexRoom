import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, Select, Button, Alert } from 'antd';
import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PRICE_OPTIONS } from '../constants';
import { ROOM_TYPE_OPTIONS } from '@/lib/constants/room-types';
import { useProvinces } from '@/app/hooks/useProvinces';
import { useRoomTypes } from '@/app/hooks/useRoomTypes';
import { VoiceSearchButton } from '@/app/components/VoiceSearchButton';

interface SearchFormProps {
    onSearch: (query: string, filters: SearchFilters) => void;
    onLogin?: () => void;
}

export interface SearchFilters {
    city: string;
    district: string;
    address: string;
    priceRange: string;
    roomType: string;
    amenities?: string[];
    minArea?: number;
    maxArea?: number;
}

export function SearchForm({ onSearch }: SearchFormProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { provinces, getWardsFor, loading: locationsLoading, error: locationsError } = useProvinces();
    const { options: roomTypeOptions } = useRoomTypes();

    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilters>({
        city: '',
        district: '',
        address: '',
        priceRange: '',
        roomType: '',
    });

    const doSearch = (query: string) => {
        onSearch(query, { ...filters });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        doSearch(searchQuery);
    };

    const handleVoiceResult = (transcript: string) => {
        setSearchQuery(transcript);
        doSearch(transcript);
    };

    const handleFilterChange = (key: keyof SearchFilters, value: string) => {
        setFilters((prev) => {
            const next = { ...prev, [key]: value };
            if (key === 'city') next.district = '';
            return next;
        });
    };

    const cityOptions = provinces.map((p) => ({ value: p.name, label: p.name }));
    const wardOptions = filters.city ? getWardsFor(filters.city).map((w) => ({ value: w.name, label: w.name })) : [];
    const effectiveRoomTypes = roomTypeOptions.length > 0 ? roomTypeOptions : ROOM_TYPE_OPTIONS.filter((o) => o.value);
    const roomTypeOptionsFormatted = [
        { value: '', label: t('search.roomType') || 'Loại phòng' },
        ...effectiveRoomTypes.map((o) => ({ value: o.value, label: o.label })),
    ];

    return (
        <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-4 sm:p-6 lg:p-8 w-full max-w-2xl mx-auto ring-2 ring-white/10">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="flex gap-2">
                    <Input
                        id="home-search-query"
                        name="searchQuery"
                        aria-label={t('search.placeholder') || 'Tìm theo tên, mô tả phòng'}
                        size="large"
                        placeholder={t('search.placeholder') || 'Tìm theo tên, mô tả phòng...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        prefix={<SearchOutlined className="text-muted-foreground" />}
                        className="flex-1 rounded-xl [&_.ant-input]:rounded-xl"
                    />
                    <VoiceSearchButton
                        onResult={handleVoiceResult}
                        onInterim={(text) => setSearchQuery(text)}
                        size="md"
                    />
                </div>

                {locationsError && (
                    <Alert type="warning" title={locationsError} showIcon className="rounded-xl" />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select
                        id="home-search-city"
                        aria-label={t('search.city') || 'Tỉnh / Thành phố'}
                        size="large"
                        placeholder={t('search.city')}
                        value={filters.city || undefined}
                        onChange={(v) => handleFilterChange('city', v || '')}
                        options={cityOptions}
                        allowClear
                        loading={locationsLoading}
                        notFoundContent={locationsLoading ? undefined : t('search.noProvinces')}
                        className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl"
                    />
                    <Select
                        id="home-search-ward"
                        aria-label={t('search.ward') || 'Quận / Huyện'}
                        size="large"
                        placeholder={t('search.ward')}
                        value={filters.district || undefined}
                        onChange={(v) => handleFilterChange('district', v || '')}
                        options={wardOptions}
                        allowClear
                        disabled={!filters.city}
                        loading={locationsLoading}
                        notFoundContent={!filters.city ? undefined : t('search.noWards')}
                        className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl"
                    />
                    <Select
                        id="home-search-price"
                        aria-label={t('search.priceRange') || 'Khoảng giá'}
                        size="large"
                        placeholder={t('search.priceRange')}
                        value={filters.priceRange || undefined}
                        onChange={(v) => handleFilterChange('priceRange', v || '')}
                        options={PRICE_OPTIONS.filter((o) => o.value !== '').map((o) => ({ value: o.value, label: o.label }))}
                        allowClear
                        className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl"
                    />
                    <Select
                        id="home-search-room-type"
                        aria-label={t('search.roomType') || 'Loại phòng'}
                        size="large"
                        placeholder={t('search.roomType') || 'Loại phòng'}
                        value={filters.roomType || undefined}
                        onChange={(v) => handleFilterChange('roomType', v || '')}
                        options={roomTypeOptionsFormatted}
                        allowClear
                        className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<SearchOutlined />}
                        className="flex-1 rounded-xl font-semibold h-11 sm:h-12 min-h-[44px] touch-manipulation shadow-md hover:shadow-lg transition-shadow active:scale-[0.98]"
                    >
                        {t('search.search')}
                    </Button>
                    <Button
                        size="large"
                        type="default"
                        onClick={() => navigate('/search')}
                        className="rounded-xl h-11 sm:h-12 min-h-[44px] flex items-center justify-center gap-2 touch-manipulation border-primary text-primary hover:!text-primary hover:!border-primary"
                        icon={<ThunderboltOutlined />}
                    >
                        {t('search.advancedSearch') || 'Tìm kiếm nâng cao'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
