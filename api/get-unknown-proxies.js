import { supabase } from './_lib/supabaseClient.js';

// This endpoint fetches all proxies that still have an 'unknown' status.
// It's used by the frontend's validation loop to ensure no proxies are missed.
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', ['GET']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const { data, error } = await supabase
            .from('proxies')
            .select('id, proxy_data, country, org') // Select all fields needed for a re-check
            .eq('status', 'unknown');

        if (error) {
            console.error('Supabase error fetching unknown proxies:', error);
            throw new Error(error.message);
        }

        return response.status(200).json(data);

    } catch (error) {
        console.error('Error in /api/get-unknown-proxies:', error);
        return response.status(500).json({ error: 'Failed to fetch unknown proxies.', details: error.message });
    }
}