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
            .from('accounts')
            .select('id, username, secret_key, is_active, created_at');

        if (error) throw error;

        return response.status(200).json(data);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return response.status(500).json({ error: 'Failed to fetch accounts.', details: error.message });
    }
}

async function handlePost(request, response) {
    try {
        const newAccounts = request.body;

        if (!Array.isArray(newAccounts)) {
            return response.status(400).json({ error: 'Request body must be an array of account objects.' });
        }

        // Step 1: Delete all existing accounts.
        const { error: deleteError } = await supabase
            .from('accounts')
            .delete()
            .neq('id', -1);

        if (deleteError) throw deleteError;

        // Step 2: Insert the new accounts if the list is not empty.
        if (newAccounts.length > 0) {
            // We assume the body contains objects like { username, secret_key, is_active }
            const { error: insertError } = await supabase
                .from('accounts')
                .insert(newAccounts);

            if (insertError) throw insertError;
        }

        // Step 3: Update the 'last_updated_timestamp' in the metadata table.
        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) throw metaError;

        return response.status(200).json({ success: true, message: 'Accounts updated successfully.' });
    } catch (error) {
        console.error('Error updating accounts:', error);
        return response.status(500).json({ error: 'Failed to update accounts.', details: error.message });
    }
}