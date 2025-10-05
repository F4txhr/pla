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
            .from('tunnels')
            .select('id, name, domain, is_active, created_at');

        if (error) throw error;

        return response.status(200).json(data);
    } catch (error) {
        console.error('Error fetching tunnels:', error);
        return response.status(500).json({ error: 'Failed to fetch tunnels.', details: error.message });
    }
}

async function handlePost(request, response) {
    try {
        const newTunnels = request.body;

        if (!Array.isArray(newTunnels)) {
            return response.status(400).json({ error: 'Request body must be an array of tunnel objects.' });
        }

        // Step 1: Delete all existing tunnels.
        const { error: deleteError } = await supabase
            .from('tunnels')
            .delete()
            .neq('id', -1);

        if (deleteError) throw deleteError;

        // Step 2: Insert the new tunnels if the list is not empty.
        if (newTunnels.length > 0) {
            // We assume the body contains objects like { name, domain, is_active }
            const { error: insertError } = await supabase
                .from('tunnels')
                .insert(newTunnels);

            if (insertError) throw insertError;
        }

        // Step 3: Update the 'last_updated_timestamp' in the metadata table.
        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) throw metaError;

        return response.status(200).json({ success: true, message: 'Tunnels updated successfully.' });
    } catch (error) {
        console.error('Error updating tunnels:', error);
        return response.status(500).json({ error: 'Failed to update tunnels.', details: error.message });
    }
}