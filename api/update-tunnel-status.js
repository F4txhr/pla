import { supabase } from './_lib/supabaseClient.js';

/**
 * Vercel Serverless Function to update the status of a single tunnel.
 */
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const { id, status } = request.body;

    if (!id || !status) {
        return response.status(400).json({ error: 'Tunnel ID and status are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('tunnels')
            .update({
                status: status,
                last_checked: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single(); // Use single() to get the updated record back

        if (error) {
            // If the tunnel is not found, Supabase might return an error.
            if (error.code === 'PGRST116') {
                return response.status(404).json({ error: `Tunnel with ID ${id} not found.` });
            }
            throw error;
        }

        return response.status(200).json({ success: true, data });

    } catch (error) {
        console.error(`Error updating tunnel status for ID ${id}:`, error);
        return response.status(500).json({ error: 'Failed to update tunnel status.', details: error.message });
    }
}