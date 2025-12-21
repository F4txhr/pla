import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

export async function POST({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { format } = await request.json();

  try {
    const { data: proxies, error } = await supabase
      .from("proxies")
      .select("proxy_data")
      .eq("status", "online");

    if (error) throw error;

    const proxyList = proxies.map((p) => p.proxy_data).join("\n");
    const encodedProxies = Buffer.from(proxyList).toString("base64");

    const configLink = `https://example.com/sub/${encodedProxies}?format=${format}`;

    return json({ configLink });
  } catch (error) {
    console.error("Error generating subscription link:", error);
    return json(
      {
        error: "Failed to generate subscription link.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
