import { useState, useCallback, useRef } from 'react';

interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    loading: boolean;
    error: string | null;
    supported: boolean;
    permitted: boolean | null;
}

interface UseGeolocationReturn extends GeolocationState {
    requestLocation: () => void;
    clearLocation: () => void;
    hasLocation: boolean;
}

export function useGeolocation(): UseGeolocationReturn {
    const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    const watchIdRef = useRef<number | null>(null);

    const [state, setState] = useState<GeolocationState>({
        latitude: null,
        longitude: null,
        accuracy: null,
        loading: false,
        error: null,
        supported,
        permitted: null,
    });

    const requestLocation = useCallback(() => {
        if (!supported) {
            setState((prev) => ({ ...prev, error: 'Trình duyệt không hỗ trợ định vị', permitted: false }));
            return;
        }

        setState((prev) => ({ ...prev, loading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    loading: false,
                    error: null,
                    supported: true,
                    permitted: true,
                });
            },
            (err) => {
                let errorMessage: string;
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép trong cài đặt trình duyệt.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage = 'Không thể xác định vị trí của bạn.';
                        break;
                    case err.TIMEOUT:
                        errorMessage = 'Yêu cầu vị trí đã hết thời gian.';
                        break;
                    default:
                        errorMessage = 'Lỗi xác định vị trí.';
                }
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                    permitted: err.code === err.PERMISSION_DENIED ? false : prev.permitted,
                }));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5 * 60 * 1000, // cache for 5 minutes
            },
        );
    }, [supported]);

    const clearLocation = useCallback(() => {
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setState({
            latitude: null,
            longitude: null,
            accuracy: null,
            loading: false,
            error: null,
            supported,
            permitted: null,
        });
    }, [supported]);

    return {
        ...state,
        requestLocation,
        clearLocation,
        hasLocation: state.latitude != null && state.longitude != null,
    };
}
