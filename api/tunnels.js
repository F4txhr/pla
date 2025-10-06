import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', 'tunnels')
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'not found' error
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data ? data.value : []);
  } else if (req.method === 'POST') {
    try {
      const updatedTunnels = req.body;
      const { error } = await supabase
        .from('app_data')
        .upsert({ key: 'tunnels', value: updatedTunnels }, { onConflict: 'key' });

      if (error) {
        throw new Error(error.message);
      }

      res.status(200).json({ success: true, message: 'Tunnels updated successfully' });
    } catch (e) {
      res.status(400).json({ error: `Failed to parse or update tunnels: ${e.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}