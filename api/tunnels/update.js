import { supabase } from '../_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const { id, name, domain } = request.body;

        if (!id || !name || !domain) {
            return response.status(400).json({ error: 'ID, name, and domain are required.' });
        }

        // Update the tunnel in the database where the ID matches.
        const { data, error } = await supabase
            .from('tunnels')
            .update({ name, domain })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Also update the 'last_updated_timestamp' in the metadata table.
        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) {
            console.error('Failed to update metadata timestamp:', metaError);
        }

        // Return the updated tunnel object.
        return response.status(200).json(data);

    } catch (error) {
        console.error('Error updating tunnel:', error);
        return response.status(500).json({ error: 'Failed to update tunnel.', details: error.message });
    }
}