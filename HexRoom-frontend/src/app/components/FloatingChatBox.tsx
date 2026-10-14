import { useState, useEffect, useRef, useCallback } from 'react'; // 
import { useChatBox } from '@/app/context/useChatBox';
import { useAuth } from '@/app/context/useAuth';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import {
    getConversationsRequest,
    getThreadRequest,
    sendMessageRequest,
    type ConversationItem,
    type ChatMessage,
} from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import { MessageCircle, ArrowLeft, Send, Loader2, Minus, X, Check, CheckCheck, ChevronUp } from 'lucide-react';

const AVATAR_PLACEHOLDER = '/avatar-facebook-mac-dinh.jpg';
const TYPING_CLEAR_MS = 3000;

function formatTime(iso: string) {
    try {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch { return ''; }
}

function StatusTick({ status, isFromMe }: { status: string; isFromMe: boolean }) {
    if (!isFromMe) return null;
    if (status === 'READ') return <CheckCheck className="w-3 h-3 text-blue-400 shrink-0" />;
    if (status === 'DELIVERED') return <CheckCheck className="w-3 h-3 text-muted-foreground/50 shrink-0" />;
    return <Check className="w-3 h-3 text-muted-foreground/40 shrink-0" />;
}

function TypingBubble({ avatarUrl }: { avatarUrl: string | null }) {
    return (
        <div className="flex gap-1.5 items-end">
            <div className="shrink-0 w-6 h-6 rounded-full overflow-hidden bg-muted">
                <ImageWithFallback src={avatarUrl || AVATAR_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-muted rounded-[12px_12px_12px_2px] px-3 py-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
        </div>
    );
}

function Bubble({ message, isFromMe, peerAvatar, showAvatar }: {
    message: ChatMessage; isFromMe: boolean; peerAvatar: string | null; showAvatar: boolean;
}) {
    return (
        <div className={`flex gap-1.5 w-full ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[90%] ${isFromMe ? 'ml-auto' : ''}`}>
            {!isFromMe && (
                <div className="shrink-0 w-6 h-6 rounded-full overflow-hidden bg-muted">
                    {showAvatar
                        ? <ImageWithFallback src={peerAvatar || AVATAR_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full" />
                    }
                </div>
            )}
            <div className={`flex flex-col min-w-0 ${isFromMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-1.5 text-sm ${isFromMe
                    ? 'bg-primary text-primary-foreground rounded-[12px_12px_2px_12px]'
                    : 'bg-card text-foreground rounded-[12px_12px_12px_2px] border border-border'
                    }`}>
                    <p className="whitespace-pre-wrap break-words leading-snug">{message.content}</p>
                </div>
                <div className={`flex items-center gap-0.5 mt-0.5 ${isFromMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</span>
                    <StatusTick status={message.status || 'SENT'} isFromMe={isFromMe} />
                </div>
            </div>
            {isFromMe && <div className="w-6 shrink-0" />}
        </div>
    );
}

export function FloatingChatBox() {
    const { user } = useAuth();
    const chatBox = useChatBox();
    const { accessToken } = useAuth();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [peer, setPeer] = useState<{ id: string; fullName: string; avatarUrl: string | null } | null>(null);
    const [input, setInput] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(false);
    const [loadingThread, setLoadingThread] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sending, setSending] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [peerTyping, setPeerTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedPeerIdRef = useRef<string | null>(null);
    selectedPeerIdRef.current = selectedPeerId;

    const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

    // ── Socket ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!accessToken || !user) return;
        const socket = getChatSocket(accessToken);

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
                    if (idx === -1) { loadConversationsRef.current(); return prev; }
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
            socket.off('online_users');
            socket.off('presence');
            socket.off('new_message');
            socket.off('new_message_sent');
            socket.off('messages_read');
            socket.off('typing');
            socket.off('stop_typing');
        };
    }, [accessToken, user]);

    // ── Data ────────────────────────────────────────────────────────────────
    const loadConversations = useCallback(() => {
        setLoadingConvs(true);
        getConversationsRequest()
            .then((r) => setConversations(r.data || []))
            .catch(() => setConversations([]))
            .finally(() => setLoadingConvs(false));
    }, []);
    const loadConversationsRef = useRef(loadConversations);

    // eslint-disable-next-line react-hooks/immutability
    loadConversationsRef.current = loadConversations;

    const loadThread = useCallback((peerId: string) => {
        if (peerId === user?.id) return;
        setLoadingThread(true);
        setHasMore(false);
        getThreadRequest(peerId, { limit: 50 })
            .then((r) => {
                setMessages(r.data.messages || []);
                setPeer(r.data.peer);
                setHasMore(r.data.hasMore || false);
            })
            .catch(() => { setMessages([]); setPeer(null); })
            .finally(() => setLoadingThread(false));
    }, [user?.id]);

    const loadMoreMessages = useCallback(() => {
        if (!selectedPeerId || loadingMore || !hasMore || messages.length === 0) return;
        setLoadingMore(true);
        getThreadRequest(selectedPeerId, { limit: 50, before: messages[0].created_at })
            .then((r) => {
                setMessages((prev) => [...(r.data.messages || []), ...prev]);
                setHasMore(r.data.hasMore || false);
            })
            .finally(() => setLoadingMore(false));
    }, [selectedPeerId, loadingMore, hasMore, messages]);

    useEffect(() => {
        if (!chatBox?.isOpen || !user) return;
        loadConversations();
    }, [chatBox?.isOpen, user, loadConversations]);

    useEffect(() => {
        if (chatBox?.openWithUserId && chatBox.isOpen && user) {
            if (chatBox.openWithUserId === user.id) {
                chatBox.openChatWith(null);
                return;
            }
            setSelectedPeerId(chatBox.openWithUserId);
            chatBox.openChatWith(null);
        }
    }, [chatBox?.openWithUserId, chatBox?.isOpen, user]);

    useEffect(() => {
        if (selectedPeerId) {
            loadThread(selectedPeerId);
            setPeerTyping(false);
            setConversations((prev) => prev.map((c) =>
                c.peer.id === selectedPeerId ? { ...c, unreadCount: 0 } : c
            ));
        } else {
            setMessages([]);
            setPeer(null);
        }
    }, [selectedPeerId, loadThread]);

    useEffect(() => {
        if (!loadingThread) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, loadingThread]);

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

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || !selectedPeerId || sending) return;
        setSending(true);
        setInput('');
        if (accessToken) getChatSocket(accessToken).emit('stop_typing', { toUserId: selectedPeerId });
        sendMessageRequest(selectedPeerId, text)
            .then((res) => {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
                const entry = { id: res.data.id, content: res.data.content, created_at: res.data.created_at, isFromMe: true };
                setConversations((prev) => {
                    const idx = prev.findIndex((c) => c.peer.id === selectedPeerId);
                    if (idx === -1) { loadConversations(); return prev; }
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], lastMessage: entry };
                    return updated;
                });
            })
            .finally(() => setSending(false));
    };

    const showAvatarFor = (index: number) => {
        if (index < 0 || index >= messages.length) return false;
        const m = messages[index];
        if (m.isFromMe) return false;
        const next = messages[index + 1];
        return !next || next.isFromMe || next.senderId !== m.senderId;
    };

    // eslint-disable-next-line react-hooks/immutability
    loadConversationsRef.current = loadConversations;

    if (!user || user?.role === 'ADMIN' || !chatBox) return null;

    return (
        <>
            {/* Floating button */}
            {!chatBox.isOpen && (
                <button
                    type="button"
                    onClick={chatBox.openChat}
                    className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    title="Tin nhắn"
                >
                    <MessageCircle className="w-7 h-7" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1 font-semibold">
                            {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                    )}
                </button>
            )}

            {/* Chat panel */}
            {chatBox.isOpen && (
                <div className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[560px] sm:w-[400px] sm:h-[600px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0">
                        <h3 className="font-semibold text-foreground flex items-center gap-2 text-[15px]">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            Tin nhắn
                            {totalUnread > 0 && (
                                <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center px-1">
                                    {totalUnread > 9 ? '9+' : totalUnread}
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={chatBox.closeChat} className="p-2 rounded-full hover:bg-muted text-muted-foreground" title="Thu nhỏ">
                                <Minus className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={chatBox.closeChat} className="p-2 rounded-full hover:bg-muted text-muted-foreground" title="Đóng">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex min-h-0">
                        {!selectedPeerId ? (
                            /* Conversation list */
                            <div className="flex-1 overflow-y-auto bg-muted/20">
                                {loadingConvs ? (
                                    <div className="p-6 flex justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <p className="p-4 text-center text-muted-foreground text-sm">Chưa có hội thoại.</p>
                                ) : (
                                    <ul className="py-1">
                                        {conversations.map((c) => {
                                            const online = onlineUsers.has(c.peer.id);
                                            return (
                                                <li key={c.peer.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPeerId(c.peer.id)}
                                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/80 transition-colors"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <ImageWithFallback
                                                                src={c.peer.avatarUrl || AVATAR_PLACEHOLDER}
                                                                alt=""
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                            {online && (
                                                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                                                            )}
                                                            {c.unreadCount > 0 && (
                                                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center px-0.5">
                                                                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className={`truncate text-sm ${c.unreadCount > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                                                    {c.peer.fullName}
                                                                </p>
                                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                                    {formatTime(c.lastMessage.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                                {c.lastMessage.isFromMe ? 'Bạn: ' : ''}{c.lastMessage.content}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col flex-1 min-w-0">
                                {/* Thread header */}
                                <header className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
                                    <button type="button" onClick={() => setSelectedPeerId(null)} className="p-1.5 rounded-full hover:bg-muted">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    {peer && (
                                        <>
                                            <div className="relative shrink-0">
                                                <ImageWithFallback src={peer.avatarUrl || AVATAR_PLACEHOLDER} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                {onlineUsers.has(peer.id) && (
                                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground truncate text-sm leading-tight">{peer.fullName}</p>
                                                {onlineUsers.has(peer.id) && (
                                                    <p className="text-[10px] text-emerald-500">● Đang hoạt động</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </header>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-2 py-2 bg-muted/20 space-y-0.5">
                                    {hasMore && (
                                        <div className="flex justify-center mb-2">
                                            <button
                                                type="button"
                                                onClick={loadMoreMessages}
                                                disabled={loadingMore}
                                                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-[11px] text-muted-foreground hover:bg-muted/80"
                                            >
                                                {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronUp className="w-3 h-3" />}
                                                Tin nhắn cũ hơn
                                            </button>
                                        </div>
                                    )}
                                    {loadingThread ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : (
                                        messages.map((m, i) => (
                                            <div key={m.id} className={i > 0 ? 'mt-0.5' : ''}>
                                                <Bubble
                                                    message={m}
                                                    isFromMe={m.isFromMe}
                                                    peerAvatar={peer?.avatarUrl || null}
                                                    showAvatar={showAvatarFor(i)}
                                                />
                                            </div>
                                        ))
                                    )}
                                    {peerTyping && peer && (
                                        <div className="mt-1">
                                            <TypingBubble avatarUrl={peer.avatarUrl} />
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <form onSubmit={handleSend} className="p-2 border-t border-border bg-card shrink-0">
                                    <div className="flex items-center gap-1.5 rounded-xl bg-muted pl-3 pr-1 py-1">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => handleInputChange(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend(e as unknown as React.FormEvent);
                                                }
                                            }}
                                            placeholder="Nhập tin nhắn..."
                                            className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-1.5 focus:outline-none"
                                            maxLength={5000}
                                            disabled={sending}
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !input.trim()}
                                            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 shrink-0"
                                        >
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
