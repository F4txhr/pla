import { supabase } from './_lib/supabaseClient.js';
import crypto from 'crypto';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const { identifier, password } = request.body || {};

        if (!identifier || !password) {
            return response.status(400).json({ error: 'Identifier (email or username) and password are required.' });
        }

        const normalizedIdentifier = String(identifier).trim().toLowerCase();

        let query = supabase
            .from('users')
            .select('id, email, username, password_hash');

        // Match either email or username
        query = query.or(
            `email.eq.${normalizedIdentifier},username.eq.${normalizedIdentifier}`
        );

        const { data, error } = await query.single();

        if (error) {
            // PGRST116 = no row found
            if (error.code === 'PGRST116') {
                return response.status(401).json({ error: 'Invalid credentials.' });
            }
            throw error;
        }

        const hash = crypto
            .createHash('sha256')
            .update(password)
            .digest('hex');

        if (hash !== data.password_hash) {
            return response.status(401).json({ error: 'Invalid credentials.' });
        }

        return response.status(200).json({
            id: data.id,
            email: data.email,
            username: data.username
        });
    } catch (err) {
        console.error('[auth-login] Error:', err);
        return response.status(500).json({ error: 'Failed to login.', details: err.message });
    }
}