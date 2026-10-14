import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/app/features/home/components';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import {
    getConversationsRequest,
    getThreadRequest,
    sendMessageRequest,
    getLandlordPeerForRentalPeriodRequest,
    type ConversationItem,
    type ChatMessage,
} from '@/lib/api';
import { useAuth } from '@/app/context/useAuth';
import { getChatSocket } from '@/lib/socket';
import {
    MessageCircle, ArrowLeft, Send, Loader2,
    Check, CheckCheck, Circle, ChevronUp,
} from 'lucide-react';

const AVATAR_PLACEHOLDER = '/avatar-facebook-mac-dinh.jpg';
const TYPING_CLEAR_MS = 3000;

function formatTime(iso: string) {
    try {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch { return ''; }
}

function StatusTick({ status, isFromMe }: { status: string; isFromMe: boolean }) {
    if (!isFromMe) return null;
    if (status === 'READ') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (status === 'DELIVERED') return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60" />;
    return <Check className="w-3.5 h-3.5 text-muted-foreground/50" />;
}

function TypingBubble({ avatarUrl }: { avatarUrl: string | null }) {
    return (
        <div className="flex gap-2 items-end max-w-[75%]">
            <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-muted">
                <ImageWithFallback src={avatarUrl || AVATAR_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-muted rounded-[18px_18px_18px_4px] px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
        </div>
    );
}

function Bubble({
    message,
    isFromMe,
    peerAvatar,
    showAvatar,
}: {
    message: ChatMessage;
    isFromMe: boolean;
    peerAvatar: string | null;
    showAvatar: boolean;
}) {
    return (
        <div className={`flex gap-2 w-full ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] sm:max-w-[75%] ${isFromMe ? 'ml-auto' : ''}`}>
            {!isFromMe && (
                <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-muted">
                    {showAvatar
                        ? <ImageWithFallback src={peerAvatar || AVATAR_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full" />
                    }
                </div>
            )}
            <div className={`flex flex-col min-w-0 ${isFromMe ? 'items-end' : 'items-start'}`}>
                <div className={`relative px-4 py-2.5 shadow-sm ${isFromMe
                    ? 'bg-primary text-primary-foreground rounded-[18px_18px_4px_18px]'
                    : 'bg-card text-foreground rounded-[18px_18px_18px_4px] border border-border'
                    }`}>
                    <p className="text-[15px] leading-snug whitespace-pre-wrap wrap-break-word">{message.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-0.5 px-1 ${isFromMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] text-muted-foreground">{formatTime(message.created_at)}</span>
                    <StatusTick status={message.status || 'SENT'} isFromMe={isFromMe} />
                </div>
            </div>
            {isFromMe && <div className="w-8 shrink-0" />}
        </div>
    );
}

export function ChatPage() {
    const { userId: paramUserId } = useParams<{ userId?: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingFromQuery = searchParams.get('booking');
    const { t } = useTranslation();
    const { accessToken } = useAuth();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [selectedPeerId, setSelectedPeerId] = useState<string | null>(paramUserId || null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [peer, setPeer] = useState<{ id: string; fullName: string; avatarUrl: string | null } | null>(null);
    const [input, setInput] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [peerTyping, setPeerTyping] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedPeerIdRef = useRef<string | null>(null);
    selectedPeerIdRef.current = selectedPeerId;

    // ── Socket setup ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!accessToken) return;
        const socket = getChatSocket(accessToken);

        socket.on('connect', () => setSocketConnected(true));
        socket.on('disconnect', () => setSocketConnected(false));

        socket.on('online_users', (ids: string[]) => setOnlineUsers(new Set(ids)));
        socket.on('presence', ({ userId, online }: { userId: string; online: boolean }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                if (online) {
                    next.add(userId);
                } else {
                    next.delete(userId);
                }
                return next;
            });
        });

        socket.on('new_message', (msg: ChatMessage) => {
            if (msg.senderId !== selectedPeerIdRef.current) {
                setConversations((prev) => {
                    const idx = prev.findIndex((c) => c.peer.id === msg.senderId);
                    if (idx === -1) {
                        loadConversationsRef.current();
                        return prev;
                    }
                    const updated = [...prev];
                    updated[idx] = {
                        ...updated[idx],
                        lastMessage: { id: msg.id, content: msg.content, created_at: msg.created_at, isFromMe: false },
                        unreadCount: updated[idx].unreadCount + 1,
                    };
                    return updated;
                });
            } else {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                setPeerTyping(false);
                setConversations((prev) => prev.map((c) =>
                    c.peer.id === msg.senderId
                        ? { ...c, lastMessage: { id: msg.id, content: msg.content, created_at: msg.created_at, isFromMe: false }, unreadCount: 0 }
                        : c
                ));
            }
        });

        socket.on('new_message_sent', (msg: ChatMessage) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        socket.on('messages_read', ({ byUserId }: { byUserId: string }) => {
            if (byUserId === selectedPeerIdRef.current) {
                setMessages((prev) => prev.map((m) =>
                    m.isFromMe && m.status !== 'READ' ? { ...m, status: 'READ' } : m
                ));
            }
        });

        socket.on('typing', ({ fromUserId }: { fromUserId: string }) => {
            if (fromUserId !== selectedPeerIdRef.current) return;
            setPeerTyping(true);
            if (typingClearRef.current) clearTimeout(typingClearRef.current);
            typingClearRef.current = setTimeout(() => setPeerTyping(false), TYPING_CLEAR_MS);
        });
        socket.on('stop_typing', ({ fromUserId }: { fromUserId: string }) => {
            if (fromUserId === selectedPeerIdRef.current) setPeerTyping(false);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('online_users');
            socket.off('presence');
            socket.off('new_message');
            socket.off('new_message_sent');
            socket.off('messages_read');
            socket.off('typing');
            socket.off('stop_typing');
        };
    }, [accessToken]);

    // ── Data loading ─────────────────────────────────────────────────────────
    const loadConversations = useCallback(() => {
        setLoadingConvs(true);
        getConversationsRequest()
            .then((r) => setConversations(r.data || []))
            .catch(() => setConversations([]))
            .finally(() => setLoadingConvs(false));
    }, []);
    const loadConversationsRef = useRef(loadConversations);
    loadConversationsRef.current = loadConversations;

    const loadThread = useCallback((peerId: string) => {
        setLoadingThread(true);
        setError(null);
        setHasMore(false);
        getThreadRequest(peerId, { limit: 50 })
            .then((r) => {
                setMessages(r.data.messages || []);
                setPeer(r.data.peer);
                setHasMore(r.data.hasMore || false);
            })
            .catch((e) => {
                setError(e instanceof Error ? e.message : t('chat.loadError'));
                setMessages([]);
                setPeer(null);
            })
            .finally(() => setLoadingThread(false));
    }, [t]);

    const loadMoreMessages = useCallback(() => {
        if (!selectedPeerId || loadingMore || !hasMore || messages.length === 0) return;
        const oldest = messages[0];
        setLoadingMore(true);
        getThreadRequest(selectedPeerId, { limit: 50, before: oldest.created_at })
            .then((r) => {
                setMessages((prev) => [...(r.data.messages || []), ...prev]);
                setHasMore(r.data.hasMore || false);
            })
            .finally(() => setLoadingMore(false));
    }, [selectedPeerId, loadingMore, hasMore, messages]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    /** Deep link /chat?booking=<rentalPeriodId> → open thread with landlord */
    useEffect(() => {
        if (!bookingFromQuery || paramUserId) return;
        let cancelled = false;
        getLandlordPeerForRentalPeriodRequest(bookingFromQuery)
            .then((r) => {
                if (cancelled || !r.data?.landlordId) return;
                navigate(`/chat/${r.data.landlordId}`, { replace: true });
            })
            .catch(() => { /* stay on /chat; user can pick conversation */ });
        return () => { cancelled = true; };
    }, [bookingFromQuery, paramUserId, navigate]);

    useEffect(() => {
        if (paramUserId) setSelectedPeerId(paramUserId);
    }, [paramUserId]);

    useEffect(() => {
        if (selectedPeerId) {
            loadThread(selectedPeerId);
            setPeerTyping(false);
            setConversations((prev) => prev.map((c) =>
                c.peer.id === selectedPeerId ? { ...c, unreadCount: 0 } : c
            ));
            if (!paramUserId || paramUserId !== selectedPeerId) {
                navigate(`/chat/${selectedPeerId}`, { replace: true });
            }
        } else {
            setMessages([]);
            setPeer(null);
            if (paramUserId) navigate('/chat', { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeerId]);

    useEffect(() => {
        if (!loadingThread) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, loadingThread]);

    // Typing emit
    const handleInputChange = useCallback((val: string) => {
        setInput(val);
        if (!selectedPeerId || !accessToken) return;
        const socket = getChatSocket(accessToken);
        socket.emit('typing', { toUserId: selectedPeerId });
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            socket.emit('stop_typing', { toUserId: selectedPeerId });
        }, 1500);
    }, [selectedPeerId, accessToken]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || !selectedPeerId || sending) return;
        setSending(true);
        setInput('');
        if (accessToken) {
            const socket = getChatSocket(accessToken);
            socket.emit('stop_typing', { toUserId: selectedPeerId });
        }
        try {
            const res = await sendMessageRequest(selectedPeerId, text);
            setMessages((prev) => {
                if (prev.some((m) => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.peer.id === selectedPeerId);
                const entry = { id: res.data.id, content: res.data.content, created_at: res.data.created_at, isFromMe: true };
                if (idx === -1) { loadConversations(); return prev; }
                const updated = [...prev];
                updated[idx] = { ...updated[idx], lastMessage: entry };
                return updated;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : t('chat.sendFailed'));
        } finally {
            setSending(false);
        }
    };

    const showAvatarFor = (index: number) => {
        if (index < 0 || index >= messages.length) return false;
        const m = messages[index];
        if (m.isFromMe) return false;
        const next = messages[index + 1];
        return !next || next.isFromMe || next.senderId !== m.senderId;
    };

    const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full md:h-[calc(100vh-4rem)] md:my-4 md:rounded-2xl md:overflow-hidden md:shadow-xl md:border md:border-border">
                {/* Sidebar */}
                <aside className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border bg-card shrink-0 flex flex-col">
                    <div className="p-3 border-b border-border">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-primary" />
                                {t('chat.title')}
                                {totalUnread > 0 && (
                                    <span className="ml-1 min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center px-1.5">
                                        {totalUnread > 99 ? '99+' : totalUnread}
                                    </span>
                                )}
                            </h2>
                            <span className={`flex items-center gap-1 text-xs ${socketConnected ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                <Circle className={`w-2 h-2 ${socketConnected ? 'fill-emerald-500' : 'fill-muted-foreground'}`} />
                                {socketConnected ? t('chat.online') : t('chat.connecting')}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {loadingConvs ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground text-sm">
                                {t('chat.noConversations')}
                            </div>
                        ) : (
                            <ul className="py-1">
                                {conversations.map((c) => {
                                    const isActive = selectedPeerId === c.peer.id;
                                    const online = onlineUsers.has(c.peer.id);
                                    return (
                                        <li key={c.peer.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPeerId(c.peer.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/80 transition-colors ${isActive ? 'bg-primary/10' : ''}`}
                                            >
                                                <div className="relative shrink-0">
                                                    <ImageWithFallback
                                                        src={c.peer.avatarUrl || AVATAR_PLACEHOLDER}
                                                        alt={c.peer.fullName}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                    {online && (
                                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                                                    )}
                                                    {c.unreadCount > 0 && (
                                                        <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium px-1">
                                                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`truncate text-[15px] ${c.unreadCount > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                                            {c.peer.fullName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground shrink-0">
                                                            {formatTime(c.lastMessage.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm truncate mt-0.5 ${c.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                        {c.lastMessage.isFromMe ? t('chat.youPrefix') : ''}{c.lastMessage.content}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Thread */}
                <main className="flex-1 flex flex-col min-h-0 bg-muted/30">
                    {!selectedPeerId ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center text-muted-foreground">
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="w-10 h-10 text-muted-foreground/60" />
                                </div>
                                <p className="text-[15px]">{t('chat.selectConversation')}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <header className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border shrink-0 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPeerId(null)}
                                    className="md:hidden p-2 -ml-1 rounded-full hover:bg-muted"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                {peer && (
                                    <>
                                        <div className="relative shrink-0">
                                            <ImageWithFallback
                                                src={peer.avatarUrl || AVATAR_PLACEHOLDER}
                                                alt={peer.fullName}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            {onlineUsers.has(peer.id) && (
                                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground truncate text-[16px] leading-tight">{peer.fullName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {onlineUsers.has(peer.id) ? (
                                                    <span className="text-emerald-500">{t('chat.active')}</span>
                                                ) : t('chat.inactive')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </header>

                            {error && (
                                <div className="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Message list */}
                            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                                {/* Load more */}
                                {hasMore && (
                                    <div className="flex justify-center mb-3">
                                        <button
                                            type="button"
                                            onClick={loadMoreMessages}
                                            disabled={loadingMore}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                                        >
                                            {loadingMore
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <ChevronUp className="w-3.5 h-3.5" />}
                                            {t('chat.loadOlderMessages')}
                                        </button>
                                    </div>
                                )}

                                {loadingThread ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    messages.map((m, i) => {
                                        const prev = messages[i - 1];
                                        const isNewGroup = !prev || prev.isFromMe !== m.isFromMe;
                                        return (
                                            <div key={m.id} className={`flex flex-col gap-0.5 ${i === 0 ? '' : isNewGroup ? 'mt-3' : 'mt-0.5'}`}>
                                                <Bubble
                                                    message={m}
                                                    isFromMe={m.isFromMe}
                                                    peerAvatar={peer?.avatarUrl || null}
                                                    showAvatar={showAvatarFor(i)}
                                                />
                                            </div>
                                        );
                                    })
                                )}

                                {peerTyping && peer && (
                                    <div className="mt-2">
                                        <TypingBubble avatarUrl={peer.avatarUrl} />
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} className="p-3 bg-card border-t border-border shrink-0">
                                <div className="flex items-end gap-2 rounded-2xl bg-muted pl-4 pr-1 py-1.5">
                                    <textarea
                                        value={input}
                                        onChange={(e) => handleInputChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e as unknown as React.FormEvent);
                                            }
                                        }}
                                        placeholder={t('chat.inputPlaceholder')}
                                        className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground text-[15px] py-2 focus:outline-none resize-none max-h-32 overflow-y-auto"
                                        rows={1}
                                        maxLength={5000}
                                        disabled={sending}
                                        style={{ height: 'auto' }}
                                        onInput={(e) => {
                                            const t = e.currentTarget;
                                            t.style.height = 'auto';
                                            t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !input.trim()}
                                        className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all"
                                    >
                                        {sending
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : <Send className="w-5 h-5" />
                                        }
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 text-right pr-1">
                                    {input.length > 0 ? `${input.length}/5000` : ''}
                                </p>
                            </form>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
