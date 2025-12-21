import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { data, error } = await supabase
      .from("tunnels")
      .select("id, name, domain, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return json(data);
  } catch (error) {
    return json(
      { error: "Failed to fetch tunnels.", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { name, domain } = await request.json();
    if (!name || !domain) {
      return json({ error: "Name and domain are required." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("tunnels")
      .insert([{ name, domain }])
      .select()
      .single();
    if (error) throw error;
    return json(data, { status: 201 });
  } catch (error) {
    return json(
      { error: "Failed to create tunnel.", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { id, name, domain, status } = await request.json();
    if (!id) {
      return json(
        { error: "An ID is required to update a tunnel." },
        { status: 400 }
      );
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (domain) updateData.domain = domain;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return json(
        { error: "Nothing to update. Provide name, domain, or status." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tunnels")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return json(data);
  } catch (error) {
    return json(
      { error: "Failed to update tunnel.", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE({ url }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const id = url.searchParams.get("id");
    if (!id) {
      return json({ error: "ID is required." }, { status: 400 });
    }
    const { error } = await supabase.from("tunnels").delete().eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return json(
      { error: "Failed to delete tunnel.", details: error.message },
      { status: 500 }
    );
  }
}
