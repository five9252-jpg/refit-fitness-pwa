import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const pick = (row: Record<string, unknown>, ...keys: string[]) => { for (const key of keys) if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key]; return null; };
const num = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw || /^(?:-|—|n\/?a|null|해당없음)$/i.test(raw)) return null;
  const match = raw.replace(/,/g, '').match(/^[+-]?(?:\d+\.?\d*|\.\d+)/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

type ApiPage = { rows: Record<string, unknown>[]; total: number; code: string; message: string };
type Dataset = 'processed' | 'raw';
const endpoints: Record<Dataset, string> = {
  processed: 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api',
  raw: 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api'
};
async function fetchPage(apiKey: string, page: number, dataset: Dataset): Promise<ApiPage> {
  const url = new URL(endpoints[dataset]);
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('pageNo', String(page));
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('type', 'json');
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`PUBLIC_DATA_HTTP_${response.status}`);
  let payload: any;
  try { payload = await response.json(); } catch { throw new Error('PUBLIC_DATA_INVALID_JSON'); }
  const block = payload?.response ?? payload?.Response ?? payload?.data?.response ?? payload?.data ?? payload;
  const body = block?.body ?? payload?.body;
  const items = body?.items;
  const rows = Array.isArray(items) ? items : Array.isArray(items?.item) ? items.item : items && typeof items === 'object' ? [items] : [];
  const code = String(block?.header?.resultCode || block?.header?.result_code || block?.resultCode || block?.result_code || payload?.resultCode || payload?.result_code || payload?.code || '');
  const shape = Object.keys(payload && typeof payload === 'object' ? payload : {}).slice(0, 5).join('_');
  const message = String(block?.header?.resultMsg || block?.header?.result_msg || block?.message || payload?.message || (code ? '' : `SHAPE_${shape || 'UNKNOWN'}`));
  return { rows, total: Number(body?.totalCount || body?.total_count || 0), code, message };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers: cors });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Authentication required' }, { status: 401, headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Invalid session' }, { status: 401, headers: cors });
  const { data: admin, error: adminCheckError } = await userClient.from('admin_memberships').select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminCheckError) return Response.json({ error: 'Admin membership check failed' }, { status: 500, headers: cors });
  if (!admin) return Response.json({ error: 'Admin only' }, { status: 403, headers: cors });

  const body = await req.json().catch(() => ({}));
  const dataset: Dataset = body.dataset === 'raw' ? 'raw' : 'processed';
  const start = Number(body.start) || 1;
  let page = Math.max(1, Math.floor(Number(body.page) || Math.ceil(start / 100)));
  let total = 0, imported = 0;
  const keyNames = dataset === 'raw'
    ? ['FOOD_SAFETY_RAW_API_KEY', 'FOOD_SAFETY_API_KEY', 'FOOD_SAFETY_API_KEY1']
    : ['FOOD_SAFETY_API_KEY', 'FOOD_SAFETY_API_KEY1'];
  const keys = keyNames.map(name => Deno.env.get(name)).filter((value): value is string => !!value?.trim());
  if (!keys.length) return Response.json({ error: 'DATA_GO_KR_API_KEY_MISSING' }, { status: 503, headers: cors });

  // Public data portal returns at most 100 records per page. Import five pages per
  // click so the admin can resume by nextPage without a long-running function.
  for (let batch = 0; batch < 5; batch++) {
    let result: ApiPage | null = null, lastError = 'PUBLIC_DATA_API_ERROR';
    for (const key of keys) {
      try {
        const candidate = await fetchPage(key, page, dataset);
        if (candidate.code === '00' || candidate.code === '0' || candidate.code === 'NORMAL_CODE') { result = candidate; break; }
        lastError = candidate.code || candidate.message || lastError;
      } catch (error) { lastError = error instanceof Error ? error.message : lastError; }
    }
    if (!result) {
      const safeCode = /^[A-Za-z0-9_-]{1,48}$/.test(lastError) ? lastError : 'PUBLIC_DATA_API_ERROR';
      return Response.json({ error: `PUBLIC_DATA_API_REQUEST_FAILED_${safeCode}` }, { status: 502, headers: cors });
    }
    total = result.total || total;
    const mapped = result.rows.map(row => {
      const ref = String(pick(row, 'nutConSrtrQua', 'nutrientStandardAmount') || '');
      const unitMatch = ref.match(/^\s*([\d,.]+)\s*(g|ml)\s*$/i);
      const unit = unitMatch?.[2]?.toLowerCase();
      // The current meal logger records grams. Keep millilitre-based entries out
      // until the product supports volume units rather than silently treating ml as g.
      if (unit !== 'g') return null;
      const serving = num(unitMatch?.[1]);
      const sourceCode = pick(row, 'foodCd', 'foodCode'), name = pick(row, 'foodNm', 'foodName');
      // Raw and processed datasets can have overlapping source codes. Keep raw
      // rows in a separate key namespace without rewriting existing processed IDs.
      const code = sourceCode && dataset === 'raw' ? `R:${String(sourceCode)}` : sourceCode;
      if (!code || !name || !serving || serving <= 0) return null;
      const sourceDate = String(pick(row, 'crtrYmd', 'crtYmd') || '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
      return {
        food_code: String(code), food_name: String(name), food_group: String(pick(row, 'typeNm', 'foodLv3Nm', 'foodLv4Nm', 'foodCat1Nm', 'foodCat2Nm', 'foodCat3Nm', 'foodCat4Nm') || ''),
        serving_g: serving, kcal: num(pick(row, 'enerc')), carbs: num(pick(row, 'chocdf')), protein: num(pick(row, 'prot')), fat: num(pick(row, 'fatce')),
        source_name: dataset === 'raw'
          ? '공공데이터포털·전국통합식품영양성분정보(원재료성식품)'
          : '공공데이터포털·식품의약품안전처 식품영양성분DB(가공식품)',
        source_updated_at: /^\d{4}-\d{2}-\d{2}$/.test(sourceDate) ? sourceDate : new Date().toISOString().slice(0, 10)
      };
    }).filter((row): row is NonNullable<typeof row> => !!row);
    // A public-data page may repeat a food code. PostgreSQL rejects an upsert
    // that tries to update the same key twice in one statement (SQLSTATE 21000).
    const uniqueRows = [...new Map(mapped.map(row => [row.food_code, row])).values()];
    if (uniqueRows.length) {
      const { error } = await service.from('food_nutrients').upsert(uniqueRows, { onConflict: 'food_code' });
      if (error) {
        const code = /^[A-Za-z0-9_-]{1,32}$/.test(error.code || '') ? error.code : 'UNKNOWN';
        return Response.json({ error: `DATABASE_IMPORT_FAILED_${code}` }, { status: 500, headers: cors });
      }
      imported += uniqueRows.length;
    }
    if (!result.rows.length || (total && page * 100 >= total)) return Response.json({ dataset, imported, nextPage: null, nextStart: null, total }, { headers: cors });
    page++;
  }
  return Response.json({ dataset, imported, nextPage: page, nextStart: (page - 1) * 100 + 1, total }, { headers: cors });
});
