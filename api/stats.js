// Import the Supabase client from our shared module
import { supabase } from './_lib/supabaseClient.js';

// Vercel Serverless Function handler
export default async function handler(request, response) {
    // Only allow GET requests for this endpoint
    if (request.method !== 'GET') {
        response.setHeader('Allow', ['GET']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        // Fetch all data in parallel for maximum efficiency
        const [
            { count: totalProxies, error: proxiesError },
            { count: onlineProxies, error: onlineProxiesError },
            { count: totalAccounts, error: accountsError },
            { count: activeTunnels, error: tunnelsError },
            { data: lastUpdatedData, error: lastUpdatedError }
        ] = await Promise.all([
            // Get the total count of all proxies
            supabase.from('proxies').select('*', { count: 'exact', head: true }),
            // Get the count of proxies marked as 'online'
            supabase.from('proxies').select('*', { count: 'exact', head: true }).eq('status', 'online'),
            // Get the total count of all accounts
            supabase.from('accounts').select('*', { count: 'exact', head: true }),
            // Get the count of tunnels marked as active
            supabase.from('tunnels').select('*', { count: 'exact', head: true }).eq('is_active', true),
            // Get the last updated timestamp from the metadata table
            supabase.from('metadata').select('value').eq('key', 'last_updated_timestamp').single()
        ]);

        // Check for errors from any of the Supabase queries
        if (proxiesError) throw proxiesError;
        if (onlineProxiesError) throw onlineProxiesError;
        if (accountsError) throw accountsError;
        if (tunnelsError) throw tunnelsError;
        if (lastUpdatedError && lastUpdatedError.code !== 'PGRST116') {
            // PGRST116 means "exact one row not found", which is okay on the first run.
            // Any other error should be thrown.
            throw lastUpdatedError;
        }

        // Construct the final statistics object
        const stats = {
            totalProxies: totalProxies || 0,
            onlineProxies: onlineProxies || 0,
            totalAccounts: totalAccounts || 0,
            activeTunnels: activeTunnels || 0,
            // The value is stored in a 'value' property, extract it or return null
            lastUpdated: lastUpdatedData ? lastUpdatedData.value : null,
        };

        // Send the successful response
        return response.status(200).json(stats);

    } catch (error) {
        // Log the error and send a generic server error response
        console.error('Error fetching dashboard stats:', error);
        return response.status(500).json({ error: 'Failed to retrieve dashboard statistics.', details: error.message });
    }
}