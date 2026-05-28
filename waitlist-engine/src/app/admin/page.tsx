import { createClient } from '@supabase/supabase-js';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string }>;
}) {
  const params = await searchParams;
  // Use environment variable, fallback to 'admin123' for easy MVP testing if not set
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; 

  // Basic MVP password check
  if (params.pw !== adminPassword) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-red-500/20 text-red-500 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Access</h2>
          <form action="/admin" method="GET" className="flex flex-col gap-4">
            <input
              type="password"
              name="pw"
              placeholder="Enter Admin Password"
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-4 transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authorized! Fetch data securely server-side using the Service Role Key
  // This bypasses the RLS policy that prevents public reading of the table.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseKey) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 text-red-400">
        Error: SUPABASE_SERVICE_ROLE_KEY is missing in your environment variables.
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all users, sorted by the adjusted position (who is closest to the front!)
  const { data: users, error } = await supabase
    .from('waitlist_users')
    .select('*')
    .order('adjusted_position', { ascending: true });

  if (error) {
    return <div className="text-red-400 p-8">Error fetching data: {error.message}</div>;
  }

  // Calculate high-level stats
  const totalUsers = users?.length || 0;
  const totalReferrals = users?.reduce((sum, user) => sum + (user.referral_count || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-bold text-white">Waitlist Engine</h1>
            <p className="text-sm text-slate-500">Admin Command Center</p>
          </div>
          <a 
            href="/admin" 
            className="text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg transition"
          >
            Lock Dashboard
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
            <span className="text-sm font-medium text-slate-400 mb-2 relative z-10">Total Waitlist Size</span>
            <span className="text-6xl font-black text-white relative z-10">{totalUsers}</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
            <span className="text-sm font-medium text-slate-400 mb-2 relative z-10">Total Referrals Generated</span>
            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 relative z-10">
              {totalReferrals}
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 text-xs uppercase tracking-widest text-slate-500 border-b border-white/10">
                  <th className="p-5 font-semibold">Rank (Adj)</th>
                  <th className="p-5 font-semibold">Base Pos</th>
                  <th className="p-5 font-semibold">Email</th>
                  <th className="p-5 font-semibold">Referrals</th>
                  <th className="p-5 font-semibold">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-5">
                      <span className="inline-flex items-center justify-center bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold px-3 py-1 rounded-lg">
                        #{user.adjusted_position}
                      </span>
                    </td>
                    <td className="p-5 text-slate-500 font-mono text-sm">#{user.base_position}</td>
                    <td className="p-5 text-white font-medium">{user.email}</td>
                    <td className="p-5">
                      {user.referral_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-purple-400 font-bold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
                          {user.referral_count}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="p-5 text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()} <span className="text-slate-600">{new Date(user.created_at).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                ))}
                {users?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      No users on the waitlist yet. Share your link!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
