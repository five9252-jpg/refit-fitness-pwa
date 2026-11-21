(() => {
  'use strict';
  const STORE_KEY = 'pacefitDietJournalV2';
  const DB_NAME = 'pacefitDietMediaV1';
  const DB_STORE = 'photos';
  const CONSENT_KEY = 'pacefitDietConsentV1';
  const NUTRITION_GOAL_KEY = 'pacefitNutritionGoalV1';
  const nutritionGoalKey = () => `${NUTRITION_GOAL_KEY}:${window.RefitAccountSession?.user?.id||'local'}`;
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
  const owner = () => session?.user?.id || 'guest';
  const scopedKey = (key,id=owner()) => `${key}:${id}`;
  const snapshot = () => ({id:owner(),epoch:sessionEpoch,client:session?.client});
  const current = context => context.id===owner() && context.epoch===sessionEpoch;
  const assertCurrent = context => {if(!current(context))throw new Error('계정이 변경되어 작업을 중단했습니다.');};
  // Legacy unowned records are preserved, never silently assigned to a signed-in account.
  const read = (id=owner()) => {try{const rows=JSON.parse(localStorage.getItem(scopedKey(STORE_KEY,id))||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}};
  const write = (rows,id=owner()) => localStorage.setItem(scopedKey(STORE_KEY,id), JSON.stringify(rows));
  const openDb = () => new Promise((resolve,reject) => { const request=indexedDB.open(DB_NAME,1); request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(DB_STORE))request.result.createObjectStore(DB_STORE,{keyPath:'id'});}; request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); });
  const media = async (mode, fn) => { const db=await openDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,mode), req=fn(tx.objectStore(DB_STORE)); let result;req.onsuccess=()=>{result=req.result;};req.onerror=()=>reject(req.error);tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||new Error('사진 저장 실패'));}; }); };
  const photoPut = (id,blob,account=owner()) => media('readwrite',s=>s.put({id:scopedKey(id,account),blob}));
  const photoGet = (id,account=owner()) => media('readonly',s=>s.get(scopedKey(id,account)));
  const photoDel = (id,account=owner()) => media('readwrite',s=>s.delete(scopedKey(id,account)));
  const consent = () => {if(consentPending)return {server:false,ai:false};try{return JSON.parse(localStorage.getItem(scopedKey(CONSENT_KEY))||'{"server":false,"ai":false}');}catch{return {server:false,ai:false};}};
  let session = null, sessionEpoch=0, consentPending=false, submitting=false, renderSeq=0, selectedPhoto = null, selectedFood = null, draftFoods = [], searchTimer, searchSeq = 0, previewUrl = '', urls = [],lastLoadError='';
  function renderDraftFoods(){
    $('dietDraftFoods').innerHTML=draftFoods.length?`<strong>한 끼 음식 ${draftFoods.length}개</strong>${draftFoods.map((item,i)=>`<div class="diet-draft-item"><span>${escape(item.name)} · ${item.amount}g${item.nutrients.kcal!=null?` · ${Math.round(item.nutrients.kcal)}kcal`:' · 영양정보 없음'}</span><button type="button" data-draft-remove="${i}" aria-label="${escape(item.name)} 제거">삭제</button></div>`).join('')}`:'<p class="diet-empty">음식을 추가하면 여기에 모입니다.</p>';
  }
  function entryItems(row){
    const items=Array.isArray(row.nutrients?.items)?row.nutrients.items:[];
    if(!items.length)return '';
    return `<ul class="diet-entry-items">${items.map(item=>`<li>${escape(item.name)} · ${escape(item.amount)}g${item.nutrients?.kcal!=null?` · ${Math.round(item.nutrients.kcal)}kcal`:' · 영양정보 없음'}</li>`).join('')}</ul>`;
  }
  function addDraftFood(){
    if(draftFoods.length>=12){toast('한 끼에 최대 12개 음식까지 추가할 수 있어요.');return false;}
    const name=$('dietFood').value.trim(),raw=$('dietAmount').value,amount=Number(raw);
    if(!name){toast('음식 이름을 입력하거나 검색 결과를 선택해 주세요.');return false;}
    if(!raw||!Number.isFinite(amount)||amount<=0||amount>10000){toast('먹은 양을 1~10000g 사이로 입력해 주세요.');return false;}
    const nutrients=selectedFood?Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[k,selectedFood[k]==null?null:Number(selectedFood[k])*amount/100])):{};
    draftFoods.push({name,amount,code:selectedFood?.code||null,source:selectedFood?.source||null,nutrients});
    selectedFood=null;$('dietFood').value='';$('dietAmount').value='';$('dietFoodSearch').value='';$('dietSearchResults').innerHTML='';$('dietSelectedFoods').innerHTML='';renderDraftFoods();$('dietFoodSearch').focus();return true;
  }
  const aiConfigured = () => window.REFIT_CONFIG?.features?.dietPhotoAnalysisEnabled === true;
  const foodSearchConfigured = () => window.REFIT_CONFIG?.features?.dietFoodSearchEnabled === true;
  const refreshAnalyze = () => {
    const button=$('dietAnalyze'),status=$('dietAnalyzeStatus');
    button.disabled=!(aiConfigured()&&consent().ai&&selectedPhoto&&session);
    button.textContent=aiConfigured()?'사진에서 음식 추정':'사진 자동 분석 사용 불가';
    if(status) status.textContent=aiConfigured()?'사진·전송 동의를 확인한 뒤 음식 종류와 분량을 추정합니다. 결과를 수정하고 공식 영양 DB 항목을 선택한 뒤 저장하세요.':'사진 자동 분석은 준비 중입니다. 사진 첨부와 음식 검색·직접 입력은 사용할 수 있어요. 사진만으로 칼로리는 입력되지 않습니다.';
  };
  const toast = message => { let el=$('dietToast'); if(!el){el=document.createElement('div');el.id='dietToast';el.className='diet-toast';el.setAttribute('role','status');document.body.append(el);} el.textContent=message;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),2600); };
  const cloudReady = () => !!(session?.client && session?.user && consent().server);
  async function searchFoods(query) {
    const requestId = ++searchSeq, context=snapshot();
    const results=$('dietSearchResults'); if(!query.trim()) { results.innerHTML=''; return; }
    if(!foodSearchConfigured()){results.innerHTML='<p class="diet-empty">공식 K-FIND DB와 검색 함수를 서버에 설정한 뒤 이용할 수 있어요. 음식명을 직접 입력할 수 있습니다.</p>';return;}
    if(!session?.client) { results.innerHTML='<p class="diet-empty">공식 영양 DB 검색은 로그인 후 서버 설정이 완료되면 사용할 수 있어요. 음식명을 직접 입력해 기록할 수 있습니다.</p>'; return; }
    results.innerHTML='<p class="diet-empty">공식 식품 DB 검색 중…</p>';
    try {
      const {data,error}=await session.client.functions.invoke('diet-food-search',{body:{query:query.trim()}});
      if (requestId !== searchSeq || !current(context)) return;
      if(error) throw error;
      const foods=Array.isArray(data?.foods)?data.foods:[];
      results.innerHTML=foods.length?foods.map((f,i)=>`<button type="button" class="diet-search-result" data-food-index="${i}">${foodIcon(f.name,f.group)}<span class="diet-search-result-copy"><strong>${escape(f.name)}</strong><small>${escape(f.source || 'K-FIND')} · 100g ${showNutrient(f.kcal,0)}kcal · P ${showNutrient(f.protein)}g · C ${showNutrient(f.carbs)}g · F ${showNutrient(f.fat)}g</small></span></button>`).join(''):'<p class="diet-empty">검색 결과가 없습니다. 직접 입력해 기록할 수 있어요.</p>';
      results._foods=foods;
    } catch { if (requestId === searchSeq && current(context)) results.innerHTML='<p class="diet-empty">식품 DB를 아직 사용할 수 없습니다. 관리자 설정 후 이용하거나 음식명을 직접 입력해 주세요.</p>'; }
  }
  function drawTotals(rows) {
    const incomplete=rows.some(row=>['kcal','protein','carbs','fat'].some(key=>row.nutrients?.[key]==null));
    const totals=rows.reduce((sum,row)=>{const n=row.nutrients||{};for(const k of ['kcal','protein','carbs','fat'])sum[k]+=Number(n[k]||0);return sum;},{kcal:0,protein:0,carbs:0,fat:0});
    $('dietKcal').textContent=incomplete?'—':Math.round(totals.kcal);$('dietProtein').textContent=incomplete?'—':totals.protein.toFixed(1);$('dietCarbs').textContent=incomplete?'—':totals.carbs.toFixed(1);$('dietFat').textContent=incomplete?'—':totals.fat.toFixed(1);
    document.querySelectorAll('[data-nutrient-progress]').forEach(node=>{
      const key=node.dataset.nutrientProgress,target=Number(node.dataset.target)||0,value=totals[key]||0;
      const percent=target>0?Math.round(value/target*100):0;
      node.querySelector('span').textContent=incomplete?'영양정보 없는 음식 포함 · 합계 미표시':target>0?`목표 ${Math.round(target)}${key==='kcal'?'kcal':'g'} · ${percent}%`:'목표 미설정';
      node.querySelector('i').style.width=incomplete?'0%':`${Math.min(100,Math.max(0,percent))}%`;
    });
  }
  function renderTargets() {
    const goal=$('nutritionGoal'),target=goalTargets();
    const root=$('nutritionTargetCards'),intro=$('nutritionTargetIntro');
    if(!target){intro.textContent='프로필에 기초대사량과 체중을 입력하면 계산할 수 있어요.';root.innerHTML='<p class="diet-empty">프로필 설정에서 기초대사량·체중을 입력해 주세요.</p>';document.querySelectorAll('[data-nutrient-progress]').forEach(node=>{node.dataset.target=0;node.querySelector('span').textContent='목표 미설정';node.querySelector('i').style.width='0%';});return;}
    goal.value=target.mode;
    intro.textContent='선택한 식단 목표의 참고 열량입니다.';
    root.innerHTML='<article class="nutrition-target-card selected"><strong>'+escape(target.label)+' 목표</strong><b>'+target.kcal.toLocaleString()+'<small>kcal/일</small></b></article><details class="nutrition-target-reason"><summary>계산 기준·자료 날짜 보기</summary><p>'+escape(target.reason)+'</p>'+(target.trend?.message?'<p>'+escape(target.trend.message)+'</p>':'')+'</details>';
    document.querySelectorAll('[data-nutrient-progress]').forEach(node=>{const key=node.dataset.nutrientProgress,amount=target[key],value=Number($('diet'+({kcal:'Kcal',protein:'Protein',carbs:'Carbs',fat:'Fat'}[key])).textContent)||0,percent=Math.round(value/amount*100);node.dataset.target=amount;node.querySelector('span').textContent='목표 '+amount+(key==='kcal'?'kcal':'g')+' · '+percent+'%';node.querySelector('i').style.width=Math.min(100,Math.max(0,percent))+'%';});
  }
  async function getRows() {
    const context=snapshot();lastLoadError='';
    const local=read().filter(row=>row.date===today());
    if(!cloudReady()) return local;
    try {
      const {data,error}=await context.client.from('diet_entries').select('*').eq('user_id',context.id).eq('entry_date',today()).order('created_at');
      assertCurrent(context);if(error) throw error;
        return await Promise.all((data||[]).map(async row=>{
        let photoUrl=''; if(row.photo_path){const {data:signed}=await context.client.storage.from('diet-photos').createSignedUrl(row.photo_path,600);assertCurrent(context);photoUrl=signed?.signedUrl||'';}
        return {id:row.id,date:row.entry_date,meal:row.meal,food:row.food_name,amount:row.amount_g,note:row.note,nutrients:row.nutrients||{},photoUrl,server:true,createdAt:new Date(row.created_at).getTime()};
      }));
    } catch(error) { if(!current(context))return [];lastLoadError=String(error?.message||'서버 연결 오류'); return local; }
  }
  async function render() {
    const context=snapshot(),ticket=++renderSeq;
    urls.forEach(url=>URL.revokeObjectURL(url));urls=[];
    const rows=await getRows();if(!current(context)||ticket!==renderSeq)return;renderTargets(); drawTotals(rows);
    root.innerHTML=meals.map(meal=>{const list=rows.filter(r=>r.meal===meal);return `<section class="diet-meal"><div class="diet-meal-heading"><h3>${meal}</h3><button class="diet-add-meal" data-diet-open="${meal}" type="button">＋ 기록</button></div><div class="diet-entry-list">${list.length?list.map(row=>`<article class="diet-entry"><div class="diet-entry-main" data-photo-host="${escape(row.id)}">${row.photoUrl?`<img class="diet-entry-photo" src="${escape(row.photoUrl)}" alt="${escape(row.food)} 사진">`:foodIcon(row.food,'','diet-entry-icon')}<div class="diet-entry-copy"><strong>${escape(row.food||'식사 메모')}</strong>${row.amount?`<span>${Number.isFinite(Number(row.amount))?`${escape(row.amount)}g`:escape(row.amount)}</span>`:''}<span>열량 ${showNutrient(row.nutrients?.kcal,0)}kcal · 단백질 ${showNutrient(row.nutrients?.protein)}g</span>${entryItems(row)}${row.note?`<p>${escape(row.note)}</p>`:''}${row.photoId&&!row.photoUrl?'<span>사진 포함</span>':''}</div></div><button class="diet-entry-remove" type="button" data-diet-remove="${escape(row.id)}" data-server="${row.server?'true':'false'}">삭제</button></article>`).join(''):'<p class="diet-empty">아직 기록이 없어요.</p>'}</div></section>`;}).join('');
    for(const row of rows.filter(item=>item.photoId&&!item.server)){try{const saved=await photoGet(row.photoId,context.id);if(!current(context)||ticket!==renderSeq)return;const host=root.querySelector(`[data-photo-host="${CSS.escape(row.id)}"]`);if(saved?.blob&&host){const img=document.createElement('img');img.className='diet-entry-photo';img.alt=`${row.food||'식단'} 사진`;img.src=URL.createObjectURL(saved.blob);urls.push(img.src);host.prepend(img);}}catch{}}
    if(!current(context)||ticket!==renderSeq)return;
    $('dietStorageNote').textContent=lastLoadError?`서버 식단 기록을 불러오지 못했습니다: ${lastLoadError}`:cloudReady()?'식단 기록과 사진은 계정 서버에 저장됩니다. 오늘 기록을 보여줍니다. 연결된 트레이너에게는 별도 공유 설정을 켠 경우에만 표시됩니다.':session?'서버 저장 동의가 꺼져 있어 식단 기록과 사진은 이 브라우저에 저장됩니다.':'로그인 전에는 식단 기록과 사진이 이 브라우저에 저장됩니다.';
    $('dietDbStatus').textContent=foodSearchConfigured()?'공식 K-FIND 검색 결과를 고르면 기준량에 맞춰 영양 합계에 반영합니다. 직접 입력 음식은 합계에서 제외됩니다.':'공식 K-FIND 데이터 동기화와 검색 함수 배포 후 영양 합계가 활성화됩니다.';
    $('dietServerConsent').checked=consent().server;
  }
  function reset() { clearTimeout(searchTimer);searchSeq++;form.reset(); selectedPhoto=null;selectedFood=null;draftFoods=[];$('dietSearchResults').innerHTML='';$('dietSelectedFoods').innerHTML='';renderDraftFoods();$('dietAiConsent').checked=consent().ai; if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';$('dietPhotoPreview').innerHTML='';$('dietPhotoPreview').hidden=true;refreshAnalyze(); }
  function openForm(meal) { reset();$('dietMeal').value=meals.includes(meal)?meal:'간식';backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false');$('dietFoodSearch').focus(); }
  function closeForm(){backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true');reset();}
  const preparePhoto = async file => { if(!window.createImageBitmap)return file; try{const bmp=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bmp.width,bmp.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close?.();return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82))||file;}catch{return file;} };
  document.addEventListener('click',async event=>{
    const context=snapshot();if(consentPending&&event.target.closest('#dietConsentSave,#dietDeleteServer,[data-diet-remove]')){toast('계정 설정 확인 중입니다. 잠시 기다려 주세요.');return;}
    const open=event.target.closest('[data-diet-open]');if(open){openForm(open.dataset.dietOpen);return;}
    if(event.target.closest('#dietClose')||event.target.closest('#dietCancel')||event.target===backdrop){closeForm();return;}
      if(event.target.closest('#dietConsentOpen')){openConsentSettings();return;}
    if(event.target.closest('#dietConsentClose')||event.target.closest('#dietConsentClose2')||event.target===$('dietConsentBackdrop')){$('dietConsentBackdrop').classList.remove('open');$('dietConsentBackdrop').setAttribute('aria-hidden','true');return;}
    if(event.target.closest('#dietConsentSave')){
      const next={...consent(),server:$('dietServerConsent').checked,trainerShare:$('dietTrainerShare').checked};
      if(next.trainerShare&&!next.server){toast('트레이너 공유에는 식단 서버 저장 동의가 필요합니다.');$('dietTrainerShare').checked=false;return;}
      if(next.server&&!session){toast('서버 저장을 사용하려면 계정에 로그인해야 합니다.');return;}
      try{if(session){const consentRow={user_id:context.id,server_storage:next.server,ai_photo_analysis:next.ai,share_with_trainer:next.trainerShare,notice_version:'2026-11-13-v1',accepted_at:new Date().toISOString()};const {error}=await context.client.from('diet_consents').upsert(consentRow,{onConflict:'user_id'});assertCurrent(context);if(error)throw error;const {error:eventError}=await context.client.from('diet_consent_events').insert(consentRow);assertCurrent(context);if(eventError)throw eventError;}}
      catch{toast('동의 설정을 서버에 저장하지 못했습니다. 데이터베이스 설정을 확인해주세요.');return;}
      assertCurrent(context);localStorage.setItem(scopedKey(CONSENT_KEY,context.id),JSON.stringify(next));$('dietConsentBackdrop').classList.remove('open');assertCurrent(context);await render();if(current(context))toast(next.server?'서버 저장 동의를 적용했습니다.':'기기 저장으로 전환했습니다.');return;
    }
    if(event.target.closest('#dietDeleteServer')){if(!session||!window.confirm('서버에 저장된 식단 기록과 사진을 모두 삭제할까요? 삭제 후 복구할 수 없습니다.'))return;const button=$('dietDeleteServer');button.disabled=true;try{const {data,error}=await context.client.from('diet_entries').select('id,photo_path').eq('user_id',context.id);assertCurrent(context);if(error)throw error;const paths=(data||[]).map(row=>row.photo_path).filter(Boolean);if(paths.length){const {error:photoError}=await context.client.storage.from('diet-photos').remove(paths);assertCurrent(context);if(photoError)throw photoError;}if(data?.length){const {error:deleteError}=await context.client.from('diet_entries').delete().eq('user_id',context.id);assertCurrent(context);if(deleteError)throw deleteError;}$('dietConsentBackdrop').classList.remove('open');assertCurrent(context);await render();if(current(context))toast('서버 식단 기록과 사진을 삭제했습니다.');}catch{toast('서버 기록 삭제에 실패했습니다. 데이터베이스 설정을 확인해주세요.');}finally{button.disabled=false;}return;}
    const foodButton=event.target.closest('[data-food-index]');if(foodButton){const results=$('dietSearchResults'),foods=results._foods||[];selectedFood=foods[Number(foodButton.dataset.foodIndex)]||null;if(selectedFood){clearTimeout(searchTimer);searchSeq++;$('dietFoodSearch').value=selectedFood.name;$('dietFood').value=selectedFood.name;results.innerHTML='';results._foods=[];$('dietSelectedFoods').innerHTML=`<div class="diet-selected-chip">선택: ${escape(selectedFood.name)} · 100g 기준 영양정보 <button type="button" id="clearSelectedFood">변경</button></div>`;$('dietAmount').focus();}return;}
    if(event.target.closest('#clearSelectedFood')){selectedFood=null;$('dietFoodSearch').value='';$('dietFood').value='';$('dietSelectedFoods').innerHTML='';$('dietFoodSearch').focus();return;}
    if(event.target.closest('#dietAddFood')){addDraftFood();return;}
    const draftRemove=event.target.closest('[data-draft-remove]');if(draftRemove){draftFoods.splice(Number(draftRemove.dataset.draftRemove),1);renderDraftFoods();return;}
    const remove=event.target.closest('[data-diet-remove]');if(remove){try{if(remove.dataset.server==='true'&&cloudReady()){const {data:record}=await context.client.from('diet_entries').select('photo_path').eq('id',remove.dataset.dietRemove).eq('user_id',context.id).maybeSingle();assertCurrent(context);if(record?.photo_path)await context.client.storage.from('diet-photos').remove([record.photo_path]);assertCurrent(context);const {error}=await context.client.from('diet_entries').delete().eq('id',remove.dataset.dietRemove).eq('user_id',context.id);assertCurrent(context);if(error)throw error;}else{const rows=read(),found=rows.find(r=>r.id===remove.dataset.dietRemove);write(rows.filter(r=>r.id!==remove.dataset.dietRemove));if(found?.photoId)await photoDel(found.photoId);}assertCurrent(context);await render();if(current(context))toast('식단 기록을 삭제했습니다.');}catch{toast('기록을 삭제하지 못했습니다.');}}
  });
  $('dietFoodSearch').addEventListener('input',()=>{searchSeq++;if(selectedFood){selectedFood=null;$('dietFood').value='';$('dietSelectedFoods').innerHTML='';}clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchFoods($('dietFoodSearch').value),300);});
  $('dietFood').addEventListener('input',()=>{if(selectedFood&&$('dietFood').value.trim()!==selectedFood.name){selectedFood=null;$('dietSelectedFoods').innerHTML='';}});
  $('dietPhoto').addEventListener('change',()=>{selectedPhoto=$('dietPhoto').files?.[0]||null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';$('dietPhotoPreview').innerHTML='';$('dietPhotoPreview').hidden=!selectedPhoto;if(!selectedPhoto){refreshAnalyze();return;}if(!selectedPhoto.type.startsWith('image/')){selectedPhoto=null;$('dietPhoto').value='';toast('이미지 파일만 선택할 수 있습니다.');refreshAnalyze();return;}previewUrl=URL.createObjectURL(selectedPhoto);const img=document.createElement('img');img.src=previewUrl;img.alt='선택한 식단 사진 미리보기';$('dietPhotoPreview').append(img);refreshAnalyze();});
  $('dietAiConsent').addEventListener('change',async()=>{const context=snapshot();if(consentPending){toast('계정 설정 확인 중입니다. 잠시 기다려 주세요.');return;}const next={...consent(),ai:$('dietAiConsent').checked};try{if(session){const consentRow={user_id:context.id,server_storage:next.server,ai_photo_analysis:next.ai,share_with_trainer:next.trainerShare===true,notice_version:'2026-11-13-v1',accepted_at:new Date().toISOString()};const {error}=await context.client.from('diet_consents').upsert(consentRow,{onConflict:'user_id'});assertCurrent(context);if(error)throw error;const {error:eventError}=await context.client.from('diet_consent_events').insert(consentRow);assertCurrent(context);if(eventError)throw eventError;}assertCurrent(context);localStorage.setItem(scopedKey(CONSENT_KEY,context.id),JSON.stringify(next));refreshAnalyze();if(next.ai)toast('AI 사진 전송 동의를 저장했습니다.');}catch{if(!current(context))return;$('dietAiConsent').checked=false;toast('동의 상태를 서버에 저장하지 못했습니다. 로그인 및 DB 설정을 확인해주세요.');refreshAnalyze();}});
  $('dietAnalyze').addEventListener('click',async()=>{const context=snapshot();if(consentPending){toast('계정 설정 확인 중입니다. 잠시 기다려 주세요.');return;}if(!aiConfigured()){toast('사진 분석은 현재 준비 중입니다. 음식 검색이나 직접 입력을 이용해 주세요.');return;}if(!selectedPhoto||!consent().ai||!session){toast('사진·AI 전송 동의·로그인이 필요합니다.');return;}const button=$('dietAnalyze');button.disabled=true;button.textContent='음식 추정 중…';try{const photo=await preparePhoto(selectedPhoto),dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(photo);});assertCurrent(context);const {data,error}=await context.client.functions.invoke('diet-photo-analyze',{body:{image:dataUrl}});assertCurrent(context);if(error)throw error;const foods=Array.isArray(data?.foods)?data.foods:[];if(foods.length){if(foods.length===1){$('dietFood').value=foods[0].name;if(!$('dietAmount').value&&foods[0].amount_g)$('dietAmount').value=foods[0].amount_g;}$('dietSelectedFoods').innerHTML=`<p class="diet-ai-result">사진 추정 후보: ${foods.map(f=>`${escape(f.name)} 약 ${Math.round(f.amount_g||0)}g`).join(' · ')}. 실제 먹은 음식과 양을 확인·수정하고, 공식 영양 DB에서 항목을 선택해 주세요. 사진만으로 칼로리는 확정되지 않습니다.</p>`;}else toast('사진에서 음식 후보를 찾지 못했습니다. 직접 입력해주세요.');}catch{if(!current(context))return;toast('사진 분석을 사용할 수 없습니다. 서버 설정을 확인해주세요.');}finally{refreshAnalyze();}});
  form.addEventListener('submit',async event=>{event.preventDefault();if(submitting||consentPending){toast('저장 또는 계정 설정 확인 중입니다. 잠시 기다려 주세요.');return;}const context=snapshot(),photo=selectedPhoto,saveToCloud=cloudReady();if($('dietFood').value.trim()&&!addDraftFood())return;const note=$('dietNote').value.trim();if(!draftFoods.length&&!note&&!selectedPhoto){toast('음식을 추가하거나 메모·사진을 입력해 주세요.');return;}const id=`meal-${crypto.randomUUID?.()||Date.now()}`,food=draftFoods.map(item=>item.name).join(' · '),nutrients={items:draftFoods.map(item=>({...item}))};for(const key of ['kcal','protein','carbs','fat']){const known=draftFoods.filter(item=>item.nutrients[key]!=null);if(known.length===draftFoods.length&&known.length)nutrients[key]=known.reduce((sum,item)=>sum+Number(item.nutrients[key]),0);}const row={id,date:today(),meal:$('dietMeal').value,food,amount:null,note,nutrients,foodCode:null,source:null,photoId:null,createdAt:Date.now()};
    submitting=true;try{
      if(saveToCloud){
        let photoPath=null;if(photo){const blob=await preparePhoto(photo);assertCurrent(context);photoPath=`${context.id}/${today()}/${id}.jpg`;const {error:uploadError}=await context.client.storage.from('diet-photos').upload(photoPath,blob,{contentType:blob.type||'image/jpeg',upsert:false});assertCurrent(context);if(uploadError)throw uploadError;}
        assertCurrent(context);const {error}=await context.client.from('diet_entries').insert({id,user_id:context.id,entry_date:row.date,meal:row.meal,food_name:row.food,amount_g:row.amount||null,note:row.note||null,food_code:row.foodCode,source_name:row.source,nutrients:row.nutrients,photo_path:photoPath});assertCurrent(context);if(error){if(photoPath)await context.client.storage.from('diet-photos').remove([photoPath]);throw error;}
      }else{if(photo){row.photoId=`photo-${id}`;const blob=await preparePhoto(photo);assertCurrent(context);await photoPut(row.photoId,blob,context.id);assertCurrent(context);}assertCurrent(context);write([...read(context.id),row],context.id);}
      assertCurrent(context);closeForm();await render();window.dispatchEvent(new Event('pacefit:diet-updated'));if(current(context))toast(saveToCloud?'식단 기록과 사진을 서버에 저장했습니다.':'식단 기록을 이 기기에 저장했습니다.');
    }catch(error){if(current(context))toast(`식단 저장에 실패했습니다: ${String(error?.message||'연결 또는 서버 설정 오류').slice(0,180)}`);}finally{submitting=false;}
  });
  $('nutritionGoal').addEventListener('change',()=>{localStorage.setItem(nutritionGoalKey(),$('nutritionGoal').value);renderTargets();});
  window.addEventListener('refit:state-updated',renderTargets);
  async function changeSession(next){
    session=next;sessionEpoch++;renderSeq++;searchSeq++;consentPending=!!session?.client;
    closeForm();$('dietConsentBackdrop').classList.remove('open');$('dietConsentBackdrop').setAttribute('aria-hidden','true');$('dietServerConsent').checked=false;$('dietTrainerShare').checked=false;root.innerHTML='';drawTotals([]);const context=snapshot();
    if(context.client){
      localStorage.setItem(scopedKey(CONSENT_KEY,context.id),JSON.stringify({server:false,ai:false,trainerShare:false}));
      try{const {data,error}=await context.client.from('diet_consents').select('*').eq('user_id',context.id).maybeSingle();if(!current(context))return;if(error)throw error;
        localStorage.setItem(scopedKey(CONSENT_KEY,context.id),JSON.stringify({server:data?.server_storage===true,ai:data?.ai_photo_analysis===true,trainerShare:data?.share_with_trainer===true}));
      }catch{if(current(context))toast('식단 저장 동의를 확인하지 못했습니다. 설정을 다시 확인해 주세요.');}
    }
    if(!current(context))return;consentPending=false;refreshAnalyze();await render();if(current(context))window.dispatchEvent(new Event('pacefit:diet-updated'));
  }
  window.addEventListener('refit:session-ready',event=>changeSession(window.RefitAccountSession||event.detail||null));
  window.addEventListener('refit:session-ended',()=>changeSession(null));
  if(window.RefitAccountSession)changeSession(window.RefitAccountSession);
  async function history(from,to){
    const context=snapshot();if(consentPending)return [];
    if(cloudReady()){
      const {data,error}=await context.client.from('diet_entries').select('entry_date,meal,food_name,nutrients').eq('user_id',context.id).gte('entry_date',from).lte('entry_date',to).order('entry_date');
      assertCurrent(context);if(error)throw error;
      return (data||[]).map(row=>({date:row.entry_date,meal:row.meal,food:row.food_name,nutrients:row.nutrients||{}}));
    }
    return read().filter(row=>row.date>=from&&row.date<=to);
  }
  function goalTargets(){
    const state=window.RefitAccountBridge?.getState?.()||{};
    const saved=localStorage.getItem(nutritionGoalKey());
    const mode=['loss','maintain','gain'].includes(saved)?saved:undefined;
    return window.PacefitNutrition?.targets(state.profile||{},mode,state.bodyMetricsV1||[],{today:today()})||null;
  }
  function openConsentSettings(){
    const dialog=$('dietConsentBackdrop');
    if(dialog.parentElement!==document.body)document.body.appendChild(dialog);
    dialog.classList.add('open');dialog.setAttribute('aria-hidden','false');
    $('dietServerConsent').checked=consent().server;
    $('dietTrainerShare').checked=consent().trainerShare===true;
    $('dietDeleteServer').hidden=!session;
    $('dietConsentClose').focus({preventScroll:true});
  }
  window.RefitDietJournal={history,goalTargets,openConsentSettings,clearLocal:async()=>{const context=snapshot(),rows=read(context.id);write([],context.id);for(const row of rows)if(row.photoId)await photoDel(row.photoId,context.id);}};
  window.dispatchEvent(new Event('pacefit:diet-updated'));
  render();renderTargets();
})();


