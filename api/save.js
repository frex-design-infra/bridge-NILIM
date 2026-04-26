import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://twolywmokxggjnugzuig.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action, payload } = req.body;

  try {
    if (action === 'upsert') {
      const { id, ...data } = payload;
      if (id) {
        const { error } = await supabase.from('bridges').update(data).eq('id', id);
        if (error) throw error;
        return res.json({ id });
      } else {
        const { data: row, error } = await supabase.from('bridges').insert(data).select('id').single();
        if (error) throw error;
        return res.json({ id: row.id });
      }
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('bridges').select('id, name, management_number, data, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
