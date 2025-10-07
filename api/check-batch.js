import { supabase } from './_lib/supabaseClient.js';

// This endpoint is designed to be called by the frontend to check a specific batch of proxies.
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const proxiesToCheck = request.body;

    if (!Array.isArray(proxiesToCheck) || proxiesToCheck.length === 0) {
        return response.status(400).json({ error: 'Request body must be a non-empty array of proxy objects.' });
    }

    try {
        const API_BASE_URL = 'https://cfanalistik.up.railway.app';
        const updates = [];
        const batchSize = 10; // Process in smaller sub-batches to avoid overwhelming the health check API

        for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
            const subBatch = proxiesToCheck.slice(i, i + batchSize);

            const healthChecks = subBatch.map(proxy => {
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
                const originalProxy = subBatch[index];
                updates.push({
                    id: originalProxy.id,
                    proxy_data: originalProxy.proxy_data,
                    status: result.success ? 'online' : 'offline',
                    latency: result.latency_ms,
                    last_checked: new Date().toISOString(),
                    country: originalProxy.country,
                    org: originalProxy.org,
                });
            });
        }

        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('proxies')
                .upsert(updates, { onConflict: 'id' });

            if (updateError) {
                console.error('Supabase error during batch update:', updateError);
                throw new Error(updateError.message);
            }
        }

        return response.status(200).json({ success: true, message: `Processed ${proxiesToCheck.length} proxies.` });

    } catch (error) {
        console.error('Error in /api/check-batch:', error);
        return response.status(500).json({ error: 'Failed to check proxy batch.', details: error.message });
    }
}