import { supabase } from './_lib/supabaseClient.js';

const BROWSER_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36';

function getZoneAnalyticsQuery(zoneId, since, until) {
    return `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequestsAdaptiveGroups(
            filter: { date_geq: "${since}", date_lt: "${until}" },
            limit: 1
          ) {
            count
            sum { edgeResponseBytes }
          }
        }
      }
    }
  `;
}

function getWorkerAnalyticsQuery(accountId, workerName, since, until) {
    return `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          workersInvocationsAdaptive(
            filter: {
              datetime_geq: "${since}T00:00:00Z",
              datetime_lt: "${until}T00:00:00Z",
              scriptName: "${workerName}"
            },
            limit: 1
          ) {
            sum { requests, subrequests, errors }
            quantiles { cpuTimeP50, cpuTimeP90, cpuTimeP99 }
          }
        }
      }
    }
  `;
}

// Simple diagnostic endpoint to test a single CF Stats ID for the current user.
// POST /api/cf-test
// Headers: x-user-key: <username>
// Body: { "cf_stats_id": "worker:my-script" } OR { "cf_stats_id": "zone:ZONE_ID" }
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const userKey = request.headers['x-user-key'] || null;
    if (!userKey) {
        return response.status(400).json({ error: 'Missing x-user-key header.' });
    }

    try {
        const { cf_stats_id } = request.body || {};
        if (!cf_stats_id || typeof cf_stats_id !== 'string') {
            return response.status(400).json({ error: 'cf_stats_id is required (string).' });
        }

        // Load CF config for this user.
        // For multi-account, we simply use the first config for now.
        const { data: cfgRows, error: cfgError } = await supabase
            .from('cf_configs')
            .select('id, cf_api_token, cf_account_id')
            .eq('user_key', userKey)
            .order('created_at', { ascending: true });

        if (cfgError) {
            throw cfgError;
        }
        const cfg = Array.isArray(cfgRows) && cfgRows.length > 0 ? cfgRows[0] : null;
        if (!cfg) {
            return response.status(400).json({ error: 'No Cloudflare config found for this user. Please save it in the dashboard first.' });
        }

        const cfToken = cfg.cf_api_token;
        const cfAccountId = cfg.cf_account_id || null;

        const rawId = cf_stats_id.trim();
        let type = 'worker';
        let zoneId = null;
        let workerName = null;

        if (rawId.startsWith('zone:')) {
            type = 'zone';
            zoneId = rawId.substring('zone:'.length).trim();
        } else if (rawId.startsWith('worker:')) {
            type = 'worker';
            workerName = rawId.substring('worker:'.length).trim();
        } else {
            type = 'worker';
            workerName = rawId;
        }

        if (type === 'zone' && !zoneId) {
            return response.status(400).json({ error: 'Invalid zone CF Stats ID. Expected zone:ZONE_ID.' });
        }
        if (type === 'worker' && (!workerName || !cfAccountId)) {
            return response.status(400).json({ error: 'Invalid worker CF Stats ID or missing cf_account_id. Please set Account ID and use worker:NAME.' });
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        let queryStr;
        if (type === 'zone') {
            queryStr = getZoneAnalyticsQuery(zoneId, today, tomorrowStr);
        } else {
            queryStr = getWorkerAnalyticsQuery(cfAccountId, workerName, today, tomorrowStr);
        }

        const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cfToken}`,
                'User-Agent': BROWSER_USER_AGENT
            },
            body: JSON.stringify({ query: queryStr })
        });

        const cfJson = await cfRes.json();

        return response.status(cfRes.status).json({
            ok: cfRes.ok,
            type,
            zone_id: zoneId,
            worker_name: workerName,
            cloudflare_raw: cfJson
        });
    } catch (err) {
        console.error('[cf-test] Error:', err);
        return response.status(500).json({ error: 'Failed to test Cloudflare analytics.', details: err.message });
    }
}