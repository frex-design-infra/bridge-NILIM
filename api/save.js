const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://twolywmokxggjnugzuig.supabase.co';
// service_role キーが Vercel 環境変数に設定されていればそちらを優先、なければ anon キーを使用
// （anon キーはフロントエンドの HTML にも記載済みで公開情報）
const SB_KEY = process.env.SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2x5d21va3hnZ2pudWd6dWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDQ0MzksImV4cCI6MjA5MTEyMDQzOX0.fviTO35D3s3Rqz3VtTVcXdlgESjiO9yz4PRvsxGHVCI';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

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

    if (action === 'delete') {
      const { id } = payload || {};
      if (!id) return res.status(400).json({ error: 'delete requires payload.id' });

      // approvals が bridge_id を参照している場合に備えて、先に関連是認を削除する。
      const { error: approvalError } = await supabase
        .from('approvals')
        .delete()
        .eq('bridge_id', id);
      if (approvalError) throw approvalError;

      const { error } = await supabase
        .from('bridges')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.json({ id, deleted: true });
    }

    return res.status(400).json({ error: `unknown action: ${action}` });
  } catch (e) {
    console.error('[api/save]', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
};
