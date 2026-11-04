'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowRight, AlertCircle, User, Mail, Lock } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validation
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register account.');
      }

      // Store display name in local storage for convenience
      localStorage.setItem('ipl_display_name', data.user.name);
      if (data.sessionToken) {
        localStorage.setItem('ipl_session_token', data.sessionToken);
      }

      // Automatically authenticated and redirected
      router.push(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-16">
      <div className="scoreboard-panel rounded-card border border-night-border p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow sheen */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-flare/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-flare/15 border border-flare/30 text-flare text-xs font-bold uppercase tracking-wider mb-2">
            Join the Auction Table
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-floodlight tracking-tight">
            CREATE ACCOUNT
          </h1>
          <p className="text-xs text-floodlight-muted mt-1">
            Register to host rooms and draft IPL players live
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-hammer/15 border border-hammer/30 text-hammer text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-floodlight-muted mb-1.5">
              Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-floodlight-subtle" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Virat K."
                required
                maxLength={50}
                className="w-full bg-night pl-10 pr-4 py-2.5 rounded-lg text-sm text-floodlight border border-night-border focus:border-flare focus:outline-none placeholder:text-floodlight-subtle"
              />
            </div>
          </div>

          {/* Field 2: Email */}
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

          {/* Field 3: Password */}
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
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full bg-night pl-10 pr-4 py-2.5 rounded-lg text-sm text-floodlight border border-night-border focus:border-flare focus:outline-none placeholder:text-floodlight-subtle"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-pill bg-flare hover:bg-flare-hover disabled:opacity-50 text-white font-bold text-sm shadow-flare flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span>{isLoading ? 'Creating Account...' : 'Register & Enter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-5 text-center text-xs text-floodlight-muted">
          Already have an account?{' '}
          <Link
            href={`/login${redirectTarget !== '/' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
            className="text-flare hover:underline font-bold"
          >
            Log In
          </Link>
        </div>

        {/* Legal notice */}
        <div className="mt-6 pt-4 border-t border-night-border text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-floodlight-muted font-semibold">
            <Shield className="w-3.5 h-3.5 text-turf" />
            <span>Virtual Currency · Secure Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-floodlight-muted">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
