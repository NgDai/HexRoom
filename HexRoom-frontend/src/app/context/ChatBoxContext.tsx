import { useState, useCallback, type ReactNode } from 'react';
import { ChatBoxContext } from './chatbox-context';

export function ChatBoxProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [openWithUserId, setOpenWithUserId] = useState<string | null>(null);

    const openChat = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeChat = useCallback(() => {
        setIsOpen(false);
        setOpenWithUserId(null);
    }, []);

    const toggleChat = useCallback(() => {
        setIsOpen((prev) => !prev);
        if (isOpen) setOpenWithUserId(null);
    }, [isOpen]);

    const openChatWith = useCallback((userId: string | null) => {
        setOpenWithUserId(userId);
        setIsOpen(true);
    }, []);

    return (
        <ChatBoxContext.Provider
            value={{
                isOpen,
                openChat,
                closeChat,
                toggleChat,
                openChatWith,
                openWithUserId,
            }}
        >
            {children}
        </ChatBoxContext.Provider>
    );
}
