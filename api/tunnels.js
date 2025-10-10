import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    const { method } = request;

    switch (method) {
        case 'GET':
            return handleGet(request, response);
        case 'POST':
            return handlePost(request, response);
        case 'PATCH':
            return handlePatch(request, response);
        case 'DELETE':
            return handleDelete(request, response);
        default:
            response.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
            return response.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}

async function handleGet(request, response) {
    try {
        const { data, error } = await supabase
            .from('tunnels')
            // Select the new status column to send it to the frontend.
            .select('id, name, domain, status, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Failed to fetch tunnels.', details: error.message });
    }
}

async function handlePost(request, response) {
    try {
        const { name, domain } = request.body;
        if (!name || !domain) {
            return response.status(400).json({ error: 'Name and domain are required.' });
        }
        // The 'status' column has a default value of 'unknown' in the DB,
        // so we don't need to specify it on creation.
        const { data, error } = await supabase
            .from('tunnels')
            .insert([{ name, domain }])
            .select()
            .single();
        if (error) throw error;
        return response.status(201).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Failed to create tunnel.', details: error.message });
    }
}

async function handlePatch(request, response) {
    try {
        const { id, name, domain, status } = request.body;
        if (!id) {
            return response.status(400).json({ error: 'An ID is required to update a tunnel.' });
        }

        // Build an object with only the provided fields to update.
        // This allows updating just the status, or the name/domain, or all.
        const updateData = {};
        if (name) updateData.name = name;
        if (domain) updateData.domain = domain;
        if (status) updateData.status = status;

        // Ensure there's actually something to update.
        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({ error: 'Nothing to update. Provide name, domain, or status.' });
        }

        const { data, error } = await supabase
            .from('tunnels')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Failed to update tunnel.', details: error.message });
    }
}

async function handleDelete(request, response) {
    try {
        // ID is passed as a query parameter, e.g., /api/tunnels?id=123
        const { id } = request.query;
        if (!id) {
            return response.status(400).json({ error: 'ID is required.' });
        }
        const { error } = await supabase.from('tunnels').delete().eq('id', id);
        if (error) throw error;
        return response.status(204).send();
    } catch (error) {
        return response.status(500).json({ error: 'Failed to delete tunnel.', details: error.message });
    }
}