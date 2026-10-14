export type ChatBoxContextValue = {
    isOpen: boolean;
    openChat: () => void;
    closeChat: () => void;
    toggleChat: () => void;
    /** Open the chat box and optionally select conversation with this user (e.g. from roommate "Nhắn tin"). */
    openChatWith: (userId: string | null) => void;
    /** When set, floating box should select this conversation (cleared after selecting). */
    openWithUserId: string | null;
};