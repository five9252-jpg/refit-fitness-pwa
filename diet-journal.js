(() => {
  'use strict';
  const STORE_KEY = 'pacefitDietJournalV2';
  const DB_NAME = 'pacefitDietMediaV1';
  const DB_STORE = 'photos';
  const CONSENT_KEY = 'pacefitDietConsentV1';
  const meals = ['아침', '점심', '저녁', '간식'];
  const root = document.getElementById('dietMeals');
  const backdrop = document.getElementById('dietBackdrop');
  const form = document.getElementById('dietForm');
  if (!root || !backdrop || !form) return;
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const showNutrient = (value, digits=1) => value === null || value === undefined || !Number.isFinite(Number(value)) ? '정보 없음' : Number(value).toFixed(digits);
  function foodIconKey(name='', group='') {
    const text = `${name} ${group}`.toLowerCase();
    if (/과일|사과|배$|바나나|귤|오렌지|포도|딸기|수박|복숭아/.test(text)) return 'fruit';
    if (/채소|나물|샐러드|김치|배추|상추|시금치|브로콜리|버섯|뿌리채소/.test(text)) return 'vegetable';
    if (/수산|해산|생선|어류|고등어|연어|참치|새우|오징어|조개|멸치/.test(text)) return 'seafood';
    if (/유제품|우유|요구르트|요거트|치즈|분유/.test(text)) return 'dairy';
    if (/곡류|쌀|밥$|현미|잡곡|오트|귀리|빵|면류|국수|떡$|시리얼/.test(text)) return 'grain';
    if (/단백질|육류|축산|닭고기|닭가슴살|쇠고기|소고기|돼지고기|달걀|계란|두부|콩류|두유|견과/.test(text)) return 'protein';
    return 'grain';
  }
  const foodIcon = (name, group='', extra='') => `<img class="diet-food-icon ${extra}" src="./assets/diet/${foodIconKey(name,group)}.svg" alt="" loading="lazy" width="54" height="54">`;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const read = () => { try { let raw=localStorage.getItem(STORE_KEY);if(raw===null){const legacy=JSON.parse(localStorage.getItem('pacefitDietJournalV1')||'[]');if(Array.isArray(legacy)){const migrated=legacy.map(row=>({...row,nutrients:row.nutrients||{},amount:row.amount??''}));localStorage.setItem(STORE_KEY,JSON.stringify(migrated));raw=JSON.stringify(migrated);}}const rows=JSON.parse(raw||'[]');return Array.isArray(rows)?rows:[]; } catch { return []; } };
  const write = rows => localStorage.setItem(STORE_KEY, JSON.stringify(rows));
  const openDb = () => new Promise((resolve,reject) => { const request=indexedDB.open(DB_NAME,1); request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(DB_STORE))request.result.createObjectStore(DB_STORE,{keyPath:'id'});}; request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); });
  const media = async (mode, fn) => { const db=await openDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,mode), req=fn(tx.objectStore(DB_STORE)); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); tx.oncomplete=()=>db.close(); tx.onerror=()=>{db.close();reject(tx.error);}; }); };
  const photoPut = (id,blob) => media('readwrite',s=>s.put({id,blob}));
  const photoGet = id => media('readonly',s=>s.get(id));
  const photoDel = id => media('readwrite',s=>s.delete(id));
  const consent = () => { try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || '{"server":false,"ai":false}'); } catch { return {server:false,ai:false}; } };
  let session = null, selectedPhoto = null, selectedFood = null, searchTimer, searchSeq = 0, previewUrl = '', urls = [];
  const aiConfigured = () => window.REFIT_CONFIG?.features?.dietPhotoAnalysisEnabled === true;
  const foodSearchConfigured = () => window.REFIT_CONFIG?.features?.dietFoodSearchEnabled === true;
  const refreshAnalyze = () => { const button=$('dietAnalyze');button.disabled=!(aiConfigured()&&consent().ai&&selectedPhoto&&session);button.textContent=aiConfigured()?'사진에서 음식 추정':'사진 인식 설정 대기 중'; };
  const toast = message => { let el=$('dietToast'); if(!el){el=document.createElement('div');el.id='dietToast';el.className='diet-toast';el.setAttribute('role','status');document.body.append(el);} el.textContent=message;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),2600); };
  const cloudReady = () => !!(session?.client && session?.user && consent().server);
  async function searchFoods(query) {
    const requestId = ++searchSeq;
    const results=$('dietSearchResults'); if(!query.trim()) { results.innerHTML=''; return; }
    if(!foodSearchConfigured()){results.innerHTML='<p class="diet-empty">공식 K-FIND DB와 검색 함수를 서버에 설정한 뒤 이용할 수 있어요. 음식명을 직접 입력할 수 있습니다.</p>';return;}
    if(!session?.client) { results.innerHTML='<p class="diet-empty">공식 영양 DB 검색은 로그인 후 서버 설정이 완료되면 사용할 수 있어요. 음식명을 직접 입력해 기록할 수 있습니다.</p>'; return; }
    results.innerHTML='<p class="diet-empty">공식 식품 DB 검색 중…</p>';
    try {
      const {data,error}=await session.client.functions.invoke('diet-food-search',{body:{query:query.trim()}});
      if (requestId !== searchSeq) return;
      if(error) throw error;
      const foods=Array.isArray(data?.foods)?data.foods:[];
      results.innerHTML=foods.length?foods.map((f,i)=>`<button type="button" class="diet-search-result" data-food-index="${i}">${foodIcon(f.name,f.group)}<span class="diet-search-result-copy"><strong>${escape(f.name)}</strong><small>${escape(f.source || 'K-FIND')} · 100g ${showNutrient(f.kcal,0)}kcal · P ${showNutrient(f.protein)}g · C ${showNutrient(f.carbs)}g · F ${showNutrient(f.fat)}g</small></span></button>`).join(''):'<p class="diet-empty">검색 결과가 없습니다. 직접 입력해 기록할 수 있어요.</p>';
      results._foods=foods;
    } catch { if (requestId === searchSeq) results.innerHTML='<p class="diet-empty">식품 DB를 아직 사용할 수 없습니다. 관리자 설정 후 이용하거나 음식명을 직접 입력해 주세요.</p>'; }
  }
  function drawTotals(rows) {
    const totals=rows.reduce((sum,row)=>{const n=row.nutrients||{};for(const k of ['kcal','protein','carbs','fat'])sum[k]+=Number(n[k]||0);return sum;},{kcal:0,protein:0,carbs:0,fat:0});
    $('dietKcal').textContent=Math.round(totals.kcal);$('dietProtein').textContent=totals.protein.toFixed(1);$('dietCarbs').textContent=totals.carbs.toFixed(1);$('dietFat').textContent=totals.fat.toFixed(1);
  }
  async function getRows() {
    const local=read().filter(row=>row.date===today());
    if(!cloudReady()) return local;
    try {
      const {data,error}=await session.client.from('diet_entries').select('*').eq('user_id',session.user.id).eq('entry_date',today()).order('created_at');
      if(error) throw error;
        return await Promise.all((data||[]).map(async row=>{
        let photoUrl=''; if(row.photo_path){const {data:signed}=await session.client.storage.from('diet-photos').createSignedUrl(row.photo_path,600);photoUrl=signed?.signedUrl||'';}
        return {id:row.id,date:row.entry_date,meal:row.meal,food:row.food_name,amount:row.amount_g,note:row.note,nutrients:row.nutrients||{},photoUrl,server:true,createdAt:new Date(row.created_at).getTime()};
      }));
    } catch { return local; }
  }
  async function render() {
    urls.forEach(url=>URL.revokeObjectURL(url));urls=[];
    const rows=await getRows(); drawTotals(rows);
    root.innerHTML=meals.map(meal=>{const list=rows.filter(r=>r.meal===meal);return `<section class="diet-meal"><div class="diet-meal-heading"><h3>${meal}</h3><button class="diet-add-meal" data-diet-open="${meal}" type="button">＋ 기록</button></div><div class="diet-entry-list">${list.length?list.map(row=>`<article class="diet-entry"><div class="diet-entry-main" data-photo-host="${escape(row.id)}">${row.photoUrl?`<img class="diet-entry-photo" src="${escape(row.photoUrl)}" alt="${escape(row.food)} 사진">`:foodIcon(row.food,'','diet-entry-icon')}<div class="diet-entry-copy"><strong>${escape(row.food||'식사 메모')}</strong>${row.amount?`<span>${Number.isFinite(Number(row.amount))?`${escape(row.amount)}g`:escape(row.amount)}</span>`:''}<span>열량 ${showNutrient(row.nutrients?.kcal,0)}kcal · 단백질 ${showNutrient(row.nutrients?.protein)}g</span>${row.note?`<p>${escape(row.note)}</p>`:''}${row.photoId&&!row.photoUrl?'<span>사진 포함</span>':''}</div></div><button class="diet-entry-remove" type="button" data-diet-remove="${escape(row.id)}" data-server="${row.server?'true':'false'}">삭제</button></article>`).join(''):'<p class="diet-empty">아직 기록이 없어요.</p>'}</div></section>`;}).join('');
    for(const row of rows.filter(item=>item.photoId&&!item.server)){try{const saved=await photoGet(row.photoId),host=root.querySelector(`[data-photo-host="${CSS.escape(row.id)}"]`);if(saved?.blob&&host){const img=document.createElement('img');img.className='diet-entry-photo';img.alt=`${row.food||'식단'} 사진`;img.src=URL.createObjectURL(saved.blob);urls.push(img.src);host.prepend(img);}}catch{}}
    $('dietStorageNote').textContent=cloudReady()?'식단 기록과 사진은 계정 서버에 저장됩니다. 운영자 권한 계정이 볼 수 있으며 트레이너에게는 자동 공유되지 않습니다.':session?'서버 저장 동의가 꺼져 있어 식단 기록과 사진은 이 브라우저에 저장됩니다.':'로그인 전에는 식단 기록과 사진이 이 브라우저에 저장됩니다.';
    $('dietDbStatus').textContent=foodSearchConfigured()?'공식 K-FIND 검색 결과를 고르면 기준량에 맞춰 영양 합계에 반영합니다. 직접 입력 음식은 합계에서 제외됩니다.':'공식 K-FIND 데이터 동기화와 검색 함수 배포 후 영양 합계가 활성화됩니다.';
    $('dietServerConsent').checked=consent().server;$('dietConsentBar').hidden=false;$('dietConsentBar').querySelector('strong').textContent=cloudReady()?'식단 데이터 저장 설정':'계정 서버 저장·사진 인식 설정';$('dietConsentBar').querySelector('p').textContent=cloudReady()?'서버 저장 동의 상태를 변경하거나 AI 사진 전송 동의를 설정할 수 있어요.':'서버 저장과 AI 사진 전송은 각각 별도 동의가 필요합니다.';$('dietConsentOpen').textContent=cloudReady()?'저장 동의 변경':'동의 설정';
  }
  function reset() { clearTimeout(searchTimer);searchSeq++;form.reset(); selectedPhoto=null;selectedFood=null;$('dietSearchResults').innerHTML='';$('dietSelectedFoods').innerHTML='';$('dietAiConsent').checked=consent().ai; if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';$('dietPhotoPreview').innerHTML='';$('dietPhotoPreview').hidden=true;refreshAnalyze(); }
  function openForm(meal) { reset();$('dietMeal').value=meals.includes(meal)?meal:'간식';backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false');$('dietFoodSearch').focus(); }
  function closeForm(){backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true');reset();}
  const preparePhoto = async file => { if(!window.createImageBitmap)return file; try{const bmp=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bmp.width,bmp.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close?.();return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82))||file;}catch{return file;} };
  document.addEventListener('click',async event=>{
    const open=event.target.closest('[data-diet-open]');if(open){openForm(open.dataset.dietOpen);return;}
    if(event.target.closest('#dietClose')||event.target.closest('#dietCancel')||event.target===backdrop){closeForm();return;}
    if(event.target.closest('#dietConsentOpen')){$('dietConsentBackdrop').classList.add('open');$('dietConsentBackdrop').setAttribute('aria-hidden','false');$('dietServerConsent').checked=consent().server;$('dietDeleteServer').hidden=!session;return;}
    if(event.target.closest('#dietConsentClose')||event.target.closest('#dietConsentClose2')||event.target===$('dietConsentBackdrop')){$('dietConsentBackdrop').classList.remove('open');$('dietConsentBackdrop').setAttribute('aria-hidden','true');return;}
    if(event.target.closest('#dietConsentSave')){
      const next={...consent(),server:$('dietServerConsent').checked};
      if(next.server&&!session){toast('서버 저장을 사용하려면 계정에 로그인해야 합니다.');return;}
      try{if(session){const consentRow={user_id:session.user.id,server_storage:next.server,ai_photo_analysis:next.ai,notice_version:'2026-11-04-v1',accepted_at:new Date().toISOString()};const {error}=await session.client.from('diet_consents').upsert(consentRow,{onConflict:'user_id'});if(error)throw error;const {error:eventError}=await session.client.from('diet_consent_events').insert(consentRow);if(eventError)throw eventError;}}
      catch{toast('동의 설정을 서버에 저장하지 못했습니다. 데이터베이스 설정을 확인해주세요.');return;}
      localStorage.setItem(CONSENT_KEY,JSON.stringify(next));$('dietConsentBackdrop').classList.remove('open');await render();toast(next.server?'서버 저장 동의를 적용했습니다.':'기기 저장으로 전환했습니다.');return;
    }
    if(event.target.closest('#dietDeleteServer')){if(!session||!window.confirm('서버에 저장된 식단 기록과 사진을 모두 삭제할까요? 삭제 후 복구할 수 없습니다.'))return;const button=$('dietDeleteServer');button.disabled=true;try{const {data,error}=await session.client.from('diet_entries').select('id,photo_path').eq('user_id',session.user.id);if(error)throw error;const paths=(data||[]).map(row=>row.photo_path).filter(Boolean);if(paths.length){const {error:photoError}=await session.client.storage.from('diet-photos').remove(paths);if(photoError)throw photoError;}if(data?.length){const {error:deleteError}=await session.client.from('diet_entries').delete().eq('user_id',session.user.id);if(deleteError)throw deleteError;}$('dietConsentBackdrop').classList.remove('open');await render();toast('서버 식단 기록과 사진을 삭제했습니다.');}catch{toast('서버 기록 삭제에 실패했습니다. 데이터베이스 설정을 확인해주세요.');}finally{button.disabled=false;}return;}
    const foodButton=event.target.closest('[data-food-index]');if(foodButton){const results=$('dietSearchResults'),foods=results._foods||[];selectedFood=foods[Number(foodButton.dataset.foodIndex)]||null;if(selectedFood){clearTimeout(searchTimer);searchSeq++;$('dietFoodSearch').value=selectedFood.name;$('dietFood').value=selectedFood.name;results.innerHTML='';results._foods=[];$('dietSelectedFoods').innerHTML=`<div class="diet-selected-chip">선택: ${escape(selectedFood.name)} · 100g 기준 영양정보 <button type="button" id="clearSelectedFood">변경</button></div>`;$('dietAmount').focus();}return;}
    if(event.target.closest('#clearSelectedFood')){selectedFood=null;$('dietFoodSearch').value='';$('dietFood').value='';$('dietSelectedFoods').innerHTML='';$('dietFoodSearch').focus();return;}
    const remove=event.target.closest('[data-diet-remove]');if(remove){try{if(remove.dataset.server==='true'&&cloudReady()){const {data:record}=await session.client.from('diet_entries').select('photo_path').eq('id',remove.dataset.dietRemove).eq('user_id',session.user.id).maybeSingle();if(record?.photo_path)await session.client.storage.from('diet-photos').remove([record.photo_path]);const {error}=await session.client.from('diet_entries').delete().eq('id',remove.dataset.dietRemove).eq('user_id',session.user.id);if(error)throw error;}else{const rows=read(),found=rows.find(r=>r.id===remove.dataset.dietRemove);write(rows.filter(r=>r.id!==remove.dataset.dietRemove));if(found?.photoId)await photoDel(found.photoId);}await render();toast('식단 기록을 삭제했습니다.');}catch{toast('기록을 삭제하지 못했습니다.');}}
  });
  $('dietFoodSearch').addEventListener('input',()=>{searchSeq++;if(selectedFood){selectedFood=null;$('dietFood').value='';$('dietSelectedFoods').innerHTML='';}clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchFoods($('dietFoodSearch').value),300);});
  $('dietPhoto').addEventListener('change',()=>{selectedPhoto=$('dietPhoto').files?.[0]||null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';$('dietPhotoPreview').innerHTML='';$('dietPhotoPreview').hidden=!selectedPhoto;if(!selectedPhoto){refreshAnalyze();return;}if(!selectedPhoto.type.startsWith('image/')){selectedPhoto=null;$('dietPhoto').value='';toast('이미지 파일만 선택할 수 있습니다.');refreshAnalyze();return;}previewUrl=URL.createObjectURL(selectedPhoto);const img=document.createElement('img');img.src=previewUrl;img.alt='선택한 식단 사진 미리보기';$('dietPhotoPreview').append(img);refreshAnalyze();});
  $('dietAiConsent').addEventListener('change',async()=>{const next={...consent(),ai:$('dietAiConsent').checked};try{if(session){const consentRow={user_id:session.user.id,server_storage:next.server,ai_photo_analysis:next.ai,notice_version:'2026-11-04-v1',accepted_at:new Date().toISOString()};const {error}=await session.client.from('diet_consents').upsert(consentRow,{onConflict:'user_id'});if(error)throw error;const {error:eventError}=await session.client.from('diet_consent_events').insert(consentRow);if(eventError)throw eventError;}localStorage.setItem(CONSENT_KEY,JSON.stringify(next));refreshAnalyze();if(next.ai)toast('AI 사진 전송 동의를 저장했습니다.');}catch{$('dietAiConsent').checked=false;toast('동의 상태를 서버에 저장하지 못했습니다. 로그인 및 DB 설정을 확인해주세요.');refreshAnalyze();}});
  $('dietAnalyze').addEventListener('click',async()=>{if(!aiConfigured()){toast('사진 인식은 서버에 OpenAI 설정을 마친 뒤 활성화됩니다.');return;}if(!selectedPhoto||!consent().ai||!session){toast('사진·AI 전송 동의·로그인이 필요합니다.');return;}const button=$('dietAnalyze');button.disabled=true;button.textContent='음식 추정 중…';try{const photo=await preparePhoto(selectedPhoto),dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(photo);});const {data,error}=await session.client.functions.invoke('diet-photo-analyze',{body:{image:dataUrl}});if(error)throw error;const foods=Array.isArray(data?.foods)?data.foods:[];if(foods.length){$('dietFood').value=foods.map(f=>f.name).join(', ');if(!$('dietAmount').value&&foods.length===1&&foods[0].amount_g)$('dietAmount').value=foods[0].amount_g;$('dietSelectedFoods').innerHTML=`<p class="diet-ai-result">AI 추정: ${foods.map(f=>`${escape(f.name)} ${Math.round(f.amount_g||0)}g`).join(' · ')} · 검토 후 검색 DB에서 음식을 골라주세요.</p>`;}else toast('사진에서 음식 후보를 찾지 못했습니다. 직접 입력해주세요.');}catch{toast('사진 분석을 사용할 수 없습니다. AI 서버 키와 배포 설정을 확인해주세요.');}finally{refreshAnalyze();}});
  form.addEventListener('submit',async event=>{event.preventDefault();const food=$('dietFood').value.trim(),amount=Number($('dietAmount').value)||0,note=$('dietNote').value.trim();if(!food&&!note&&!selectedPhoto){toast('음식 이름, 메모 또는 사진을 입력해주세요.');return;}const id=`meal-${crypto.randomUUID?.()||Date.now()}`,nutrients=selectedFood&&amount?Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[k,selectedFood[k]===null||selectedFood[k]===undefined?null:Number(selectedFood[k])*amount/100])):{};const row={id,date:today(),meal:$('dietMeal').value,food,amount,note,nutrients,foodCode:selectedFood?.code||null,source:selectedFood?.source||null,photoId:null,createdAt:Date.now()};
    try{
      if(cloudReady()){
        let photoPath=null;if(selectedPhoto){const blob=await preparePhoto(selectedPhoto);photoPath=`${session.user.id}/${today()}/${id}.jpg`;const {error:uploadError}=await session.client.storage.from('diet-photos').upload(photoPath,blob,{contentType:blob.type||'image/jpeg',upsert:false});if(uploadError)throw uploadError;}
        const {error}=await session.client.from('diet_entries').insert({id,user_id:session.user.id,entry_date:row.date,meal:row.meal,food_name:row.food,amount_g:row.amount||null,note:row.note||null,food_code:row.foodCode,source_name:row.source,nutrients:row.nutrients,photo_path:photoPath});if(error){if(photoPath)await session.client.storage.from('diet-photos').remove([photoPath]);throw error;}
      }else{if(selectedPhoto){row.photoId=`photo-${id}`;await photoPut(row.photoId,await preparePhoto(selectedPhoto));}write([...read(),row]);}
      closeForm();await render();toast(cloudReady()?'식단 기록과 사진을 서버에 저장했습니다.':'식단 기록을 이 기기에 저장했습니다.');
    }catch{toast('저장에 실패했습니다. 연결 또는 서버 설정을 확인해주세요.');}
  });
  window.addEventListener('refit:session-ready',async event=>{session=window.RefitAccountSession||event.detail||null;if(session?.client){try{const {data}=await session.client.from('diet_consents').select('*').eq('user_id',session.user.id).maybeSingle();const c={server:data?.server_storage===true,ai:data?.ai_photo_analysis===true};localStorage.setItem(CONSENT_KEY,JSON.stringify(c));}catch{} }render();});
  window.addEventListener('refit:session-ended',()=>{session=null;localStorage.setItem(CONSENT_KEY,'{"server":false,"ai":false}');render();});
  if(window.RefitAccountSession){session=window.RefitAccountSession;render();}
  window.RefitDietJournal={clearLocal:async()=>{try{const rows=read();write([]);localStorage.removeItem('pacefitDietJournalV1');for(const row of rows)if(row.photoId)await photoDel(row.photoId);}catch{localStorage.removeItem(STORE_KEY);localStorage.removeItem('pacefitDietJournalV1');}}};
  render();
})();
