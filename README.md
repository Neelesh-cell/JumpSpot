# 🚀 JumpSpot: Waitlist Engine with Viral Mechanics

A high-performance, modern Waitlist MVP featuring built-in viral referral mechanics, real-time position updates, and transactional emails. 

## ✨ Features
- **Viral Referral Loop:** Users jump 50 spots for every successful referral, with a 200-spot bonus for every 3 referrals.
- **Real-time Engine:** Waitlist positions update live on the dashboard without a page refresh using Supabase WebSockets.
- **Premium SaaS Aesthetic:** Beautiful dark-mode UI with glassmorphism and glowing effects built with Tailwind CSS.
- **Admin Dashboard:** Secure, password-protected admin panel to view the waitlist and high-level stats.
- **Automated Emails:** Transactional welcome emails via Resend with shareable referral links.

## 🛠 Tech Stack
- **Frontend & API:** [Next.js](https://nextjs.org/) (App Router, React Server Components)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Realtime Subscriptions)
- **Email:** [Resend](https://resend.com/) + React Email

## 🚀 Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/Neelesh-cell/JumpSpot.git
cd JumpSpot/waitlist-engine
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the `waitlist-engine` directory and add the following keys:
```env
# Supabase Keys (from your Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend Key
RESEND_API_KEY=your_resend_api_key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=your_admin_dashboard_password
```

### 4. Database Setup (Supabase)
Run the following SQL in your Supabase SQL Editor to create the tables and policies:
```sql
CREATE TABLE public.waitlist_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT REFERENCES public.waitlist_users(referral_code) ON DELETE SET NULL,
    base_position SERIAL NOT NULL,
    referral_count INTEGER NOT NULL DEFAULT 0,
    adjusted_position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts" ON public.waitlist_users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow admins to view" ON public.waitlist_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins to update" ON public.waitlist_users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow admins to delete" ON public.waitlist_users FOR DELETE TO authenticated USING (true);

-- Enable Realtime for the table!
alter publication supabase_realtime add table public.waitlist_users;
```

### 5. Run the Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to see the app!

## 🌍 Deploying to Vercel

1. Import your GitHub repository into Vercel.
2. **Important**: Set the **Root Directory** to `waitlist-engine`.
3. Add all the environment variables listed in step 3 to the Vercel dashboard. (Make sure `NEXT_PUBLIC_APP_URL` is set to your live Vercel domain).
4. Deploy! No custom build settings are required. 
