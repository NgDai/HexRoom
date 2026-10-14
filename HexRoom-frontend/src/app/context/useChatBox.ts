import { useContext } from 'react';
import { ChatBoxContext } from './chatbox-context';

export function useChatBox() {
    const ctx = useContext(ChatBoxContext);
    if (!ctx) return null;
    return ctx;
}
