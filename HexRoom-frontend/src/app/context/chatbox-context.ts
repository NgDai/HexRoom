import { createContext } from 'react';
import type { ChatBoxContextValue } from './chatbox.types';

export const ChatBoxContext = createContext<ChatBoxContextValue | null>(null);
