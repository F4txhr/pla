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

// Cloudflare/Worker monitor per user based on tunnels table and direct CF GraphQL queries.
// cf_stats_id format per tunnel:
//   - "zone:ZONE_ID"   -> use zone analytics (requests + bytes)
//   - "worker:NAME"    -> use worker analytics (requests + errors + CPU time)
//   - "NAME"           -> treated as worker:NAME
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', ['GET']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        const userKey = request.headers['x-user-key'] || null;

        let query = supabase
            .from('tunnels')
            .select('id, name, domain, cf_stats_id, cf_config_id, status, created_at, user_key')
            .order('created_at', { ascending: false });

        if (userKey) {
            query = query.eq('user_key', userKey);
        } else {
            query = query.is('user_key', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        const total = data.length;
        const online = data.filter(t => t.status === 'online').length;
        const offline = data.filter(t => t.status === 'offline').length;
        const unknown = data.filter(t => !t.status || t.status === 'unknown').length;

        const usageByTunnelId = {};

        // Load all CF configs for this user (multi-account support)
        let cfConfigs = [];
        if (userKey) {
            const { data: cfgRows, error: cfgError } = await supabase
                .from('cf_configs')
                .select('id, label, cf_api_token, cf_account_id')
                .eq('user_key', userKey)
                .order('created_at', { ascending: true });

            if (cfgError) {
                console.error('[cf-usage] Failed to load cf_configs for user:', userKey, cfgError.message);
            } else if (cfgRows) {
                cfConfigs = cfgRows;
            }
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        if (cfConfigs.length > 0) {
            // For each CF config (account), fetch analytics for its tunnels
            for (const cfg of cfConfigs) {
                const cfToken = cfg.cf_api_token;
                const cfAccountId = cfg.cf_account_id || null;
                if (!cfToken) continue;

                const tunnelsForCfg = data.filter(
                    t => t.cf_stats_id && t.cf_config_id && t.cf_config_id === cfg.id
                );

                await Promise.all(
                    tunnelsForCfg.map(async (tunnel) => {
                        const rawId = tunnel.cf_stats_id || '';
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
                            workerName = rawId.trim();
                        }

                        if (type === 'zone' && !zoneId) return;
                        if (type === 'worker' && (!workerName || !cfAccountId)) return;

                        let queryStr;
                        if (type === 'zone') {
                            queryStr = getZoneAnalyticsQuery(zoneId, today, tomorrowStr);
                        } else {
                            queryStr = getWorkerAnalyticsQuery(cfAccountId, workerName, today, tomorrowStr);
                        }

                        try {
                            const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${cfToken}`,
                                    'User-Agent': BROWSER_USER_AGENT
                                },
                                body: JSON.stringify({ query: queryStr })
                            });

                            if (!res.ok) {
                                console.warn('[cf-usage] CF GraphQL request failed for tunnel', tunnel.id, 'status', res.status);
                                return;
                            }

                            const json = await res.json();
                            if (json.errors) {
                                console.warn('[cf-usage] CF GraphQL errors for tunnel', tunnel.id, json.errors);
                                return;
                            }

                            if (type === 'zone') {
                                const group =
                                    json?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0] || {};
                                const count = group.count || 0;
                                const sum = group.sum || { edgeResponseBytes: 0 };
                                usageByTunnelId[tunnel.id] = {
                                    type: 'zone',
                                    zone_id: zoneId,
                                    total_requests_today: count,
                                    total_bandwidth_today_bytes: sum.edgeResponseBytes || 0
                                };
                            } else {
                                const invocation =
                                    json?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0] || {};
                                const sum = invocation.sum || { requests: 0, subrequests: 0, errors: 0 };
                                const quantiles = invocation.quantiles || {
                                    cpuTimeP50: null,
                                    cpuTimeP90: null,
                                    cpuTimeP99: null
                                };
                                usageByTunnelId[tunnel.id] = {
                                    type: 'worker',
                                    worker_name: workerName,
                                    total_requests_today: sum.requests || 0,
                                    total_subrequests_today: sum.subrequests || 0,
                                    total_errors_today: sum.errors || 0,
                                    cpu_time_p50: quantiles.cpuTimeP50,
                                    cpu_time_p90: quantiles.cpuTimeP90,
                                    cpu_time_p99: quantiles.cpuTimeP99,
                                    note: 'CPU time is in microseconds (µs).'
                                };
                            }
                        } catch (err) {
                            console.error('[cf-usage] Error fetching CF stats for tunnel', tunnel.id, err.message);
                        }
                    })
                );
            }
        } else {
            if (data.some(t => t.cf_stats_id)) {
                console.warn('[cf-usage] No CF configs for user', userKey, '- CF analytics will be unavailable.');
            }
        }

        const tunnelsWithUsage = data.map((tunnel) => ({
            ...tunnel,
            usage: usageByTunnelId[tunnel.id] || null
        }));

        const publicConfigs = cfConfigs.map(cfg => ({
            id: cfg.id,
            label: cfg.label,
            cf_account_id: cfg.cf_account_id
        }));

        return response.status(200).json({
            userKey: userKey || null,
            totals: { total, online, offline, unknown },
            cfConfigs: publicConfigs,
            tunnels: tunnelsWithUsage
        });
    } catch (err) {
        console.error('[cf-usage] Error:', err);
        return response.status(500).json({ error: 'Failed to fetch CF usage.', details: err.message });
    }
}