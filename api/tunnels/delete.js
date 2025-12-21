import { supabase } from '../_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const { id } = request.body;

        if (!id) {
            return response.status(400).json({ error: 'Tunnel ID is required.' });
        }

        // Delete the tunnel from the database where the ID matches.
        const { error } = await supabase
            .from('tunnels')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Also update the 'last_updated_timestamp' in the metadata table.
        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) {
            console.error('Failed to update metadata timestamp:', metaError);
        }

        return response.status(200).json({ success: true, message: 'Tunnel deleted successfully.' });

    } catch (error) {
        console.error('Error deleting tunnel:', error);
        return response.status(500).json({ error: 'Failed to delete tunnel.', details: error.message });
    }
}