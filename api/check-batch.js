import { supabase } from './_lib/supabaseClient.js';

// This endpoint is designed to be called by the frontend to check a specific batch of proxies.
export default async function handler(request, response) {
    console.log(`[API /check-batch] Incoming request: ${request.method} ${request.url}`);

    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        console.warn(`[API /check-batch] Method not allowed: ${request.method}`);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const proxiesToCheck = request.body;
    console.log(`[API /check-batch] Proxies to check: ${Array.isArray(proxiesToCheck) ? proxiesToCheck.length : 'invalid body'}`);

    if (!Array.isArray(proxiesToCheck) || proxiesToCheck.length === 0) {
        return response.status(400).json({ error: 'Request body must be a non-empty array of proxy objects.' });
    }

    try {
        // Use the FoolVPN health check API for server-side batch checks
        const API_BASE_URL = 'https://id1.foolvpn.me/api/v1';
        const subBatchSize = 10; // Process in smaller sub-batches to avoid overwhelming APIs

        for (let i = 0; i < proxiesToCheck.length; i += subBatchSize) {
            const subBatch = proxiesToCheck.slice(i, i + subBatchSize);
            const updates = [];
            const deleteIds = [];

            const healthChecks = subBatch.map(proxy => {
                const url = `${API_BASE_URL}/check?ip=${encodeURIComponent(proxy.proxy_data)}`;
                return fetch(url)
                    .then(res => (res.ok ? res.json() : Promise.reject('Fetch failed')))
                    .then(data => ({
                        success: data.proxyip === true,
                        latency_ms: typeof data.delay === 'number' ? data.delay : 0
                    }))
                    .catch(() => ({ success: false, latency_ms: 0 }));
            });

            const results = await Promise.all(healthChecks);

            results.forEach((result, index) => {
                const originalProxy = subBatch[index];
                const prevOffline = originalProxy.offline_count || 0;
                const newOfflineCount = result.success ? 0 : prevOffline + 1;

                if (!result.success && newOfflineCount >= 3) {
                    // Mark this proxy for deletion after repeated failures
                    deleteIds.push(originalProxy.id);
                    return;
                }

                updates.push({
                    id: originalProxy.id,
                    proxy_data: originalProxy.proxy_data,
                    status: result.success ? 'online' : 'offline',
                    latency: result.latency_ms,
                    last_checked: new Date().toISOString(),
                    country: originalProxy.country,
                    org: originalProxy.org,
                    offline_count: newOfflineCount
                });
            });

            // Upsert the results for this small sub-batch immediately.
            if (updates.length > 0) {
                const { error: updateError } = await supabase
                    .from('proxies')
                    .upsert(updates, { onConflict: 'id' });

                if (updateError) {
                    console.error(`Supabase error during sub-batch update (index ${i}):`, updateError);
                    // Do not throw; allow the process to continue with the next sub-batch.
                }
            }

            // Delete proxies that have failed 3 times in a row
            if (deleteIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('proxies')
                    .delete()
                    .in('id', deleteIds);

                if (deleteError) {
                    console.error(`Supabase error during sub-batch delete (index ${i}):`, deleteError);
                } else {
                    console.log(`[API /check-batch] Deleted ${deleteIds.length} proxies after 3 failed checks.`);
                }
            }
        }

        return response.status(200).json({ success: true, message: `Processed ${proxiesToCheck.length} proxies.` });

    } catch (error) {
        console.error('Error in /api/check-batch:', error);
        return response.status(500).json({ error: 'Failed to check proxy batch.', details: error.message });
    }
}