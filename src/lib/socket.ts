'use client';

import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/shared/types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getAuthSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ipl_session_token') || '';
}

export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (envUrl) return envUrl;
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

export function getSocket(token?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  const authToken = token || getAuthSessionToken();

  if (!socket) {
    const url = getSocketUrl();
    socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken,
      },
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to', url, 'ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
    });
  } else if (authToken && socket.auth && (socket.auth as any).token !== authToken) {
    // Update auth token if changed
    (socket.auth as any).token = authToken;
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
