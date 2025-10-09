import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method === 'GET') {
        return handleGet(request, response);
    } else {
        response.setHeader('Allow', ['GET']);
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