import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { WaitlistWelcome } from '@/emails/WaitlistWelcome';

// Initialize Supabase client
// For updating other users (referrers) securely in an API route, you'll need the Service Role Key, 
// though the ANON key works for standard public inserts if RLS is set up.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const { email, ref } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // 1. Check if the email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('waitlist_users')
      .select('id, referral_code, base_position, adjusted_position')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already on the waitlist' }, { status: 409 });
    }

    // 2. Get total count to set base_position
    const { count, error: countError } = await supabase
      .from('waitlist_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error fetching count:', countError);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    const base_position = (count || 0) + 1;
    let referral_code = generateReferralCode();

    // Small retry loop to ensure referral code uniqueness
    let codeIsUnique = false;
    let attempts = 0;
    while (!codeIsUnique && attempts < 5) {
      const { data: codeCheck } = await supabase
        .from('waitlist_users')
        .select('id')
        .eq('referral_code', referral_code)
        .single();
      
      if (!codeCheck) {
        codeIsUnique = true;
      } else {
        referral_code = generateReferralCode();
        attempts++;
      }
    }

    // 3. Insert the new user
    const { data: newUser, error: insertError } = await supabase
      .from('waitlist_users')
      .insert({
        email,
        referral_code,
        referred_by: ref || null,
        base_position,
        adjusted_position: base_position,
        referral_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    // 4. Viral Mechanic & Position Unlocking: Update referrer if `ref` is provided
    if (ref && ref !== referral_code) {
      // Find the referring user
      const { data: referrer, error: referrerError } = await supabase
        .from('waitlist_users')
        .select('id, referral_count, base_position')
        .eq('referral_code', ref)
        .single();

      if (referrer) {
        const newReferralCount = referrer.referral_count + 1;
        
        // Position Unlocking Math:
        // Jump 50 spots per referral
        const standardJump = newReferralCount * 50;
        // Bonus jump of 200 spots for every 3 referrals
        const bonusJump = Math.floor(newReferralCount / 3) * 200;
        const totalJump = standardJump + bonusJump;
        
        // Calculate the new adjusted position (floor at 1)
        let newAdjustedPosition = referrer.base_position - totalJump;
        if (newAdjustedPosition < 1) {
          newAdjustedPosition = 1;
        }

        // Update the referrer's stats in the database
        await supabase
          .from('waitlist_users')
          .update({
            referral_count: newReferralCount,
            adjusted_position: newAdjustedPosition
          })
          .eq('id', referrer.id);
      }
    }

    // 5. Send Welcome Email via Resend
    try {
      await resend.emails.send({
        from: 'Waitlist <onboarding@resend.dev>', // Update this to your verified domain later
        to: email,
        subject: "You're on the list! 🎉",
        react: WaitlistWelcome({
          position: newUser.adjusted_position,
          referralCode: newUser.referral_code,
          appUrl: APP_URL,
        }) as React.ReactElement,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // We log the error but still return success for the waitlist signup
    }

    return NextResponse.json({ 
      success: true, 
      user: newUser 
    }, { status: 201 });

  } catch (err: any) {
    console.error('Waitlist API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
