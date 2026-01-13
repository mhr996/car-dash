import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for session management
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
    try {
        const { email, otpCode } = await request.json();

        if (!email || !otpCode) {
            return NextResponse.json({ error: 'Email and OTP code are required' }, { status: 400 });
        }

        // Validate OTP format (6 digits)
        if (!/^\d{6}$/.test(otpCode)) {
            return NextResponse.json({ error: 'Invalid OTP format' }, { status: 400 });
        }

        // Get the most recent non-verified OTP for this email
        const { data: otpData, error: fetchError } = await supabaseAdmin
            .from('otp_verifications')
            .select('*')
            .eq('email', email)
            .eq('verified', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpData) {
            return NextResponse.json({ error: 'No valid OTP found. Please request a new one.' }, { status: 404 });
        }

        // Check if OTP has expired
        const expiresAt = new Date(otpData.expires_at);
        if (expiresAt < new Date()) {
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        // Check if max attempts exceeded
        if (otpData.attempts >= MAX_ATTEMPTS) {
            return NextResponse.json({ error: 'Maximum verification attempts exceeded. Please request a new OTP.' }, { status: 400 });
        }

        // Increment attempts
        const { error: updateAttemptsError } = await supabaseAdmin
            .from('otp_verifications')
            .update({ attempts: otpData.attempts + 1 })
            .eq('id', otpData.id);

        if (updateAttemptsError) {
            console.error('Error updating attempts:', updateAttemptsError);
        }

        // Verify OTP code
        if (otpData.otp_code !== otpCode) {
            const remainingAttempts = MAX_ATTEMPTS - (otpData.attempts + 1);
            return NextResponse.json(
                {
                    error: `Invalid OTP code. ${remainingAttempts} attempts remaining.`,
                    remainingAttempts,
                },
                { status: 400 },
            );
        }

        // Mark OTP as verified
        const { error: verifyError } = await supabaseAdmin.from('otp_verifications').update({ verified: true }).eq('id', otpData.id);

        if (verifyError) {
            console.error('Error marking OTP as verified:', verifyError);
        }

        // Get user data
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
        }

        const user = userData.users.find((u) => u.email === email);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Create a magic link and token hash for the user using service role
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
        });

        if (sessionError) {
            console.error('Error creating session:', sessionError);
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        // Return success with session info including token hash for client-side verification
        return NextResponse.json({
            message: 'OTP verified successfully',
            verified: true,
            email: email,
            signInLink: sessionData.properties.action_link,
            tokenHash: sessionData.properties.hashed_token,
        });
    } catch (error) {
        console.error('Error in verify-otp:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
