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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[#D85A30]/20 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#D85A30]/20 text-[#F0997B] rounded-full mb-6 border border-[#D85A30]/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-[#FAECE7] mb-2 tracking-tight">You're on the list!</h2>
          <p className="text-[#FAECE7]/70 mb-8">Keep an eye on your inbox. We'll email you when it's your turn.</p>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-[#1A0E09]/60 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-[#D85A30]/5 group-hover:bg-[#D85A30]/10 transition-colors" />
               <span className="text-sm text-[#FAECE7]/70 font-medium mb-1">Your Position</span>
               <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D85A30] to-[#F0997B]">
                 #{user.adjusted_position}
               </span>
            </div>
            <div className="bg-[#1A0E09]/60 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-[#F0997B]/5 group-hover:bg-[#F0997B]/10 transition-colors" />
               <span className="text-sm text-[#FAECE7]/70 font-medium mb-1">Referrals</span>
               <span className="text-4xl font-black text-[#FAECE7]">
                 {user.referral_count}
               </span>
            </div>
          </div>

          <div className="w-full bg-[#1A0E09]/60 border border-white/5 rounded-xl p-5 mb-6 text-left">
            <h3 className="text-[#FAECE7] font-medium mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#D85A30]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Jump 50 spots per referral!
            </h3>
            <p className="text-[#FAECE7]/70 text-sm mb-4">
              Share your unique link below. For every friend who joins, you'll jump 50 spots. Refer 3 friends for a 200-spot bonus!
            </p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareLink}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-[#FAECE7] focus:outline-none font-mono"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-[#D85A30] hover:bg-[#c2512b] text-[#FAECE7] px-5 py-3 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[100px]"
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
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-[#FAECE7]/10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[#D85A30]/20 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-4xl font-bold text-[#FAECE7] mb-4 tracking-tight">Get Early Access.</h2>
        <p className="text-[#FAECE7]/70 mb-8 text-lg">
          Join the exclusive waitlist today. Spots are highly limited and filling up fast.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-[#FAECE7] placeholder-[#FAECE7]/40 focus:outline-none focus:ring-2 focus:ring-[#D85A30]/50 transition-all"
          />
          {error && <p className="text-[#F0997B] text-sm text-left px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D85A30] hover:bg-[#c2512b] disabled:opacity-50 disabled:hover:bg-[#D85A30] text-[#FAECE7] font-semibold rounded-xl px-5 py-4 transition-all hover:shadow-[0_0_20px_rgba(216,90,48,0.4)] active:scale-[0.98]"
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
    <main className="min-h-screen bg-[#1A0E09] font-sans flex items-center justify-center p-4 selection:bg-[#D85A30]/30 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(216,90,48,0.2),rgba(26,14,9,0))]">
      <Suspense fallback={<div className="text-[#FAECE7]/50 animate-pulse text-lg">Waking up engine...</div>}>
        <WaitlistApp />
      </Suspense>
    </main>
  );
}
