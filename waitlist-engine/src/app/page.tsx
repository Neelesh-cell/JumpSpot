"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client for the frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UserState {
  id: string;
  email: string;
  referral_code: string;
  adjusted_position: number;
  referral_count: number;
}

function WaitlistApp() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<UserState | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Load from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('waitlist_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. Real-time subscription to database changes!
  useEffect(() => {
    if (!user?.id) return;

    // Listen to UPDATE events on the waitlist_users table specifically for this user's row
    const channel = supabase
      .channel(`public:waitlist_users:id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waitlist_users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // If someone uses their link and the backend updates their row, 
          // this triggers immediately and updates the UI!
          const updatedData = payload.new as UserState;
          setUser((prev) => {
            if (!prev) return prev;
            const newState = { ...prev, ...updatedData };
            // Keep local storage in sync with live DB changes
            localStorage.setItem('waitlist_user', JSON.stringify(newState));
            return newState;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ref: refCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setUser(data.user);
      localStorage.setItem('waitlist_user', JSON.stringify(data.user));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shareLink = typeof window !== 'undefined' 
    ? `${window.location.origin}?ref=${user?.referral_code}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (user) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-500">
        {/* Glow effect behind */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/20 text-blue-400 rounded-full mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">You're on the list!</h2>
          <p className="text-slate-400 mb-8">Keep an eye on your inbox. We'll email you when it's your turn.</p>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-black/40 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
               <span className="text-sm text-slate-400 font-medium mb-1">Your Position</span>
               <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                 #{user.adjusted_position}
               </span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
               <span className="text-sm text-slate-400 font-medium mb-1">Referrals</span>
               <span className="text-4xl font-black text-white">
                 {user.referral_count}
               </span>
            </div>
          </div>

          <div className="w-full bg-black/40 border border-white/5 rounded-xl p-5 mb-6 text-left">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Jump 50 spots per referral!
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Share your unique link below. For every friend who joins, you'll jump 50 spots. Refer 3 friends for a 200-spot bonus!
            </p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareLink}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:outline-none font-mono"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[100px]"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  // State 1: Form
  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Get Early Access.</h2>
        <p className="text-slate-400 mb-8 text-lg">
          Join the exclusive waitlist today. Spots are highly limited and filling up fast.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          {error && <p className="text-red-400 text-sm text-left px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white font-semibold rounded-xl px-5 py-4 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-[0.98]"
          >
            {loading ? 'Joining...' : 'Join the Waitlist'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#030712] font-sans flex items-center justify-center p-4 selection:bg-blue-500/30 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <Suspense fallback={<div className="text-white/50 animate-pulse text-lg">Waking up engine...</div>}>
        <WaitlistApp />
      </Suspense>
    </main>
  );
}
