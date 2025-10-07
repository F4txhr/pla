// =================================================================================
// Configuration Converter Utilities
// =================================================================================

const CONVERTER_API_BASE_URL = 'https://cfanalistik.up.railway.app';

/**
 * Converts a list of configuration links to a specific format (Clash or Singbox)
 * by calling an external API.
 *
 * @param {string[]} configLinks - An array of configuration URIs (e.g., vless://...).
 * @param {string} format - The target format, either 'clash' or 'singbox'.
 * @param {string} level - The template level ('basic', 'standard', 'advanced'). Not currently used but included for future compatibility.
 * @returns {Promise<string>} A promise that resolves with the converted configuration text.
 */
async function convertToFormat(configLinks, format, level = 'standard') {
    if (!['clash', 'singbox'].includes(format)) {
        throw new Error('Unsupported conversion format specified.');
    }

    if (!Array.isArray(configLinks) || configLinks.length === 0) {
        throw new Error('Configuration links must be a non-empty array.');
    }

    try {
        const response = await fetch(`${CONVERTER_API_BASE_URL}/convert/${format}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                links: configLinks,
                level: level // API might use this in the future
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API conversion failed with status ${response.status}: ${errorText}`);
        }

        return await response.text();

    } catch (error) {
        console.error(`Error during ${format} conversion:`, error);
        // Re-throw a more user-friendly error
        throw new Error(`Failed to convert configuration to ${format}. Please check the console for details.`);
    }
}