import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // Only allow DELETE requests
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the user's token
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error('Auth error:', authError);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user ID from request body
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Delete the user from auth
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error('Error deleting user from auth:', authDeleteError);
            return res.status(400).json({ error: authDeleteError.message });
        }

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully from auth',
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
