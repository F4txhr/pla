import { supabase } from './_lib/supabaseClient.js';

// Simple Cloudflare/Worker monitor per user based on tunnels status.
// For now, it reports tunnels per user_key and their last known status.
// You can later plug this into your external CF metrics API if desired.
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', ['GET']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const userKey = request.headers['x-user-key'] || null;

        let query = supabase
            .from('tunnels')
            .select('id, name, domain, status, created_at, user_key')
            .order('created_at', { ascending: false });

        if (userKey) {
            query = query.eq('user_key', userKey);
        } else {
            query = query.is('user_key', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        const total = data.length;
        const online = data.filter(t => t.status === 'online').length;
        const offline = data.filter(t => t.status === 'offline').length;
        const unknown = data.filter(t => !t.status || t.status === 'unknown').length;

        return response.status(200).json({
            userKey: userKey || null,
            totals: { total, online, offline, unknown },
            tunnels: data
        });
    } catch (err) {
        console.error('[cf-usage] Error:', err);
        return response.status(500).json({ error: 'Failed to fetch CF usage.', details: err.message });
    }
}