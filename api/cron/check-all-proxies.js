import { supabase } from '../_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    // Secure the endpoint
    const VERCEL_CRON_SECRET = process.env.VERCEL_CRON_SECRET;
    const providedSecret = request.headers['authorization']?.split(' ')[1];

    if (providedSecret !== VERCEL_CRON_SECRET) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log("Cron job started: Checking all proxies.");
        const API_BASE_URL = 'https://cfanalistik.up.railway.app'; // Standardized API URL

        // Step 1: Fetch only "stale" proxies (not checked in the last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let staleProxies = [];
        let page = 0;
        const pageSize = 1000;
        let moreData = true;

        console.log(`Fetching proxies not checked since ${oneHourAgo}...`);

        while(moreData) {
            const { data, error } = await supabase
                .from('proxies')
                .select('id, proxy_data, country, org') // Fetch all necessary data
                .or(`last_checked.is.null,last_checked.lt.${oneHourAgo}`)
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                staleProxies = staleProxies.concat(data);
                page++;
            } else {
                moreData = false;
            }
        }

        if (staleProxies.length === 0) {
            console.log("No stale proxies to check. Cron job finished.");
            return response.status(200).json({ success: true, message: "No stale proxies to check." });
        }

        console.log(`Fetched ${staleProxies.length} stale proxies to check.`);

        // Step 2: Reset their status to 'testing' in the database first.
        const proxyIds = staleProxies.map(p => p.id);
        const { error: resetError } = await supabase
            .from('proxies')
            .update({ status: 'testing', latency: 0 })
            .in('id', proxyIds);

        if (resetError) {
            console.error('Cron job failed during reset phase:', resetError);
            throw new Error('Failed to reset proxies before testing.');
        }

        console.log(`Reset ${staleProxies.length} proxies to 'testing'. Now starting checks...`);

        // Step 3: Test all stale proxies in batches.
        const updates = [];
        const batchSize = 10;

        for (let i = 0; i < staleProxies.length; i += batchSize) {
            const batch = staleProxies.slice(i, i + batchSize);

            const healthChecks = batch.map(proxy => {
                const url = `${API_BASE_URL}/health?proxy=${proxy.proxy_data}`;
                return fetch(url)
                    .then(res => res.ok ? res.json() : Promise.reject(`Fetch failed`))
                    .then(data => ({ success: true, latency_ms: data.latency_ms || 0 }))
                    .catch(() => ({ success: false, latency_ms: 0 }));
            });

            const results = await Promise.all(healthChecks);

            results.forEach((result, index) => {
                const originalProxy = batch[index];
                updates.push({
                    id: originalProxy.id,
                    proxy_data: originalProxy.proxy_data, // Ensure full object for upsert
                    country: originalProxy.country,
                    org: originalProxy.org,
                    status: result.success ? 'online' : 'offline',
                    latency: result.latency_ms,
                    last_checked: new Date().toISOString()
                });
            });
        }
        console.log(`All batches processed. Total updates to apply: ${updates.length}`);

        // 3. Batch update the results in Supabase
        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('proxies')
                .upsert(updates, { onConflict: 'id' });

            if (updateError) throw updateError;
        }

        console.log(`Cron job finished. Processed ${staleProxies.length} proxies.`);
        return response.status(200).json({ success: true, message: `Checked ${staleProxies.length} proxies.` });

    } catch (error) {
        console.error('Cron job failed:', error);
        return response.status(500).json({ error: 'Cron job failed.', details: error.message });
    }
}