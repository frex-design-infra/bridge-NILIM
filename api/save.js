const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://twolywmokxggjnugzuig.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 環境変数チェック
  if (!SB_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY が未設定です' });
  }

  const supabase = createClient(SB_URL, SB_KEY);

  // body が文字列の場合（一部環境でパース済みでないケース）
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }

  const { action, payload } = body || {};

  try {
    if (action === 'upsert') {
      const { id, ...data } = payload || {};
      if (id) {
        const { error } = await supabase.from('bridges').update(data).eq('id', id);
        if (error) throw error;
        return res.json({ id });
      } else {
        const { data: row, error } = await supabase
          .from('bridges').insert(data).select('id').single();
        if (error) throw error;
        return res.json({ id: row.id });
      }
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('bridges')
        .select('id, name, management_number, data, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    return res.status(400).json({ error: `unknown action: ${action}` });
  } catch (e) {
    console.error('[api/save]', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
};
