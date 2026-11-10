(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const list = value => Array.isArray(value) ? value : [];
  const formatDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ko-KR'); };
  const panel = document.createElement('div');
  panel.className = 'operator-overlay';
  panel.hidden = true;
  document.body.appendChild(panel);
  const style = document.createElement('style');
  style.textContent = `.operator-overlay{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:16px;background:#14251bbd}.operator-overlay[hidden]{display:none}.operator-panel{width:min(1100px,100%);max-height:calc(100dvh - 32px);overflow:auto;border-radius:22px;background:#fff;padding:24px;color:#203126;box-shadow:0 30px 90px #10251955}.operator-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.operator-head h2{margin:5px 0;font-size:24px}.operator-head p,.operator-note{font-size:12px;color:#68766b;line-height:1.55}.operator-button{border:1px solid #d8e4d7;border-radius:10px;background:#fff;padding:9px 13px;color:#315b43;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.operator-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.operator-stat{border:1px solid #e3e9e0;border-radius:14px;background:#f7faf5;padding:15px}.operator-stat span{display:block;font-size:11px;color:#68776b}.operator-stat strong{display:block;margin-top:5px;font-size:24px;color:#244c36}.operator-search{display:block;width:100%;max-width:440px;border:1px solid #d8e2d6;border-radius:11px;padding:11px 13px;font:inherit;font-size:13px}.operator-members{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}.operator-member{display:block;width:100%;border:1px solid #e1e8df;border-radius:13px;background:#fff;padding:14px;text-align:left;cursor:pointer}.operator-member:hover{border-color:#a9c8ae}.operator-member strong,.operator-member small{display:block}.operator-member small{margin-top:5px;color:#718075;font-size:11px}.operator-pager{display:flex;justify-content:space-between;align-items:center;gap:9px;margin:15px 0}.operator-record{padding:12px 0;border-top:1px solid #e6ebe5;font-size:12px;line-height:1.55}.operator-record h4{margin:0 0 5px;font-size:13px}.operator-record p{margin:4px 0;color:#566759}.operator-section{margin-top:18px;padding:15px;border:1px solid #e3e9e0;border-radius:14px;background:#fafcf9}.operator-section h3{margin:0 0 10px;font-size:16px}.operator-error{padding:12px;border-radius:10px;background:#fff0ed;color:#9c3a31;font-size:12px}@media(max-width:640px){.operator-panel{padding:17px}.operator-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.operator-members{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
  let client = null, userId = null, page = 0, total = 0, rows = [], foodImportStart = 1;
  const pageSize = 50;
  const close = () => { panel.hidden = true; panel.innerHTML = ''; };
  const message = error => esc(error?.message || '서버 데이터를 불러오지 못했어요.');
  const checked = result => { if (result.error) throw result.error; return result; };
  const stat = (label, value) => `<div class="operator-stat"><span>${label}</span><strong>${Number.isInteger(value) ? value.toLocaleString('ko-KR') : '—'}</strong></div>`;
  const shell = body => `<section class="operator-panel" role="dialog" aria-modal="true" aria-labelledby="operatorTitle"><div class="operator-head"><div><span class="operator-note">PACEFIT · OPERATOR</span><h2 id="operatorTitle">운영자 공간</h2><p>서버 저장에 동의한 회원 데이터와 트레이너 연결 현황을 확인합니다.</p></div><button class="operator-button" data-operator-close type="button">닫기</button></div><div id="operatorContent">${body}</div></section>`;
  function show(body) { panel.innerHTML = shell(body); panel.hidden = false; panel.querySelector('[data-operator-close]').onclick = close; }
  async function verify() {
    const result = checked(await client.from('admin_memberships').select('user_id').eq('user_id', userId).maybeSingle());
    if (!result.data) throw Error('운영자 권한이 없습니다.');
  }
  async function counts() {
    const [members,links,entries,comments,diet,plans] = await Promise.all([
      client.from('user_app_data').select('user_id',{count:'exact',head:true}),
      client.from('trainer_member_links').select('member_id',{count:'exact',head:true}).eq('status','active'),
      client.from('trainer_log_entries').select('id',{count:'exact',head:true}),
      client.from('record_comments').select('id',{count:'exact',head:true}),
      client.from('diet_entries').select('id',{count:'exact',head:true}),
      client.from('trainer_workout_plans').select('id',{count:'exact',head:true})
    ]);
    return [checked(members).count,checked(links).count,checked(entries).count,checked(comments).count,diet.error?0:checked(diet).count,checked(plans).count];
  }
  async function loadPage() {
    show('<p class="operator-note">회원 정보를 불러오는 중…</p>');
    try {
      await verify();
      const [numbers, result] = await Promise.all([
        counts(),
        client.from('user_app_data').select('user_id,payload,updated_at',{count:'exact'})
          .order('updated_at',{ascending:false}).range(page*pageSize,(page+1)*pageSize-1)
      ]);
      checked(result);
      total = result.count ?? numbers[0] ?? 0;
      rows = result.data || [];
      const start = total ? page*pageSize+1 : 0;
      const end = Math.min(total,(page+1)*pageSize);
      show(`<div class="operator-stats">${stat('저장 계정',numbers[0])}${stat('활성 트레이너 연결',numbers[1])}${stat('트레이너 작성 기록',numbers[2])}${stat('코멘트',numbers[3])}${stat('식단 기록',numbers[4])}${stat('다음 운동 제안',numbers[5])}</div><button class="operator-button" id="operatorSyncFoods" type="button">영양 DB 500건 가져오기</button><p class="operator-note" id="operatorSyncStatus">수동 동기화 · 현재 시작 번호 ${foodImportStart} · API 키가 설정된 경우에만 동작</p><label class="operator-note" for="operatorSearch">현재 페이지에서 회원 이름 검색</label><input class="operator-search" id="operatorSearch" type="search" placeholder="회원 이름 검색" autocomplete="off"><div class="operator-members" id="operatorMembers"></div><div class="operator-pager"><button class="operator-button" id="operatorPrevious" type="button" ${page===0?'disabled':''}>← 이전</button><span class="operator-note">${start}–${end} / ${total}명</span><button class="operator-button" id="operatorNext" type="button" ${end>=total?'disabled':''}>다음 →</button></div><p class="operator-note">회원이 식단 서버 저장에 동의한 기록과 사진만 표시합니다. 트레이너에게는 공유되지 않습니다.</p>`);
      panel.querySelector('#operatorSearch').oninput = renderMembers;
      panel.querySelector('#operatorSyncFoods').onclick = async event => { const button=event.currentTarget,status=panel.querySelector('#operatorSyncStatus');button.disabled=true;button.textContent='가져오는 중…';try{const {data,error}=await client.functions.invoke('diet-kfind-sync',{body:{start:foodImportStart||1,end:(foodImportStart||1)+499}});if(error)throw error;if(data?.error)throw Error(data.error);foodImportStart=data.nextStart||0;button.textContent=data.nextStart?`${data.imported}건 가져옴`:'영양 DB 가져오기 완료';status.textContent=data.nextStart?`가져오기 완료 · 다음 시작 번호 ${foodImportStart}`:`최종 ${data.imported}건 가져왔습니다.`;button.disabled=!data.nextStart;}catch(error){let detail=error?.message||'영양 DB 동기화 설정을 확인해주세요.';try{const payload=await error?.context?.clone?.().json();if(typeof payload?.error==='string')detail=payload.error;}catch{}button.textContent='가져오기 실패';status.textContent=detail;button.disabled=false;} };
      panel.querySelector('#operatorPrevious').onclick = () => { page--; loadPage(); };
      panel.querySelector('#operatorNext').onclick = () => { page++; loadPage(); };
      renderMembers();
    } catch(error) { show(`<p class="operator-error">${message(error)}</p><p class="operator-note">서버 연결과 데이터베이스 설정을 확인해주세요.</p>`); }
  }
  function renderMembers() {
    const term = panel.querySelector('#operatorSearch')?.value.trim().toLocaleLowerCase('ko-KR') || '';
    const root = panel.querySelector('#operatorMembers');
    if (!root) return;
    const visible = rows.filter(row => !term || String(row.payload?.profile?.name || '').toLocaleLowerCase('ko-KR').includes(term));
    root.innerHTML = visible.map(row => {
      const profile = row.payload?.profile || {}, logs = list(row.payload?.logs);
      return `<button class="operator-member" type="button" data-operator-member="${esc(row.user_id)}"><strong>${esc(profile.name || '이름 미입력')}</strong><small>${esc(profile.goal || '목표 미입력')} · 회원 기록 ${logs.length}회</small><small>최근 서버 저장 ${esc(formatDate(row.updated_at))}</small></button>`;
    }).join('') || '<p class="operator-note">표시할 회원이 없습니다.</p>';
    root.querySelectorAll('[data-operator-member]').forEach(button => button.onclick = () => openMember(button.dataset.operatorMember));
  }
  const itemText = item => {
    if (!item || typeof item !== 'object') return '';
    const sets = list(item.setDetails).map((set,index) => `${index+1}세트 ${esc(set?.weight)}kg × ${esc(set?.reps)}회`);
    return `${esc(item.name || '운동')} · ${sets.length ? sets.join(' / ') : `${esc(item.weight)}kg · ${esc(item.sets)}세트 × ${esc(item.reps)}회`}`;
  };
  const logText = (log, origin) => `<div class="operator-record"><h4>${esc(log?.date || log?.entry_date || '날짜 미입력')} · ${esc(log?.title || '운동 기록')}</h4><p>${origin} · ${esc(log?.effort || '난이도 미기록')}</p><p>${list(log?.items).map(itemText).filter(Boolean).join('<br>') || '운동 종목 미입력'}</p>${log?.note?`<p>메모: ${esc(log.note)}</p>`:''}</div>`;
  async function openMember(id) {
    const row = rows.find(item => item.user_id === id);
    if (!row) return;
    show('<p class="operator-note">회원 기록을 불러오는 중…</p>');
    try {
      await verify();
      const [links,entries,comments,diet,plans] = await Promise.all([
        client.from('trainer_member_links').select('trainer_id,status,can_write,updated_at').eq('member_id',id),
        client.from('trainer_log_entries').select('entry_date,title,effort,note,items,created_at').eq('member_id',id).order('created_at',{ascending:false}).limit(100),
        client.from('record_comments').select('body,created_at').eq('member_id',id).order('created_at',{ascending:false}).limit(100),
        client.from('diet_entries').select('entry_date,meal,food_name,amount_g,note,nutrients,photo_path,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(100),
        client.from('trainer_workout_plans').select('trainer_id,target_date,body_part,title,note,exercises,created_at').eq('member_id',id).order('created_at',{ascending:false}).limit(100)
      ]);
      [links,entries,comments,plans].forEach(checked);
      const dietRows = diet.error?[]:list(diet.data);
      const profile = row.payload?.profile || {}, logs = list(row.payload?.logs).slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
      const trainerIds = [...new Set(list(links.data).map(link => link.trainer_id))];
      const profiles = trainerIds.length ? checked(await client.from('trainer_profiles').select('user_id,display_name').in('user_id',trainerIds)).data : [];
      const names = Object.fromEntries(list(profiles).map(item => [item.user_id,item.display_name]));
      const dietHtml = (await Promise.all(dietRows.map(async item => {let image='';if(item.photo_path){const {data:signed}=await client.storage.from('diet-photos').createSignedUrl(item.photo_path,600);if(signed?.signedUrl)image=`<img src="${esc(signed.signedUrl)}" alt="식단 사진" style="width:96px;height:96px;object-fit:cover;border-radius:10px">`;}const n=item.nutrients||{};return `<div class="operator-record"><h4>${esc(item.entry_date)} · ${esc(item.meal)} · ${esc(item.food_name)}</h4><p>${item.amount_g?`${esc(item.amount_g)}g · `:''}${Math.round(Number(n.kcal)||0)}kcal · 단백질 ${Number(n.protein||0).toFixed(1)}g · 탄수화물 ${Number(n.carbs||0).toFixed(1)}g · 지방 ${Number(n.fat||0).toFixed(1)}g</p>${item.note?`<p>메모: ${esc(item.note)}</p>`:''}${image}</div>`;}))).join('');
      show(`<button class="operator-button" id="operatorBack" type="button">← 회원 목록</button><div class="operator-section"><h3>${esc(profile.name || '이름 미입력')}</h3><p class="operator-note">목표 ${esc(profile.goal || '—')} · 운동 경험 ${esc(profile.experience || '—')} · 주간 목표 ${esc(profile.days || '—')}회</p><p class="operator-note">서버 저장 ${esc(formatDate(row.updated_at))} · 계정 ID ${esc(id)}</p></div><div class="operator-section"><h3>트레이너 연결 ${list(links.data).length}건</h3>${list(links.data).map(link => `<p class="operator-note">${esc(names[link.trainer_id] || '트레이너')} · ${link.status === 'active' ? '연결 중' : '해제됨'} · ${link.can_write ? '대리 작성 허용' : '열람만 허용'}</p>`).join('') || '<p class="operator-note">연결된 트레이너가 없습니다.</p>'}</div><div class="operator-section"><h3>회원 작성 기록 ${logs.length}회</h3>${logs.slice(0,100).map(log => logText(log,'회원 작성')).join('') || '<p class="operator-note">기록이 없습니다.</p>'}${logs.length>100?'<p class="operator-note">최근 100건을 표시합니다.</p>':''}</div><div class="operator-section"><h3>트레이너 작성 기록</h3>${list(entries.data).map(log => logText(log,'트레이너 작성')).join('') || '<p class="operator-note">기록이 없습니다.</p>'}</div><div class="operator-section"><h3>트레이너의 다음 운동 제안 ${list(plans.data).length}건</h3>${list(plans.data).map(plan => `<div class="operator-record"><h4>${esc(plan.target_date)} · ${esc(plan.title)}</h4><p>${esc(names[plan.trainer_id] || '트레이너')} · ${esc(plan.body_part)} · 전송 ${esc(formatDate(plan.created_at))}</p><p>${list(plan.exercises).map(item => `${esc(item.name)} · ${esc(item.sets)}세트 × ${esc(item.reps)}회${item.weight == null ? '' : ` · 참고 ${esc(item.weight)}kg`}`).join('<br>')}</p>${plan.note ? `<p>메모: ${esc(plan.note)}</p>` : ''}</div>`).join('') || '<p class="operator-note">제안이 없습니다.</p>'}</div><div class="operator-section"><h3>식단 기록 ${dietRows.length}건</h3>${dietHtml || '<p class="operator-note">운영자 조회가 허용된 식단 기록이 없습니다.</p>'}</div><div class="operator-section"><h3>코멘트</h3>${list(comments.data).map(item => `<p class="operator-record">${esc(formatDate(item.created_at))} · ${esc(item.body)}</p>`).join('') || '<p class="operator-note">코멘트가 없습니다.</p>'}</div>`);
      panel.querySelector('#operatorBack').onclick = loadPage;
    } catch(error) { show(`<p class="operator-error">${message(error)}</p><button class="operator-button" id="operatorBack" type="button">회원 목록</button>`);panel.querySelector('#operatorBack').onclick=loadPage; }
  }
  panel.addEventListener('click', event => { if (event.target === panel) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(); });
  window.PacefitOperatorDashboard = { open: async session => {
    if (!session?.client || !session?.user?.id) return;
    client = session.client; userId = session.user.id; page = 0; await loadPage();
  } };
})();

