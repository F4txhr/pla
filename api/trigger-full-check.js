import { supabase } from './_lib/supabaseClient.js';

// This endpoint is the "master trigger" for a full system check.
// It works asynchronously: it kicks off hundreds of small, independent background jobs
// and then immediately returns, preventing any server timeouts.
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        console.log('Full check triggered. Fetching all proxies...');

        // 1. Fetch ALL proxies from the database, handling pagination.
        let allProxies = [];
        let page = 0;
        const pageSize = 1000;
        let moreData = true;
        while(moreData) {
            const { data, error } = await supabase
                .from('proxies')
                .select('id, proxy_data, country, org')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (data.length > 0) {
                allProxies = allProxies.concat(data);
                page++;
            } else {
                moreData = false;
            }
        }
        console.log(`Found ${allProxies.length} total proxies.`);

        if (allProxies.length === 0) {
            return response.status(200).json({ message: 'No proxies to check.' });
        }

        // 2. Reset all proxies to 'testing' and update the timestamp in one go.
        console.log('Resetting all proxies to "testing"...');
        const proxyIds = allProxies.map(p => p.id);
        const [resetResult, metaResult] = await Promise.all([
            supabase.from('proxies').update({ status: 'testing', latency: 0 }).in('id', proxyIds),
            supabase.from('metadata').upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() })
        ]);

        if (resetResult.error) throw resetResult.error;
        if (metaResult.error) throw metaResult.error;

        // 3. Kick off all the small batch checks in the background (fire-and-forget).
        // We do NOT await these fetches. This is the key to the async architecture.
        const smallBatchSize = 25; // Small, reliable batch size
        let batchesDispatched = 0;
        for (let i = 0; i < allProxies.length; i += smallBatchSize) {
            const batch = allProxies.slice(i, i + smallBatchSize);
            // Construct the absolute URL for the API call
            const apiUrl = new URL('/api/check-batch', `http://${request.headers.host}`).toString();

            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            }).catch(err => console.error(`Error dispatching batch ${i / smallBatchSize}:`, err));
            batchesDispatched++;
        }
        console.log(`Dispatched ${batchesDispatched} small batches to be processed in the background.`);

        // 4. Immediately return a 202 Accepted response.
        return response.status(202).json({
            success: true,
            message: `Accepted: Full check of ${allProxies.length} proxies has been triggered.`
        });

    } catch (error) {
        console.error('Error in /api/trigger-full-check:', error);
        return response.status(500).json({ error: 'Failed to trigger full check.', details: error.message });
    }
}