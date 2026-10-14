import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { transcribeSearchVoiceRequest } from '@/lib/api';

type SpeechRecognitionInstance = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
    onspeechend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
};

type SpeechRecognitionEvent = Event & {
    results: SpeechRecognitionResultList;
    resultIndex: number;
};

type SpeechRecognitionErrorEvent = Event & {
    error: string;
    message?: string;
};

type SpeechRecognitionResultList = ArrayLike<SpeechRecognitionResult>;
type SpeechRecognitionResult = ArrayLike<SpeechRecognitionAlternative> & { isFinal: boolean };
type SpeechRecognitionAlternative = { transcript: string; confidence: number };

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
    const w = window as unknown as Record<string, unknown>;
    return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

interface VoiceSearchButtonProps {
    /** Called with final transcript when speech ends. */
    onResult: (transcript: string) => void;
    /** Called with interim transcript while speaking. */
    onInterim?: (transcript: string) => void;
    disabled?: boolean;
    /** Language code. Default: 'vi-VN' */
    lang?: string;
    /** Button size variant */
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    /**
     * When provided, uses POST /search/transcribe (Whisper) with recorded audio — same backend as search API.
     * When omitted, uses the browser Web Speech API (guest-friendly).
     */
    getAccessToken?: () => Promise<string | null | undefined>;
}

