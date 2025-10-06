// =================================================================================
// Mock implementation of the accounts API for local development.
// This version returns static data and does not call Supabase.
// =================================================================================
export default async function handler(request, response) {
    console.log("SIMULATOR: GET /api/accounts called. Returning empty array.");
    return response.status(200).json([]);
}