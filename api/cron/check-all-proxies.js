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

        // 1. Fetch all proxies from the database
        let allProxies = [];
        let page = 0;
        const pageSize = 1000;
        let moreData = true;

        while(moreData) {
            const { data, error } = await supabase
                .from('proxies')
                .select('id, proxy_data')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allProxies = allProxies.concat(data);
                page++;
            } else {
                moreData = false;
            }
        }

        console.log(`Fetched ${allProxies.length} proxies to check.`);

        // 2. Test all proxies in batches using the corrected health check logic
        console.log(`Processing ${allProxies.length} proxies in batches...`);
        const updates = [];
        const batchSize = 10;

        for (let i = 0; i < allProxies.length; i += batchSize) {
            const batch = allProxies.slice(i, i + batchSize);

            const healthChecks = batch.map(proxy => {
                const url = `${API_BASE_URL}/health?proxy=${proxy.proxy_data}`;
                return fetch(url)
                    .then(res => {
                        if (res.ok) return res.json();
                        return Promise.reject(new Error(`Health check failed for ${proxy.proxy_data} with status ${res.status}`));
                    })
                    .then(data => ({ success: true, latency_ms: data.latency_ms || 0 }))
                    .catch(() => ({ success: false, latency_ms: 0 }));
            });

            const results = await Promise.all(healthChecks);

            results.forEach((result, index) => {
                const proxyFromBatch = batch[index];
                updates.push({
                    id: proxyFromBatch.id,
                    status: result.success ? 'online' : 'offline',
                    latency: result.latency_ms,
                    last_checked: new Date().toISOString()
                });
            });
            console.log(`Batch ${Math.floor(i / batchSize) + 1} processed.`);
        }
        console.log(`All batches processed. Total updates to apply: ${updates.length}`);

        // 3. Batch update the results in Supabase
        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('proxies')
                .upsert(updates, { onConflict: 'id' });

            if (updateError) throw updateError;
        }

        console.log(`Cron job finished. Processed ${allProxies.length} proxies.`);
        return response.status(200).json({ success: true, message: `Checked ${allProxies.length} proxies.` });

    } catch (error) {
        console.error('Cron job failed:', error);
        return response.status(500).json({ error: 'Cron job failed.', details: error.message });
    }
}