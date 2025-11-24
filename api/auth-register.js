import { supabase } from './_lib/supabaseClient.js';
import crypto from 'crypto';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const { email, username, password } = request.body || {};

        if (!email || !username || !password) {
            return response.status(400).json({ error: 'Email, username, and password are required.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedUsername = String(username).trim();

        if (!normalizedEmail.includes('@')) {
            return response.status(400).json({ error: 'Invalid email address.' });
        }
        if (normalizedUsername.length < 3) {
            return response.status(400).json({ error: 'Username must be at least 3 characters.' });
        }
        if (password.length < 6) {
            return response.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const passwordHash = crypto
            .createHash('sha256')
            .update(password)
            .digest('hex');

        const { data, error } = await supabase
            .from('users')
            .insert([{ email: normalizedEmail, username: normalizedUsername, password_hash: passwordHash }])
            .select('id, email, username')
            .single();

        if (error) {
            // Handle unique violations gracefully
            if (error.code === '23505') {
                return response.status(400).json({ error: 'Email or username already registered.' });
            }
            throw error;
        }

        return response.status(201).json({
            id: data.id,
            email: data.email,
            username: data.username
        });
    } catch (err) {
        console.error('[auth-register] Error:', err);
        return response.status(500).json({ error: 'Failed to register user.', details: err.message });
    }
}