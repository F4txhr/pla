import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        return handleGet(request, response);
    } else if (request.method === 'POST') {
        return handlePost(request, response);
    } else if (request.method === 'PATCH') {
        return handlePatch(request, response);
    } else {
        response.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }
}

async function handleGet(request, response) {
    try {
        const { data, error } = await supabase
            .from('proxies')
            .select('id, proxy_data, status, latency, last_checked, country, org, created_at')
            .range(0, 4999); // Override default 1000-row limit

        if (error) throw error;

        return response.status(200).json(data);
    } catch (error) {
        console.error('Error fetching proxies:', error);
        return response.status(500).json({ error: 'Failed to fetch proxies.', details: error.message });
    }
}

async function handlePost(request, response) {
    try {
        const newProxies = request.body;

        if (!Array.isArray(newProxies)) {
            return response.status(400).json({ error: 'Request body must be an array of proxy objects.' });
        }

        let insertedData = [];
        if (newProxies.length > 0) {
            // The frontend now sends structured objects
            const proxiesToInsert = newProxies.map(proxy => ({
                proxy_data: proxy.proxy_data,
                country: proxy.country,
                org: proxy.org,
                status: 'unknown',
                latency: 0,
                last_checked: null
            }));

            const { data, error: insertError } = await supabase
                .from('proxies')
                .insert(proxiesToInsert)
                .select();

            if (insertError) throw insertError;
            insertedData = data;
        }

        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) throw metaError;

        return response.status(201).json({ success: true, data: insertedData });
    } catch (error) {
        console.error('Error importing proxies:', error);
        return response.status(500).json({ error: 'Failed to import proxies.', details: error.message });
    }
}

async function handlePatch(request, response) {
    try {
        const updates = request.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return response.status(400).json({ error: 'Request body must be a non-empty array of proxy update objects.' });
        }

        // Use 'upsert' for batch updates. This is efficient.
        const { data, error } = await supabase
            .from('proxies')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;

        return response.status(200).json({ success: true, message: `${updates.length} proxies updated successfully.` });
    } catch (error) {
        console.error('Error batch updating proxies:', error);
        return response.status(500).json({ error: 'Failed to update proxy statuses.', details: error.message });
    }
}