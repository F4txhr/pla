// =================================================================================
// Mock implementation of the proxies API for local development.
// This version simulates a database in memory to avoid network errors.
// =================================================================================

// In-memory "database" for proxies. This will reset every time the server restarts.
let inMemoryProxies = [];
let proxyIdCounter = 1;

export default async function handler(request, response) {
    if (request.method === 'GET') {
        return handleGet(request, response);
    } else if (request.method === 'POST') {
        return handlePost(request, response);
    } else if (request.method === 'PATCH') {
        return handlePatch(request, response);
    } else {
        response.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }
}

// Simulates fetching all proxies. Returns the current in-memory list.
async function handleGet(request, response) {
    console.log("SIMULATOR: GET /api/proxies called. Returning in-memory proxies.");
    return response.status(200).json(inMemoryProxies);
}

// Simulates creating new proxies.
async function handlePost(request, response) {
    try {
        const newProxies = request.body;
        console.log(`SIMULATOR: POST /api/proxies called with ${newProxies.length} proxies.`);

        if (!Array.isArray(newProxies)) {
            return response.status(400).json({ error: 'Request body must be an array of proxy objects.' });
        }

        // Add new proxies to the in-memory list with simulated DB fields.
        const insertedData = newProxies.map(proxy => {
            const newEntry = {
                ...proxy,
                id: proxyIdCounter++,
                status: 'unknown',
                latency: 0,
                last_checked: null,
                created_at: new Date().toISOString()
            };
            inMemoryProxies.push(newEntry);
            return newEntry;
        });

        console.log(`SIMULATOR: Responding with ${insertedData.length} newly created proxies.`);
        return response.status(201).json({ success: true, data: insertedData });

    } catch (error) {
        console.error('SIMULATOR: Error in POST /api/proxies:', error);
        return response.status(500).json({ error: 'Simulator internal error.', details: error.message });
    }
}

// Simulates updating proxies in the in-memory list.
async function handlePatch(request, response) {
    try {
        const updates = request.body;
        console.log(`SIMULATOR: PATCH /api/proxies called with ${updates.length} updates.`);

        if (!Array.isArray(updates) || updates.length === 0) {
            return response.status(400).json({ error: 'Request body must be a non-empty array of proxy update objects.' });
        }

        updates.forEach(update => {
            const proxyToUpdate = inMemoryProxies.find(p => p.id === update.id);
            if (proxyToUpdate) {
                Object.assign(proxyToUpdate, update);
            }
        });

        console.log("SIMULATOR: Successfully processed patch updates.");
        return response.status(200).json({ success: true, message: `${updates.length} proxies updated successfully.` });

    } catch (error) {
        console.error('SIMULATOR: Error in PATCH /api/proxies:', error);
        return response.status(500).json({ error: 'Simulator internal error.', details: error.message });
    }
}