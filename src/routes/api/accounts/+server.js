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
      .from("accounts")
      .select("id, username, secret_key, is_active, created_at");

    if (error) throw error;

    return json(data);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return json(
      { error: "Failed to fetch accounts.", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const newAccounts = await request.json();

    if (!Array.isArray(newAccounts)) {
      return json(
        { error: "Request body must be an array of account objects." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("accounts")
      .delete()
      .neq("id", -1); // Condition to delete all rows

    if (deleteError) throw deleteError;

    if (newAccounts.length > 0) {
      const { error: insertError } = await supabase
        .from("accounts")
        .insert(newAccounts);

      if (insertError) throw insertError;
    }

    const { error: metaError } = await supabase
      .from("metadata")
      .upsert({
        key: "last_updated_timestamp",
        value: new Date().toISOString(),
      });

    if (metaError) throw metaError;

    return json({ success: true, message: "Accounts updated successfully." });
  } catch (error) {
    console.error("Error updating accounts:", error);
    return json(
      { error: "Failed to update accounts.", details: error.message },
      { status: 500 }
    );
  }
}
