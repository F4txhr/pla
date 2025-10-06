// Mock implementation of the stats API for local development.
export default async function handler(request, response) {
    console.log("SIMULATOR: GET /api/stats called. Returning mock stats.");
    const mockStats = {
        totalProxies: 0,
        onlineProxies: 0,
        totalAccounts: 0,
        activeTunnels: 0,
        lastUpdated: new Date().toISOString(),
    };
    return response.status(200).json(mockStats);
}