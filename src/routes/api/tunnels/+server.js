import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "$env/static/private";

export async function GET({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.from('tunnels').select();
  if (error) {
    return json({ error: 'Failed to fetch tunnels', details: error.message }, { status: 500 });
  }
  return json(data);
}

export async function DELETE({ url }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const id = url.searchParams.get('id');

  if (!id) {
    return json({ error: 'Tunnel ID is required' }, { status: 400 });
  }

  const { error } = await supabase.from('tunnels').delete().eq('id', id);

  if (error) {
    return json({ error: 'Failed to delete tunnel', details: error.message }, { status: 500 });
  }

  return json({ message: 'Tunnel deleted successfully' }, { status: 200 });
}
