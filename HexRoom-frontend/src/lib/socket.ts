import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@/lib/api-config';

let socket: Socket | null = null;

export function getChatSocket(token: string): Socket {
    if (socket && socket.connected && (socket as Socket & { _token?: string })._token === token) {
        return socket;
    }
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    socket = io(getApiBaseUrl(), {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
    });
    (socket as Socket & { _token?: string })._token = token;
    return socket;
}

export function disconnectChatSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getCachedSocket(): Socket | null {
    return socket;
}
