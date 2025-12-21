import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function GET() {
  try {
    const { data: proxies, error } = await supabase.from("proxies").select("id, proxy_data, status, latency, last_checked, country, org");
    if (error) throw error;
    return json(proxies);
  } catch (error) {
    console.error("Error fetching proxies:", error);
    return json({ error: "Failed to retrieve proxies." }, { status: 500 });
  }
}

export async function POST({ request }) {
  const { proxy_data } = await request.json();
  try {
    const { data, error } = await supabase.from("proxies").insert({ proxy_data }).select();
    if (error) throw error;
    return json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating proxy:", error);
    return json({ error: "Failed to create proxy." }, { status: 500 });
  }
}

export async function PATCH({ request }) {
  const { id, ...updateData } = await request.json();
  try {
    const { data, error } = await supabase.from("proxies").update(updateData).eq("id", id).select();
    if (error) throw error;
    return json(data[0]);
  } catch (error) {
    console.error("Error updating proxy:", error);
    return json({ error: "Failed to update proxy." }, { status: 500 });
  }
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  try {
    const { error } = await supabase.from("proxies").delete().eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting proxy:", error);
    return json({ error: "Failed to delete proxy." }, { status: 500 });
  }
}
