import { supabase } from './_lib/supabaseClient.js';

// This endpoint is the first step in any proxy check. It resets the status
// of specified proxies to 'testing' in the database.
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const { proxyIds } = request.body;

    if (!Array.isArray(proxyIds) || proxyIds.length === 0) {
        return response.status(400).json({ error: 'Request body must be an array of proxy IDs.' });
    }

    try {
        const { error } = await supabase
            .from('proxies')
            .update({ status: 'testing', latency: 0 }) // Reset latency as well
            .in('id', proxyIds);

        if (error) {
            console.error('Supabase error during proxy reset:', error);
            throw new Error(error.message);
        }

        return response.status(200).json({ success: true, message: `${proxyIds.length} proxies have been reset to 'testing'.` });

    } catch (error) {
        console.error('Error in /api/reset-proxies:', error);
        return response.status(500).json({ error: 'Failed to reset proxy statuses.', details: error.message });
    }
}