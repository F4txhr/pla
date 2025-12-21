import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let moreData = true;

    while (moreData) {
      const { data, error } = await supabase
        .from("proxies")
        .select(
          "id, proxy_data, status, latency, last_checked, country, org, created_at"
        )
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
        page++;
      } else {
        moreData = false;
      }
    }

    return json(allData);
  } catch (error) {
    console.error("Error fetching proxies:", error);
    return json(
      { error: "Failed to fetch proxies.", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const newProxies = await request.json();

    if (!Array.isArray(newProxies)) {
      return json(
        { error: "Request body must be an array of proxy objects." },
        { status: 400 }
      );
    }

    let insertedData = [];
    if (newProxies.length > 0) {
      const proxiesToInsert = newProxies.map((proxy) => ({
        proxy_data: proxy.proxy_data,
        country: proxy.country,
        org: proxy.org,
        status: "unknown",
        latency: 0,
        last_checked: null,
      }));

      const { data, error: insertError } = await supabase
        .from("proxies")
        .insert(proxiesToInsert)
        .select();

      if (insertError) throw insertError;
      insertedData = data;
    }

    const { error: metaError } = await supabase
      .from("metadata")
      .upsert({ key: "last_updated_timestamp", value: new Date().toISOString() });

    if (metaError) throw metaError;

    return json({ success: true, data: insertedData }, { status: 201 });
  } catch (error) {
    console.error("Error importing proxies:", error);
    return json(
      { error: "Failed to import proxies.", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const updates = await request.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return json(
        {
          error:
            "Request body must be a non-empty array of proxy update objects.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("proxies")
      .upsert(updates, { onConflict: "id" });

    if (error) throw error;

    return json({
      success: true,
      message: `${updates.length} proxies updated successfully.`,
    });
  } catch (error) {
    console.error("Error batch updating proxies:", error);
    return json(
      { error: "Failed to update proxy statuses.", details: error.message },
      { status: 500 }
    );
  }
}
