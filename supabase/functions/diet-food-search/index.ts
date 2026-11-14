import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers: cors });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Authentication required' }, { status: 401, headers: cors });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth.user) return Response.json({ error: 'Invalid session' }, { status: 401, headers: cors });
  const { query = '' } = await req.json().catch(() => ({}));
  const q = String(query).trim().slice(0, 80);
  if (q.length < 1) return Response.json({ foods: [] }, { headers: cors });
  const columns = 'food_code,food_name,food_group,serving_g,kcal,carbs,protein,fat,source_name';
  const pattern = `%${q.replace(/[%_]/g, '')}%`;
  const [raw, processed] = await Promise.all([
    client.from('food_nutrients').select(columns).like('food_code', 'R:%').ilike('food_name', pattern).order('food_name').limit(40),
    client.from('food_nutrients').select(columns).not('food_code', 'like', 'R:%').ilike('food_name', pattern).order('food_name').limit(40),
  ]);
  if (raw.error || processed.error) return Response.json({ error: 'Food lookup is not configured' }, { status: 503, headers: cors });
  const rank = (a: { food_name: string }, b: { food_name: string }) => {
    const score = (name: string) => name === q ? 0 : name.startsWith(q) ? 1 : 2;
    return score(a.food_name) - score(b.food_name) || a.food_name.length - b.food_name.length || a.food_name.localeCompare(b.food_name, 'ko');
  };
  const rawRows = (raw.data || []).sort(rank);
  const processedRows = (processed.data || []).sort(rank);
  const selected = [...rawRows.slice(0, 10), ...processedRows.slice(0, 10)];
  const remaining = [...rawRows.slice(10), ...processedRows.slice(10)].sort(rank);
  selected.push(...remaining.slice(0, 20 - selected.length));
  const foods = selected.map(row => {
    const hasServing = Number(row.serving_g) > 0;
    const scale = hasServing ? 100 / Number(row.serving_g) : 1;
    // Only show per-100g values when the source provides a valid reference mass.
    const scaled = (value: number | null) => value === null || !hasServing ? null : Number(value) * scale;
    return { code: row.food_code, name: row.food_name, group: row.food_group, serving_g: row.serving_g, kcal: scaled(row.kcal), carbs: scaled(row.carbs), protein: scaled(row.protein), fat: scaled(row.fat), source: row.source_name || 'K-FIND' };
  });
  return Response.json({ foods }, { headers: cors });
});

