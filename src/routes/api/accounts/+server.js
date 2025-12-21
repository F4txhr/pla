import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function GET() {
  try {
    const { data: accounts, error } = await supabase.from("accounts").select("*");
    if (error) throw error;
    return json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return json({ error: "Failed to retrieve accounts." }, { status: 500 });
  }
}

export async function POST({ request }) {
  const { username, secret_key } = await request.json();
  try {
    const { data, error } = await supabase.from("accounts").insert({ username, secret_key }).select();
    if (error) throw error;
    return json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return json({ error: "Failed to create account." }, { status: 500 });
  }
}

export async function PATCH({ request }) {
  const { id, ...updateData } = await request.json();
  try {
    const { data, error } = await supabase.from("accounts").update(updateData).eq("id", id).select();
    if (error) throw error;
    return json(data[0]);
  } catch (error) {
    console.error("Error updating account:", error);
    return json({ error: "Failed to update account." }, { status: 500 });
  }
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  try {
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting account:", error);
    return json({ error: "Failed to delete account." }, { status: 500 });
  }
}
