import { supabase } from './_lib/supabaseClient.js';

// Cloudflare/Worker monitor per user based on tunnels table and external test-api CF stats.
// It aggregates tunnel status and, if cf_stats_id is present, fetches analytics from /statscf/data/:id.
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', ['GET']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const userKey = request.headers['x-user-key'] || null;

        let query = supabase
            .from('tunnels')
            .select('id, name, domain, cf_stats_id, status, created_at, user_key')
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

        const baseUrl =
            process.env.CF_STATS_BASE_URL ||
            process.env.TEST_API_BASE_URL ||
            'https://api.foolvpn.me';

        const usageByTunnelId = {};

        if (baseUrl && data.length) {
            const tunnelsWithCf = data.filter(t => t.cf_stats_id);

            await Promise.all(
                tunnelsWithCf.map(async (tunnel) => {
                    const cfId = tunnel.cf_stats_id;
                    const url = `${baseUrl.replace(/\\/$/, '')}/statscf/data/${encodeURIComponent(cfId)}`;
                    try {
                        const res = await fetch(url, { method: 'GET' });
                        if (!res.ok) {
                            console.warn('[cf-usage] CF stats request failed for tunnel', tunnel.id, 'status', res.status);
                            return;
                        }
                        const payload = await res.json();
                        if (payload && payload.success && payload.data) {
                            usageByTunnelId[tunnel.id] = payload.data;
                        }
                    } catch (err) {
                        console.error('[cf-usage] Error fetching CF stats for tunnel', tunnel.id, err.message);
                    }
                })
            );
        }

        const tunnelsWithUsage = data.map((tunnel) => ({
            ...tunnel,
            usage: usageByTunnelId[tunnel.id] || null
        }));

        return response.status(200).json({
            userKey: userKey || null,
            totals: { total, online, offline, unknown },
            tunnels: tunnelsWithUsage
        });
    } catch (err) {
        console.error('[cf-usage] Error:', err);
        return response.status(500).json({ error: 'Failed to fetch CF usage.', details: err.message });
    }
}