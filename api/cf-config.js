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

async function handleGet(userKey, response) {
    try {
        const { data, error } = await supabase
            .from('cf_configs')
            .select('user_key, cf_account_id, created_at')
            .eq('user_key', userKey)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!data) {
            return response.status(200).json({
                user_key: userKey,
                hasToken: false,
                cf_account_id: null,
                created_at: null
            });
        }

        return response.status(200).json({
            user_key: data.user_key,
            hasToken: true,
            cf_account_id: data.cf_account_id,
            created_at: data.created_at
        });
    } catch (err) {
        console.error('[cf-config] GET error:', err);
        return response.status(500).json({ error: 'Failed to load CF config.', details: err.message });
    }
}

async function handlePost(userKey, request, response) {
    try {
        const { cf_api_token, cf_account_id } = request.body || {};

        if (!cf_api_token) {
            return response.status(400).json({ error: 'cf_api_token is required.' });
        }

        const upsertPayload = {
            user_key: userKey,
            cf_api_token,
            cf_account_id: cf_account_id || null
        };

        const { data, error } = await supabase
            .from('cf_configs')
            .upsert(upsertPayload, { onConflict: 'user_key' })
            .select('user_key, cf_account_id, created_at')
            .single();

        if (error) throw error;

        return response.status(200).json({
            user_key: data.user_key,
            cf_account_id: data.cf_account_id,
            created_at: data.created_at
        });
    } catch (err) {
        console.error('[cf-config] POST error:', err);
        return response.status(500).json({ error: 'Failed to save CF config.', details: err.message });
    }
}