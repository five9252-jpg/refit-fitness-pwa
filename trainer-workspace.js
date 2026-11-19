/* Shared by the trainer workspace and its sample-only review page. No network or storage. */
((root) => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayKey = date => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  function dateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : null;
  }
  function members(links, records, now = new Date()) {
    const today = dateValue(dayKey(now));
    return links.filter(link => link.status === 'active').map((link, index) => {
      const record = records[link.member_id], payload = record?.payload;
      const available = Boolean(payload && typeof payload === 'object');
      const logs = Array.isArray(payload?.logs) ? payload.logs : [];
      const dates = logs.map(log => log?.date).filter(date => dateValue(date) !== null && dateValue(date) <= today).sort().reverse();
      const recent = dates[0] || '';
      const status = !available ? 'unavailable' : !recent ? 'empty' : today - dateValue(recent) >= 7 * 86400000 ? 'attention' : 'recent';
      return {id:link.member_id,name:available ? String(payload.profile?.name || `이름 미입력 ${index + 1}`) : `연결 회원 ${index + 1}`,canWrite:link.can_write === true,available,recent,status,count:logs.length};
    });
  }
  const labels = {all:'전체',attention:'7일 이상 기록 없음',recent:'최근 7일 기록',empty:'공유 운동 기록 없음',unavailable:'공유 데이터 없음'};
  const groupLabels={all:'전체',pt:'PT 회원',ot:'OT 회원',management:'관리 회원'};
  const normalizeGroup=group=>group==='focus'?'pt':group==='regular'||!group?'management':group;
  function loadGroups(ownerId) {
    if(!ownerId)return {};
    try{const rows=JSON.parse(root.localStorage.getItem('pacefitTrainerGroupsV1:'+ownerId)||'{}');return Object.fromEntries(Object.entries(rows).filter(([id,group])=>/^[\w-]{1,100}$/.test(id)&&['focus','regular','pt','ot','management'].includes(group)).map(([id,group])=>[id,normalizeGroup(group)]));}catch{return {};}
  }
  function saveGroup(ownerId,memberId,group) {
    if(!ownerId||!/^[\w-]{1,100}$/.test(memberId)||!['pt','ot','management'].includes(group))return false;
    try{root.localStorage.setItem('pacefitTrainerGroupsV1:'+ownerId,JSON.stringify({...loadGroups(ownerId),[memberId]:group}));return true;}catch{return false;}
  }
  function loadAliases(ownerId) {
    if(!ownerId)return {};
    try {
      const rows=JSON.parse(root.localStorage.getItem('pacefitTrainerAliasesV1:'+ownerId)||'{}');
      return Object.fromEntries(Object.entries(rows).filter(([id,name])=>/^[\w-]{1,100}$/.test(id)&&typeof name==='string'&&name.trim()&&name.length<=40));
    } catch {return {};}
  }
  function saveAlias(ownerId,memberId,value) {
    if(!ownerId||!/^[\w-]{1,100}$/.test(memberId)||typeof value!=='string'||value.trim().length>40)return false;
    const rows=loadAliases(ownerId),name=value.trim();
    if(name)rows[memberId]=name;else delete rows[memberId];
    try{root.localStorage.setItem('pacefitTrainerAliasesV1:'+ownerId,JSON.stringify(rows));return true;}catch{return false;}
  }
  function aliasRows(rows,ownerId) {
    const aliases=loadAliases(ownerId);
    return rows.map(row=>({...row,originalName:row.originalName||row.name,name:aliases[row.id]||row.originalName||row.name}));
  }
  function markup(rows, state) {
    const query = String(state.query || '').trim().normalize('NFKC').toLocaleLowerCase('ko');
    const scoped = rows.filter(row => !state.group || state.group==='all' || normalizeGroup(row.group)===state.group);
    const filtered = scoped.filter(row => (state.filter === 'all' || row.status === state.filter) && [row.name,row.originalName||''].some(name=>name.normalize('NFKC').toLocaleLowerCase('ko').includes(query)));
    filtered.sort((a,b) => a.name.localeCompare(b.name,'ko',{numeric:true}) || a.id.localeCompare(b.id));
    const pageSize = 20, pages = Math.max(1,Math.ceil(filtered.length/pageSize));
    state.page = Math.min(Math.max(1,state.page || 1),pages);
    const counts = key => scoped.filter(row => row.status === key).length;
    const cards = [['all',scoped.length],['attention',counts('attention')],['empty',counts('empty')],['unavailable',counts('unavailable')]];
    return `<div class="tw-group-tabs" role="group" aria-label="트레이너가 지정한 회원 분류">${Object.entries(groupLabels).map(([key,label])=>`<button type="button" data-group="${key}" aria-pressed="${(state.group||'all')===key}">${label} ${key==='all'?rows.length:rows.filter(row=>normalizeGroup(row.group)===key).length}명</button>`).join('')}</div><details class="tw-extra-filters"><summary>기록 상태별로 보기</summary><p class="trainer-note">회원 분류와 상태로 목록을 좁힐 수 있어요.</p><div class="tw-stats">${cards.map(([key,count])=>`<button type="button" data-filter="${key}" aria-pressed="${state.filter===key}"><span>${labels[key]}</span><strong>${count}<small>명</small></strong></button>`).join('')}</div>
      <div class="tw-filters" role="group" aria-label="회원 기록 상태">${Object.entries(labels).map(([key,label])=>`<button type="button" data-filter="${key}" aria-pressed="${state.filter===key}">${label}</button>`).join('')}</div></details>
      <p class="tw-count" role="status">검색 결과 ${filtered.length}명 · ${state.page} / ${pages}페이지</p>
      <div class="tw-list">${filtered.slice((state.page-1)*pageSize,state.page*pageSize).map(row=>`<article class="tw-member"><div><strong>${esc(row.name)}</strong><p>최근 공유 운동 ${esc(row.recent || '—')} · ${row.available ? `${row.count}회` : '확인할 수 없음'}</p><label class="tw-group-select">회원 분류<select data-member-group="${esc(row.id)}" aria-label="${esc(row.name)} 회원 분류"><option value="pt" ${normalizeGroup(row.group)==='pt'?'selected':''}>PT 회원</option><option value="ot" ${normalizeGroup(row.group)==='ot'?'selected':''}>OT 회원</option><option value="management" ${normalizeGroup(row.group)==='management'?'selected':''}>관리 회원</option></select></label></div><details class="tw-member-more"><summary>회원 기록 보기</summary><span class="tw-badge ${row.status==='attention'?'tw-attention':''}">${labels[row.status]}</span><small class="tw-permission">${row.canWrite?'대리 작성 허용':'열람·코멘트 허용'}</small><div class="tw-actions">${[['profile','프로필'],['workout','운동'],['diet','식단'],['pose','자세']].map(([section,label])=>`<button type="button" data-member="${esc(row.id)}" data-section="${section}" aria-label="${esc(row.name)} ${label} 보기">${label}</button>`).join('')}</div></details></article>`).join('') || '<p class="trainer-empty">조건에 맞는 회원이 없어요. 검색어나 상태 필터를 바꿔보세요.</p>'}</div>
      <div class="tw-pages"><button type="button" data-page="${state.page-1}" ${state.page===1?'disabled':''}>이전</button><span>${state.page} / ${pages}</span><button type="button" data-page="${state.page+1}" ${state.page===pages?'disabled':''}>다음 20명</button></div>`;
  }
  function mount(host, rows, state, openMember, options={}) {
    if(options.groups)rows.forEach(row=>{row.group=normalizeGroup(options.groups[row.id]||row.group);});
    host.innerHTML = '<label class="trainer-field tw-search">회원 이름·별명 검색<input type="search" maxlength="80" autocomplete="off" placeholder="이름 또는 내 별명을 입력하세요"></label><div class="tw-results"></div>';
    const input = host.querySelector('input'), results = host.querySelector('.tw-results');
    input.value = state.query;
    const render = () => { results.innerHTML = markup(rows,state); };
    input.oninput = () => { state.query=input.value; state.page=1; render(); };
    results.onclick = event => {
      const control = event.target.closest('button');
      if (!control || control.disabled) return;
      if (control.dataset.group) { state.group=control.dataset.group; state.page=1; render();results.querySelector(`[data-group="${state.group}"]`)?.focus(); }
      else if (control.dataset.filter) { state.filter=control.dataset.filter; state.page=1; render(); results.querySelector(`[data-filter="${state.filter}"]`)?.focus(); }
      else if (control.dataset.page) { state.page=Number(control.dataset.page); render(); results.querySelector('.tw-count')?.scrollIntoView({block:'nearest'}); results.querySelector('.tw-pages button:not(:disabled)')?.focus(); }
      else if (control.dataset.member) openMember(control.dataset.member,control.dataset.section);
    };
    results.onchange=event=>{
      const select=event.target.closest('[data-member-group]');if(!select)return;
      const row=rows.find(row=>row.id===select.dataset.memberGroup);if(!row)return;
      const group=select.value;if(!['pt','ot','management'].includes(group))return;
      if(options.onGroupChange&&options.onGroupChange(row.id,group)===false){select.value=normalizeGroup(row.group);return;}
      row.group=group;render();results.querySelector(`[data-group="${state.group||'all'}"]`)?.focus();
    };
    render();
  }
  const api = {members,markup,mount,dateValue,loadGroups,saveGroup,loadAliases,saveAlias,aliasRows,normalizeGroup};
  root.PacefitTrainerWorkspace = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
