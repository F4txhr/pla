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
            .from('metadata')
            .select('value')
            .eq('key', 'proxy_source_url')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching proxy_source_url from metadata:', error);
            throw error;
        }

        let sourceUrl = null;
        if (data && data.value) {
            // value is stored as JSONB; it might be a plain string or an object
            if (typeof data.value === 'string') {
                sourceUrl = data.value;
            } else if (typeof data.value === 'object' && data.value.url) {
                sourceUrl = data.value.url;
            }
        }

        return response.status(200).json({ sourceUrl });
    } catch (error) {
        console.error('Error in /api/proxy-source GET:', error);
        return response.status(500).json({ error: 'Failed to fetch proxy source URL.', details: error.message });
    }
}

async function handlePost(request, response) {
    try {
        const { sourceUrl } = request.body || {};
        if (!sourceUrl || typeof sourceUrl !== 'string') {
            return response.status(400).json({ error: 'sourceUrl (string) is required in request body.' });
        }

        const { error } = await supabase
            .from('metadata')
            .upsert({ key: 'proxy_source_url', value: sourceUrl });

        if (error) {
            console.error('Error saving proxy_source_url to metadata:', error);
            throw error;
        }

        return response.status(200).json({ success: true, sourceUrl });
    } catch (error) {
        console.error('Error in /api/proxy-source POST:', error);
        return response.status(500).json({ error: 'Failed to save proxy source URL.', details: error.message });
    }
}