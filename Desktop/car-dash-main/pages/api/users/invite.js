import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the user's token with regular supabase client (not admin)
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error('Auth error:', authError);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user data from request body
        const { email, userData, profileData } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Generate a random password (the user will reset this)
        const temporaryPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2) + Math.random().toString(10).slice(-2);

        // Create a new user with admin API
        const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: userData || {},
        });

        if (createError) {
            console.error('Error creating user:', createError);
            return res.status(400).json({ error: createError.message });
        }

        const userId = newUserData.user?.id;
        if (!userId) {
            return res.status(500).json({ error: 'Failed to get user ID after creation' });
        }

        // Get the base URL from the request
        const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        // Send password reset email using standard method for consistent behavior
        // This will work with the default Supabase email templates
        const { data: passwordResetData, error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: `${baseUrl}/update-password` });

        if (resetError) {
            console.error('Error sending password reset email:', resetError);
            // Don't return an error, just log it and proceed
        }

        // Check if profile exists already
        const { data: existingProfile } = await supabaseAdmin.from('users').select('*').eq('id', userId).single(); // Prepare profile data with all fields matching the users table structure
        const profilePayload = {
            id: userId,
            email: email,
            full_name: profileData.full_name || '',
            country: profileData.country || null,
            address: profileData.address || null,
            phone: profileData.phone || null,
            status: profileData.status || 'Active',
            avatar_url: null,
        };

        let profileOperation;
        // If profile already exists, update it - otherwise insert new one
        if (existingProfile) {
            profileOperation = await supabaseAdmin.from('users').update(profilePayload).eq('id', userId);
        } else {
            profileOperation = await supabaseAdmin.from('users').insert([profilePayload]);
        }

        if (profileOperation.error) {
            console.error('Error with profile:', profileOperation.error);
            return res.status(400).json({ error: profileOperation.error.message });
        }

        return res.status(200).json({
            success: true,
            message: 'User created successfully and password reset email sent',
            user: newUserData.user,
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
