import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    const { method } = request;
    const userKey = request.headers['x-user-key'] || null;

    switch (method) {
        case 'GET':
            return handleGet(request, response, userKey);
        case 'POST':
            return handlePost(request, response, userKey);
        case 'PATCH':
            return handlePatch(request, response, userKey);
        case 'DELETE':
            return handleDelete(request, response, userKey);
        default:
            response.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
            return response.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}

async function handleGet(request, response, userKey) {
    try {
        let query = supabase
            .from('tunnels')
            .select('id, name, domain, status, created_at, user_key')
            .order('created_at', { ascending: false });

        if (userKey) {
            query = query.eq('user_key', userKey);
        } else {
            query = query.is('user_key', null);
        }

        const { data, error } = await query;
        if (error) throw error;
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Failed to fetch tunnels.', details: error.message });
    }
}

async function handlePost(request, response, userKey) {
    try {
        const { name, domain } = request.body;
        if (!name || !domain) {
            return response.status(400).json({ error: 'Name and domain are required.' });
        }

        const insertPayload = {
            name,
            domain,
            user_key: userKey || null
        };

        const { data, error } = await supabase
            .from('tunnels')
            .insert([insertPayload])
            .select()
            .single();
        if (error) throw error;
        return response.status(201).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Failed to create tunnel.', details: error.message });
    }
}

async function handlePatch(request, response, userKey) {
    try {
        const { id, name, domain, status } = request.body;
        if (!id) {
            return response.status(400).json({ error: 'An ID is required to update a tunnel.' });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (domain) updateData.domain = domain;
        if (status) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({ error: 'Nothing to update. Provide name, domain, or status.' });
        }

        let query = supabase
            .from('tunnels')
            .update(updateData)
            .eq('id', id);

        if (userKey) {
            query = query.eq('user_key', userKey);
        } else {
            query = query.is('user_key', null);
        }

        const { data, error } = await query.select().single();

        if (error) throw error;
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Failed to update tunnel.', details: error.message });
    }
}

async function handleDelete(request, response, userKey) {
    try {
        const { id } = request.body;
        if (!id) {
            return response.status(400).json({ error: 'ID is required.' });
        }

        let query = supabase
            .from('tunnels')
            .delete()
            .eq('id', id);

        if (userKey) {
            query = query.eq('user_key', userKey);
        } else {
            query = query.is('user_key', null);
        }

        const { error } = await query;
        if (error) throw error;
        return response.status(204).send();
    } catch (error) {
        return response.status(500).json({ error: 'Failed to delete tunnel.', details: error.message });
    }
}