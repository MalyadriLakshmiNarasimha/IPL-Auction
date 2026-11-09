'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowRight, AlertCircle, Mail, Lock, Shield } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiFetch<{ user: { id: string; name: string; email: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Invalid credentials.');
      }

      // Store display name in local storage for quick access
      if (res.data?.user?.name) {
        localStorage.setItem('ipl_display_name', res.data.user.name);
      }

      // Cross-origin cookie sync to Render backend with credentials: "include"
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://ipl-auction-jqsd.onrender.com';
      if (typeof window !== 'undefined' && socketUrl.startsWith('http') && !socketUrl.includes(window.location.host)) {
        try {
          await fetch(`${socketUrl.replace(/\/$/, '')}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
            }),
          });
        } catch (syncErr) {
          console.warn('[AUTH] Cross-origin cookie sync:', syncErr);
        }
      }

      window.location.href = redirectTarget;
    } catch (err: any) {
      setError(err.message || 'Failed to log in.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-16">
      <div className="scoreboard-panel rounded-card border border-night-border p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow sheen */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-flare/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-flare/15 border border-flare/30 text-flare text-xs font-bold uppercase tracking-wider mb-2">
            Welcome Back
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-floodlight tracking-tight">
            SIGN IN
          </h1>
          <p className="text-xs text-floodlight-muted mt-1">
            Access your fantasy rooms and live auction tables
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-hammer/15 border border-hammer/30 text-hammer text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-floodlight-subtle" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="virat@example.com"
                required
                className="w-full bg-night pl-10 pr-4 py-2.5 rounded-lg text-sm text-floodlight border border-night-border focus:border-flare focus:outline-none placeholder:text-floodlight-subtle"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-floodlight-subtle" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-night pl-10 pr-4 py-2.5 rounded-lg text-sm text-floodlight border border-night-border focus:border-flare focus:outline-none placeholder:text-floodlight-subtle"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-50 text-white font-bold text-sm shadow-flare flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span>{isLoading ? 'Signing In...' : 'Log In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to Registration */}
        <div className="mt-5 text-center text-xs text-floodlight-muted">
          Don&apos;t have an account yet?{' '}
          <Link
            href={`/register${redirectTarget !== '/' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
            className="text-flare hover:underline font-bold"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-night-border text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-floodlight-muted font-semibold">
            <Shield className="w-3.5 h-3.5 text-turf" />
            <span>Secure Authentication · MySQL Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-floodlight-muted">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
