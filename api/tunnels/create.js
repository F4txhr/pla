import { supabase } from '../_lib/supabaseClient.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const { name, domain } = request.body;

        if (!name || !domain) {
            return response.status(400).json({ error: 'Name and domain are required.' });
        }

        // Insert the new tunnel into the database.
        // The 'id' will be generated automatically by PostgreSQL.
        const { data, error } = await supabase
            .from('tunnels')
            .insert([{ name, domain }])
            .select() // Use .select() to return the newly created row.
            .single(); // Expect only one row to be returned.

        if (error) throw error;

        // Also update the 'last_updated_timestamp' in the metadata table.
        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) {
            // Log the metadata error but don't fail the whole request,
            // as the primary operation (insert) was successful.
            console.error('Failed to update metadata timestamp:', metaError);
        }

        // Return the newly created tunnel object, including its database-generated id.
        return response.status(201).json(data);

    } catch (error) {
        console.error('Error creating tunnel:', error);
        return response.status(500).json({ error: 'Failed to create tunnel.', details: error.message });
    }
}