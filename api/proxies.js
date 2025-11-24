import { supabase } from './_lib/supabaseClient.js';

export default async function handler(request, response) {
    console.log(`[API /proxies] Incoming request: ${request.method} ${request.url}`);

    if (request.method === 'GET') {
        return handleGet(request, response);
    } else if (request.method === 'POST') {
        return handlePost(request, response);
    } else if (request.method === 'PATCH') {
        return handlePatch(request, response);
    } else {
        response.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        console.warn(`[API /proxies] Method not allowed: ${request.method}`);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }
}

async function handleGet(request, response) {
    try {
        let allData = [];
        let page = 0;
        const pageSize = 1000; // Supabase's default limit
        let moreData = true;

        console.log('[API /proxies] handleGet -> querying Supabase...');

        while (moreData) {
            const { data, error } = await supabase
                .from('proxies')
                .select('id, proxy_data, status, latency, last_checked, country, org, created_at')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                console.error('[API /proxies] Supabase error in handleGet:', error);
                throw error;
            }

            if (data && data.length > 0) {
                console.log(`[API /proxies] handleGet -> fetched page ${page}, rows: ${data.length}`);
                allData = allData.concat(data);
                page++;
            } else {
                moreData = false;
            }
        }

        // Log distribusi status untuk debug (berapa online/offline/unknown)
        const statusCounts = allData.reduce((acc, row) => {
            const s = row.status || 'null';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        console.log('[API /proxies] handleGet -> total rows returned:', allData.length);
        console.log('[API /proxies] handleGet -> status counts:', statusCounts);

        return response.status(200).json(allData);
    } catch (error) {
        console.error('Error fetching proxies:', error);
        return response.status(500).json({ error: 'Failed to fetch proxies.', details: error.message });
    }
}

async function handlePost(request, response) {
    try {
        const newProxies = request.body;

        if (!Array.isArray(newProxies)) {
            return response.status(400).json({ error: 'Request body must be an array of proxy objects.' });
        }

        let insertedData = [];
        if (newProxies.length > 0) {
            // The frontend now sends structured objects
            const proxiesToInsert = newProxies.map(proxy => ({
                proxy_data: proxy.proxy_data,
                country: proxy.country,
                org: proxy.org,
                status: 'unknown',
                latency: 0,
                last_checked: null
            }));

            const { data, error: insertError } = await supabase
                .from('proxies')
                .insert(proxiesToInsert)
                .select();

            if (insertError) throw insertError;
            insertedData = data;
        }

        const { error: metaError } = await supabase
            .from('metadata')
            .upsert({ key: 'last_updated_timestamp', value: new Date().toISOString() });

        if (metaError) throw metaError;

        return response.status(201).json({ success: true, data: insertedData });
    } catch (error) {
        console.error('Error importing proxies:', error);
        return response.status(500).json({ error: 'Failed to import proxies.', details: error.message });
    }
}

async function handlePatch(request, response) {
    try {
        const updates = request.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return response.status(400).json({ error: 'Request body must be a non-empty array of proxy update objects.' });
        }

        console.log('[API /proxies] handlePatch -> received updates:', updates.length);

        // Jika semua objek update sudah membawa proxy_data (dan field lain lengkap),
        // kita bisa menggunakan upsert batch seperti semula (efisien).
        const allHaveProxyData = updates.every(u => typeof u.proxy_data === 'string' && u.proxy_data.length > 0);

        if (allHaveProxyData) {
            console.log('[API /proxies] handlePatch -> using batch upsert (with proxy_data).');
            const { error } = await supabase
                .from('proxies')
                .upsert(updates, { onConflict: 'id' });

            if (error) {
                console.error('[API /proxies] Supabase error in handlePatch (upsert):', error);
                throw error;
            }

            // Log a small sample for easier debugging
            const sample = updates.slice(0, 3).map(u => ({
                id: u.id,
                proxy_data: u.proxy_data,
                status: u.status,
                latency: u.latency
            }));
            console.log('[API /proxies] handlePatch -> upsert success. Sample:', sample);
        } else {
            // Jika ada objek yang tidak punya proxy_data, berarti kita hanya ingin
            // memperbarui status/latency/last_checked untuk baris yang sudah ada.
            // Untuk menghindari insert row baru tanpa proxy_data (NOT NULL), kita
            // update per-row berdasarkan id.
            console.log('[API /proxies] handlePatch -> using per-row update (no proxy_data in some updates).');

            for (const u of updates) {
                if (!u.id) {
                    console.warn('[API /proxies] handlePatch -> skipping update without id:', u);
                    continue;
                }

                const patch = {
                    status: u.status,
                    latency: u.latency,
                    last_checked: u.last_checked
                };

                const { error } = await supabase
                    .from('proxies')
                    .update(patch)
                    .eq('id', u.id);

                if (error) {
                    console.error('[API /proxies] Supabase error in handlePatch (update per-row):', error, 'for id:', u.id);
                    // Lanjut ke row berikutnya, tapi tetap log error.
                } else {
                    console.log('[API /proxies] handlePatch -> updated proxy id:', u.id, 'status:', u.status, 'latency:', u.latency);
                }
            }
        }

        console.log('[API /proxies] handlePatch -> finished updating proxies:', updates.length);
        return response.status(200).json({ success: true, message: `${updates.length} proxies updated successfully.` });
    } catch (error) {
        console.error('Error batch updating proxies:', error);
        return response.status(500).json({ error: 'Failed to update proxy statuses.', details: error.message });
    }
}