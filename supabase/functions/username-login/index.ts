import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://myfacefit.co.kr',
  'https://five9252-jpg.github.io',
]);
const loginIdPattern = /^[a-z][a-z0-9_]{3,19}$/;

function response(body: Record<string, unknown>, status: number, origin: string) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    },
  });
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? '';
  if (!allowedOrigins.has(origin)) return new Response(null, { status: 403 });
  if (request.method === 'OPTIONS') return response({}, 200, origin);
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405, origin);

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 2048) return response({ error: 'invalid_request' }, 400, origin);
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return response({ error: 'invalid_request' }, 400, origin);
    input = JSON.parse(raw);
  } catch { return response({ error: 'invalid_request' }, 400, origin); }
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!loginIdPattern.test(username) || password.length < 8 || password.length > 256) {
    return response({ error: 'invalid_credentials' }, 401, origin);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return response({ error: 'unavailable' }, 503, origin);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const checks = [{ key: `user:${username}`, limit: 12 }];
    if (ip) checks.push({ key: `ip:${ip}`, limit: 60 });
    for (const check of checks) {
      const key = await hash(`${serviceKey}:${check.key}`);
      const { data, error } = await admin.rpc('allow_username_login', { key_value: key, max_attempts: check.limit });
      if (error) throw error;
      if (!data) return response({ error: 'rate_limited' }, 429, origin);
    }

    const { data:record, error:lookupError } = await admin.from('account_usernames')
      .select('user_id').eq('username', username).maybeSingle();
    if (lookupError) throw lookupError;
    if (!record) return response({ error: 'invalid_credentials' }, 401, origin);
    const { data:account, error:userError } = await admin.auth.admin.getUserById(record.user_id);
    if (userError) throw userError;
    const email = account.user?.email;
    if (!email || !account.user?.email_confirmed_at) {
      return response({ error: 'invalid_credentials' }, 401, origin);
    }
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session) return response({ error: 'invalid_credentials' }, 401, origin);
    return response({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }, 200, origin);
  } catch {
    return response({ error: 'unavailable' }, 503, origin);
  }
});