export function VoiceSearchButton({
    onResult,
    onInterim,
    disabled = false,
    lang = 'vi-VN',
    size = 'md',
    className = '',
    getAccessToken,
}: VoiceSearchButtonProps) {
    const [state, setState] = useState<'idle' | 'listening' | 'processing'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [supported, setSupported] = useState(true);
    const [interimText, setInterimText] = useState('');
    const recRef = useRef<SpeechRecognitionInstance | null>(null);
    const listeningRef = useRef(false);
    const mediaRecRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const serverMimeRef = useRef<string>('audio/webm');

    const useServerPipeline = typeof getAccessToken === 'function';

    useEffect(() => {
        const browserOk = !!getSpeechRecognition();
        const serverOk = typeof MediaRecorder !== 'undefined';
        setSupported(useServerPipeline ? serverOk : browserOk);
    }, [useServerPipeline]);

    const stopBrowserListening = useCallback(() => {
        listeningRef.current = false;
        if (recRef.current) {
            recRef.current.stop();
            recRef.current = null;
        }
    }, []);

    const stopServerCapture = useCallback(() => {
        const mr = mediaRecRef.current;
        mediaRecRef.current = null;
        if (mr && mr.state !== 'inactive') {
            try {
                mr.stop();
            } catch {
                /* ignore */
            }
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    const startBrowserListening = useCallback(() => {
        setError(null);
        setInterimText('');

        const Rec = getSpeechRecognition();
        if (!Rec) {
            setError('Trình duyệt không hỗ trợ. Hãy dùng Chrome hoặc Edge.');
            return;
        }

        stopBrowserListening();

        const rec = new Rec();
        rec.lang = lang;
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        recRef.current = rec;
        listeningRef.current = true;

        rec.onresult = (e: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = e.resultIndex; i < e.results.length; i++) {
                const result = e.results[i];
                if (!result || !result[0]) continue;
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (interim) {
                setInterimText(interim);
                onInterim?.(interim);
            }

            if (final) {
                setInterimText('');
                setState('processing');
                onResult(final.trim());
                setTimeout(() => setState('idle'), 500);
            }
        };

        rec.onerror = (e: SpeechRecognitionErrorEvent) => {
            recRef.current = null;
            listeningRef.current = false;
            setState('idle');
            setInterimText('');

            switch (e.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    setError('Vui lòng cho phép quyền truy cập micro');
                    break;
                case 'no-speech':
                    setError('Không nhận được giọng nói. Thử lại?');
                    break;
                case 'network':
                    setError('Lỗi mạng. Kiểm tra kết nối internet');
                    break;
                case 'aborted':
                    break;
                default:
                    setError('Lỗi nhận diện giọng nói');
            }
        };

        rec.onend = () => {
            recRef.current = null;
            if (listeningRef.current) {
                setState('idle');
                setInterimText('');
                listeningRef.current = false;
            }
        };

        setState('listening');
        rec.start();
    }, [lang, onResult, onInterim, stopBrowserListening]);

    const startServerRecording = useCallback(async () => {
        setError(null);
        setInterimText('');
        const token = (await getAccessToken?.())?.trim();
        if (!token) {
            setError('Cần đăng nhập để dùng nhận diện qua server');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];
            const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                  ? 'audio/webm'
                  : '';
            const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
            serverMimeRef.current = mr.mimeType || 'audio/webm';
            mediaRecRef.current = mr;
            mr.ondataavailable = (ev) => {
                if (ev.data.size > 0) chunksRef.current.push(ev.data);
            };
            mr.start();
            setState('listening');
            setInterimText('Đang ghi… nhấn lại để gửi');
        } catch {
            setError('Không thể truy cập micro');
        }
    }, [getAccessToken]);

    const finishServerRecording = useCallback(async () => {
        const mr = mediaRecRef.current;
        if (!mr || mr.state === 'inactive') {
            stopServerCapture();
            setState('idle');
            setInterimText('');
            return;
        }

        await new Promise<void>((resolve) => {
            mr.addEventListener('stop', () => resolve(), { once: true });
            try {
                mr.stop();
            } catch {
                resolve();
            }
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecRef.current = null;
        setInterimText('');

        const token = (await getAccessToken?.())?.trim();
        const blob = new Blob(chunksRef.current, { type: serverMimeRef.current });
        chunksRef.current = [];

        if (!token) {
            setError('Phiên đăng nhập hết hạn');
            setState('idle');
            return;
        }

        if (blob.size < 64) {
            setError('Âm thanh quá ngắn');
            setState('idle');
            return;
        }

        setState('processing');
        try {
            const text = (await transcribeSearchVoiceRequest(blob, { token })).trim();
            if (text) {
                onResult(text);
            } else {
                setError('Không nhận được văn bản');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi chuyển giọng nói';
            setError(msg);
        } finally {
            setState('idle');
        }
    }, [getAccessToken, onResult, stopServerCapture]);

    const handleClick = useCallback(async () => {
        if (state === 'processing') return;

        if (useServerPipeline) {
            if (state === 'listening') {
                await finishServerRecording();
            } else {
                await startServerRecording();
            }
            return;
        }

        if (state === 'listening') {
            stopBrowserListening();
            setState('idle');
            setInterimText('');
        } else {
            startBrowserListening();
        }
    }, [
        state,
        useServerPipeline,
        startServerRecording,
        finishServerRecording,
        startBrowserListening,
        stopBrowserListening,
    ]);

    useEffect(() => {
        return () => {
            if (recRef.current) {
                recRef.current.abort();
                recRef.current = null;
            }
            stopServerCapture();
        };
    }, [stopServerCapture]);

    if (!supported) return null;

    const sizeClasses = {
        sm: 'w-9 h-9',
        md: 'w-11 h-11',
        lg: 'w-12 h-12',
    };

    const iconSize = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const isListening = state === 'listening';
    const isProcessing = state === 'processing';

    return (
        <div className="relative inline-flex flex-col items-center">
            <button
                type="button"
                onClick={() => void handleClick()}
                disabled={disabled || isProcessing}
                title={
                    useServerPipeline
                        ? isListening
                            ? 'Nhấn để gửi và nhận diện (Whisper)'
                            : 'Ghi âm — nhận diện qua server'
                        : isListening
                          ? 'Nhấn để dừng'
                          : 'Tìm kiếm bằng giọng nói'
                }
                className={`
                    ${sizeClasses[size]}
                    rounded-xl border flex items-center justify-center
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isListening
                        ? 'border-red-400 bg-red-50 text-red-500 shadow-lg shadow-red-100 dark:bg-red-950 dark:border-red-500 dark:shadow-red-900/30'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30'}
                    ${className}
                `}
            >
                {isProcessing ? (
                    <Loader2 className={`${iconSize[size]} animate-spin text-primary`} />
                ) : isListening ? (
                    <MicOff className={`${iconSize[size]} animate-pulse`} />
                ) : (
                    <Mic className={iconSize[size]} />
                )}
            </button>

            {isListening && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-bounce [animation-delay:300ms]" />
                </div>
            )}

            {(interimText || error) && (
                <div
                    className={`
                    absolute top-full mt-2 left-1/2 -translate-x-1/2
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    shadow-lg z-50 max-w-[280px] text-center
                    ${error
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-primary/10 text-primary border border-primary/20'}
                `}
                >
                    {error || `"${interimText}"`}
                </div>
            )}
        </div>
    );
}
