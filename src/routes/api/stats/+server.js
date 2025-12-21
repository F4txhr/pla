import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const [
      { count: totalProxies, error: proxiesError },
      { count: onlineProxies, error: onlineProxiesError },
      { count: totalAccounts, error: accountsError },
      { count: totalTunnels, error: tunnelsError },
      { data: lastUpdatedData, error: lastUpdatedError },
    ] = await Promise.all([
      supabase.from("proxies").select("*", { count: "exact", head: true }),
      supabase
        .from("proxies")
        .select("*", { count: "exact", head: true })
        .eq("status", "online"),
      supabase.from("accounts").select("*", { count: "exact", head: true }),
      supabase.from("tunnels").select("*", { count: "exact", head: true }),
      supabase
        .from("metadata")
        .select("value")
        .eq("key", "last_updated_timestamp")
        .single(),
    ]);

    if (proxiesError) throw proxiesError;
    if (onlineProxiesError) throw onlineProxiesError;
    if (accountsError) throw accountsError;
    if (tunnelsError) throw tunnelsError;
    if (lastUpdatedError && lastUpdatedError.code !== "PGRST116") {
      throw lastUpdatedError;
    }

    const stats = {
      totalProxies: totalProxies || 0,
      onlineProxies: onlineProxies || 0,
      totalAccounts: totalAccounts || 0,
      totalTunnels: totalTunnels || 0,
      lastUpdated: lastUpdatedData ? lastUpdatedData.value : null,
    };

    return json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return json(
      {
        error: "Failed to retrieve dashboard statistics.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
