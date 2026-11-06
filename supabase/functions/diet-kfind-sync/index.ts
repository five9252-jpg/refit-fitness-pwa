import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const pick = (row: Record<string, unknown>, ...keys: string[]) => { for (const key of keys) if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key]; return null; };
// Missing K-FIND values must stay null; converting an empty string to Number('')
// would silently publish a false zero in the nutrition record.
const num = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw || /^(?:-|—|n\/?a|null)$/i.test(raw)) return null;
  const match = raw.replace(/,/g, '').match(/^[+-]?(?:\d+\.?\d*|\.\d+)/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers: cors });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const apiKey = Deno.env.get('FOOD_SAFETY_API_KEY');
  if (!token) return Response.json({ error: 'Authentication required' }, { status: 401, headers: cors });
  if (!apiKey) return Response.json({ error: 'K-FIND API key is not configured' }, { status: 503, headers: cors });
  const url=Deno.env.get('SUPABASE_URL')!, serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const { data: { user }, error: authError } = await service.auth.getUser(token);
  if(authError||!user)return Response.json({error:'Invalid session'},{status:401,headers:cors});
  const {data:admin}=await service.from('admin_memberships').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin)return Response.json({error:'Admin only'},{status:403,headers:cors});
  const body=await req.json().catch(()=>({}));
  const start=Math.max(1,Math.floor(Number(body.start)||1));
  const end=Math.min(start+499,Math.floor(Number(body.end)||start+499));
  let payload: any;
  // K-FIND's current linked food-nutrition service is I2791. Keep its key on
  // the server; never call this source directly from the public browser.
  try { const response=await fetch(`https://openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(apiKey)}/I2791/json/${start}/${end}`);if(!response.ok)throw new Error('K-FIND request failed');payload=await response.json(); }
  catch{return Response.json({error:'K-FIND API request failed'},{status:502,headers:cors});}
  const block=payload?.I2791;
  if(block?.RESULT?.CODE&&block.RESULT.CODE!=='INFO-000')return Response.json({error:'K-FIND returned an API error',code:block.RESULT.CODE},{status:502,headers:cors});
  const rows=Array.isArray(block?.row)?block.row:[];
  const mapped=rows.map((row:Record<string,unknown>)=>{
    const code=pick(row,'FOOD_CD','foodCd','식품코드'),name=pick(row,'FOOD_NM_KR','FOOD_NM','DESC_KOR','foodNmKr','식품이름');
    const serving=num(pick(row,'SERVING_SIZE','SERVING_WT','NUTRI_SERVING_SIZE','nutriServingSize','1회제공량(g)'));
    return {food_code:String(code||''),food_name:String(name||''),food_group:String(pick(row,'FOOD_GROUP','FDGRP_NM','FOOD_GROUP_NM','FOOD_CAT1_NM','FOOD_CAT2_NM','FOOD_CAT3_NM','식품군')||''),serving_g:serving,kcal:num(pick(row,'AMT_NUM1','NUTR_CONT1','NUTRI_CONT1','ENERGY_KCAL','열량(kcal)(1회제공량당)')),carbs:num(pick(row,'AMT_NUM6','NUTR_CONT2','NUTRI_CONT2','CARBOHYDRATE_G','탄수화물(g)(1회제공량당)')),protein:num(pick(row,'AMT_NUM3','NUTR_CONT3','NUTRI_CONT3','PROTEIN_G','단백질(g)(1회제공량당)')),fat:num(pick(row,'AMT_NUM4','NUTR_CONT4','NUTRI_CONT4','FAT_G','지방(g)(1회제공량당)')),source_name:'식품의약품안전처 식품영양성분DB',source_updated_at:new Date().toISOString().slice(0,10)};
  }).filter((r:any)=>r.food_code&&r.food_name);
  if(!mapped.length)return Response.json({error:'No compatible rows; check the current K-FIND API field names and authorization.',received:rows.length},{status:422,headers:cors});
  const {error}=await service.from('food_nutrients').upsert(mapped,{onConflict:'food_code'});
  if(error)return Response.json({error:'Database import failed'},{status:500,headers:cors});
  const total=Number(block?.total_count||0);
  return Response.json({imported:mapped.length,nextStart:rows.length===end-start+1&&(!total||end<total)?end+1:null,total},{headers:cors});
});

