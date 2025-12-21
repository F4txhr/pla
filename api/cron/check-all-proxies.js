// This cron job now simply acts as a trigger for the main asynchronous checking process.
export default async function handler(request, response) {
    // 1. Security Check: Ensure this is a legitimate request from Vercel Cron.
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const VERCEL_CRON_SECRET = process.env.VERCEL_CRON_SECRET;
    const providedSecret = request.headers['authorization']?.split(' ')[1];

    if (providedSecret !== VERCEL_CRON_SECRET) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 2. Construct the absolute URL for the trigger endpoint.
        // This is crucial for a serverless function to call another function.
        const host = request.headers.host;
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const triggerUrl = `${protocol}://${host}/api/trigger-full-check`;

        console.log(`Cron job triggering full check at: ${triggerUrl}`);

        // 3. Make the call to the trigger endpoint. We don't need to wait for it.
        // We use a short timeout to prevent the cron job itself from hanging.
        const triggerResponse = await fetch(triggerUrl, { method: 'POST' });

        // 4. Check if the trigger was accepted and respond accordingly.
        if (triggerResponse.status !== 202) {
            const errorData = await triggerResponse.json();
            throw new Error(errorData.details || `Trigger endpoint failed with status ${triggerResponse.status}`);
        }

        const result = await triggerResponse.json();
        console.log('Cron job successfully triggered the full check process.');
        return response.status(200).json({ success: true, message: 'Successfully triggered full check.', details: result });

    } catch (error) {
        console.error('Cron job failed:', error.message);
        return response.status(500).json({ error: 'Cron job failed to trigger the check.', details: error.message });
    }
}