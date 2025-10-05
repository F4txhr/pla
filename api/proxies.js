import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        return handleGet(request, response);
    } else if (request.method === 'POST') {
        return handlePost(request, response);
    } else {
        response.setHeader('Allow', ['GET', 'POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }
}

async function handleGet(request, response) {
    try {
        const { data, error } = await supabase
            .from('proxies')
            .select('id, proxy_data, status, created_at');

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

        // Ensure the request body is an array
        if (!Array.isArray(newProxies)) {
            return response.status(400).json({ error: 'Request body must be an array of proxy strings.' });
        }

        // Step 1: Delete all existing proxies to ensure a fresh list.
        // This is simpler than calculating a diff.
        const { error: deleteError } = await supabase
            .from('proxies')
            .delete()
            .neq('id', -1); // A condition to delete all rows

        if (deleteError) throw deleteError;

        // Step 2: Insert the new proxies if the list is not empty.
        if (newProxies.length > 0) {
            const proxiesToInsert = newProxies.map(proxy => ({ proxy_data: proxy, status: 'unchecked' }));
            const { error: insertError } = await supabase
                .from('proxies')
                .insert(proxiesToInsert);

            if (insertError) throw insertError;
        }

        // Step 3: Update the 'last_updated_timestamp' in the metadata table.
        // The `upsert` operation will create the key if it doesn't exist or update it if it does.
        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) throw metaError;

        return response.status(200).json({ success: true, message: 'Proxies updated successfully.' });
    } catch (error) {
        console.error('Error updating proxies:', error);
        return response.status(500).json({ error: 'Failed to update proxies.', details: error.message });
    }
}