import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase with service role for authentication bypass
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Generate a 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Check if user exists
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

        if (userError) {
            console.error('Error checking user:', userError);
            return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
        }

        const userExists = userData.users.some((user) => user.email === email);

        if (!userExists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Store OTP in database
        const { error: insertError } = await supabaseAdmin.from('otp_verifications').insert({
            email,
            otp_code: otpCode,
            expires_at: expiresAt.toISOString(),
        });

        if (insertError) {
            console.error('Error storing OTP:', insertError);
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
        }

        // Send OTP via email using Resend
        try {
            await resend.emails.send({
                from: 'Car Dashboard <noreply@autoshoket.co.il>', // verified domain
                to: email,
                subject: 'Your Login Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4361ee;">Login Verification Code</h2>
                        <p>Your verification code is:</p>
                        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                            ${otpCode}
                        </div>
                        <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
                        <p style="color: #6b7280;">If you didn't request this code, please ignore this email.</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'OTP sent successfully',
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Error in send-otp:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
