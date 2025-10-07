/**
 * Vercel Serverless Function to fetch content from a given URL.
 * This acts as a CORS proxy to bypass browser restrictions.
 */
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const { url } = request.body;

    if (!url) {
        return response.status(400).json({ error: 'URL is required in the request body.' });
    }

    try {
        // Validate the URL to ensure it's a valid http/https URL
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(url)) {
            return response.status(400).json({ error: 'Invalid URL format. Only http and https protocols are allowed.' });
        }

        const fetchResponse = await fetch(url, {
            headers: {
                // Mimic a browser user-agent to avoid simple bot blocks
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch from the provided URL. Status: ${fetchResponse.status}`);
        }

        const textContent = await fetchResponse.text();

        // Set the content type to plain text and send the response
        response.setHeader('Content-Type', 'text/plain');
        return response.status(200).send(textContent);

    } catch (error) {
        console.error('Error in /api/fetch-url:', error);
        return response.status(500).json({ error: 'Failed to fetch URL content.', details: error.message });
    }
}