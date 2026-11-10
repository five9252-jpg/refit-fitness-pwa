import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers: cors });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_VISION_MODEL');
  if (!token) return Response.json({ error: 'Authentication required' }, { status: 401, headers: cors });
  if (!openAiKey || !model) return Response.json({ error: 'AI analysis is not configured' }, { status: 503, headers: cors });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth.user) return Response.json({ error: 'Invalid session' }, { status: 401, headers: cors });
  const { data: consent } = await client.from('diet_consents').select('ai_photo_analysis').eq('user_id', auth.user.id).maybeSingle();
  if (!consent?.ai_photo_analysis) return Response.json({ error: 'AI photo-transmission consent required' }, { status: 403, headers: cors });
  const { image } = await req.json().catch(() => ({}));
  if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 9_000_000) return Response.json({ error: 'A supported image up to 6 MB is required' }, { status: 400, headers: cors });
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0, max_tokens: 500, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'Identify visible foods and estimate edible portions in grams from the photo. Return JSON only: {"foods":[{"name":"...","amount_g":number,"confidence":"low|medium|high"}]}. If uncertain, use low confidence and do not invent precision. This is an estimate, not dietary or medical advice.' },
      { role: 'user', content: [{ type: 'text', text: '음식 종류와 대략적인 섭취 가능 분량을 추정해 주세요. 사진 속에 보이지 않는 음식은 추가하지 마세요.' }, { type: 'image_url', image_url: { url: image, detail: 'low' } }] }
    ] })
  });
  if (!upstream.ok) return Response.json({ error: 'AI provider request failed' }, { status: 502, headers: cors });
  const payload = await upstream.json();
  try {
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || '{}');
    const foods = Array.isArray(parsed.foods) ? parsed.foods.slice(0, 12).map((f: any) => ({ name: String(f.name || '').slice(0, 100), amount_g: Math.max(0, Math.min(10000, Number(f.amount_g) || 0)), confidence: ['low','medium','high'].includes(f.confidence) ? f.confidence : 'low' })).filter((f: any) => f.name) : [];
    return Response.json({ foods, estimate_only: true }, { headers: cors });
  } catch { return Response.json({ foods: [], estimate_only: true }, { headers: cors }); }
});
