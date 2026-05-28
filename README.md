# JumpSpot
A self-hostable, real-time waitlist engine with viral referral mechanics. Built with Next.js, Supabase, and Resend.
An open-source, viral waitlist engine for early-stage startups.

JumpSpot is a self-hostable waitlist system designed to help founders build launch hype. It features a built-in viral referral loop—users refer friends to unlock higher positions in the queue—powered by real-time database subscriptions.

Think Lemon Squeezy's waitlist, but completely customizable and yours to control.

✨ Key Features

Real-Time Reactivity: Waitlist positions update live on the client via Supabase Realtime webhooks without requiring a page refresh.

Viral Position Unlocking: Automated logic that bumps users up the queue (e.g., jump 50 spots per referral) to incentivize sharing.

Transactional Emails: Instant confirmation and shareable link delivery powered by Resend and React Email.

Admin Dashboard: A protected route to monitor waitlist size, track referral conversions, and manage users.
