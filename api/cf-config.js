import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    const userKey = request.headers['x-user-key'] || null;

    if (!userKey) {
        return response.status(400).json({ error: 'Missing x-user-key header.' });
    }

    switch (request.method) {
        case 'GET':
            return handleGet(userKey, response);
        case 'POST':
            return handlePost(userKey, request, response);
        default:
            response.setHeader('Allow', ['GET', 'POST']);
            return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }
}

// GET /api/cf-config
// Returns all CF configs for the current user (metadata only, no tokens).
async function handleGet(userKey, response) {
    try {
        const { data, error } = await supabase
            .from('cf_configs')
            .select('id, user_key, label, cf_account_id, created_at')
            .eq('user_key', userKey)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return response.status(200).json({
            user_key: userKey,
            configs: data || []
        });
    } catch (err) {
        console.error('[cf-config] GET error:', err);
        return response.status(500).json({ error: 'Failed to load CF config list.', details: err.message });
    }
}

// POST /api/cf-config
// Creates a new CF config (one per CF account). Multiple configs per user are allowed.
async function handlePost(userKey, request, response) {
    try {
        const { label, cf_api_token, cf_account_id } = request.body || {};

        if (!cf_api_token) {
            return response.status(400).json({ error: 'cf_api_token is required.' });
        }

        const finalLabel = (label && String(label).trim()) || 'Default';

        const insertPayload = {
            user_key: userKey,
            label: finalLabel,
            cf_api_token,
            cf_account_id: cf_account_id || null
        };

        const { data, error } = await supabase
            .from('cf_configs')
            .insert([insertPayload])
            .select('id, user_key, label, cf_account_id, created_at')
            .single();

        if (error) throw error;

        return response.status(201).json({
            id: data.id,
            user_key: data.user_key,
            label: data.label,
            cf_account_id: data.cf_account_id,
            created_at: data.created_at
        });
    } catch (err) {
        console.error('[cf-config] POST error:', err);
        return response.status(500).json({ error: 'Failed to save CF config.', details: err.message });
    }
}