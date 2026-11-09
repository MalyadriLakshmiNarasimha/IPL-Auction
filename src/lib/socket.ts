'use client';

import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/shared/types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (envUrl) return envUrl.replace(/\/$/, '');

    // In production (Netlify or remote deployment), default to authoritative Render backend
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocalhost) {
      return 'https://ipl-auction-jgsd.onrender.com';
    }
    return 'http://localhost:3001';
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || 'http://localhost:3001';
}

export function getSocket(token?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  const authToken = token || '';

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
      auth: authToken ? { token: authToken } : {},
      withCredentials: true, // Sends HTTP-only session cookie automatically
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to', url, 'ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
    });
  } else if (authToken && socket.auth && (socket.auth as any).token !== authToken) {
    // Update auth token if provided and re-authenticate
    (socket.auth as any).token = authToken;
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

