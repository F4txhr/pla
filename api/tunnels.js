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
            .select('id, name, domain, is_active, created_at')
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
        const { id, name, domain } = request.body;
        if (!id || !name || !domain) {
            return response.status(400).json({ error: 'ID, name, and domain are required.' });
        }
        const { data, error } = await supabase
            .from('tunnels')
            .update({ name, domain })
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
        const { id } = request.body;
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