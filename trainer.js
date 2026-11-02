(() => {
  'use strict';
  const bridge = window.RefitAccountBridge;
  const topRight = document.querySelector('.top-right');
  if (!bridge || !topRight) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'profile-edit trainer-open';
  button.textContent = '트레이너';
  topRight.insertBefore(button, topRight.firstChild);
  const overlay = document.createElement('div');
  overlay.id = 'trainerOverlay';
  overlay.className = 'trainer-overlay';
  overlay.hidden = true;
  document.body.appendChild(overlay);
  const style = document.createElement('style');
  style.textContent = `.trainer-overlay{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;padding:16px;background:#17251cb3}.trainer-overlay[hidden]{display:none}.trainer-panel{width:min(800px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:24px;border-radius:22px;background:#fff;box-shadow:0 25px 80px #10251950}.trainer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.trainer-head h2{margin:2px 0;font-size:24px;letter-spacing:-.04em}.trainer-head p{font-size:12px;color:#66756b;margin:5px 0 0}.trainer-close,.trainer-tabs button,.trainer-subtle{border:1px solid #e0e8de;border-radius:10px;padding:9px 12px;background:#fff;color:#315b43;font-size:12px;font-weight:800;cursor:pointer}.trainer-tabs{display:flex;gap:8px;margin:18px 0}.trainer-tabs button.active{background:#315b43;color:#fff;border-color:#315b43}.trainer-card{border:1px solid #e4eae1;border-radius:15px;padding:16px;margin:12px 0;background:#fafbf8}.trainer-card h3{font-size:15px;margin:0 0 7px}.trainer-card p{font-size:12px;line-height:1.6;color:#536454;margin:7px 0}.trainer-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.trainer-row input[type=checkbox]{accent-color:#315b43}.trainer-field{display:block;font-size:11px;font-weight:800;color:#536454;margin:11px 0}.trainer-field input,.trainer-field textarea,.trainer-field select{display:block;width:100%;min-height:42px;margin-top:5px;padding:9px 10px;border:1px solid #dae4d8;border-radius:10px;background:#fff;color:#20291f;font:inherit;font-size:13px}.trainer-field textarea{min-height:72px;resize:vertical}.trainer-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.trainer-primary{min-height:42px;border:0;border-radius:11px;background:#315b43;color:#fff;padding:10px 16px;font-size:12px;font-weight:800;cursor:pointer}.trainer-primary:disabled{opacity:.5;cursor:not-allowed}.trainer-code{display:inline-block;padding:11px 14px;border:1px solid #dbe7d7;border-radius:11px;background:#f0f6ec;color:#284f39;font-size:17px;font-weight:850;letter-spacing:.12em;word-break:break-all}.trainer-note{font-size:11px;color:#6b786d;line-height:1.6}.trainer-error{padding:11px;border-radius:10px;background:#fff2ef;color:#9a3e32;font-size:12px}.trainer-log{border-top:1px solid #e5ebe3;padding:13px 0}.trainer-log:first-of-type{border-top:0}.trainer-log h4{font-size:13px;margin:0 0 4px}.trainer-log small{color:#718074;font-size:10px}.trainer-comments{margin-top:10px;padding:10px;border-radius:11px;background:#f4f7f2}.trainer-comment{font-size:11px;line-height:1.5;padding:7px 0;border-bottom:1px solid #e3e8e1}.trainer-comment:last-child{border:0}.trainer-comment b{color:#315b43}.trainer-comment time{color:#7b877d;margin-left:7px}.trainer-comment-form{display:flex;gap:7px;margin-top:8px}.trainer-comment-form input{flex:1;min-width:0;border:1px solid #dce4d9;border-radius:9px;padding:9px;font-size:12px}.trainer-comment-form button{border:0;border-radius:9px;background:#315b43;color:#fff;padding:9px 11px;font-size:11px;font-weight:800}.trainer-journal-comments{margin-top:10px}.trainer-empty{color:#788176;font-size:12px;padding:18px 0}@media(max-width:560px){.trainer-panel{padding:17px;border-radius:17px}.trainer-fields{grid-template-columns:1fr}.trainer-comment-form{flex-direction:column}.trainer-open{font-size:10px;padding:7px 9px!important}.topbar{height:auto;min-height:64px;flex-wrap:wrap;gap:6px;padding:9px 0}.top-right{margin-left:auto;gap:6px}.top-right .avatar{display:none}}`;
  document.head.appendChild(style);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session = () => window.RefitAccountSession;
  const sameSession = captured => Boolean(captured && session()?.user?.id === captured.user.id);
  const close = () => { overlay.hidden = true; button.focus(); };
  const shell = (title, intro, body, tabs = true) => `<section class="trainer-panel" role="dialog" aria-modal="true" aria-label="트레이너와 회원"><div class="trainer-head"><div><h2>${esc(title)}</h2><p>${esc(intro)}</p></div><button class="trainer-close" type="button" data-close>닫기</button></div>${tabs ? '<div class="trainer-tabs"><button type="button" data-mode="member">내 트레이너</button><button type="button" data-mode="trainer">트레이너 화면</button></div>' : ''}<div id="trainerContent">${body}</div></section>`;
  const show = html => { overlay.innerHTML = html; overlay.hidden = false; overlay.querySelector('[data-close]').onclick = close; overlay.querySelectorAll('[data-mode]').forEach(tab => tab.onclick = () => tab.dataset.mode === 'member' ? memberView() : trainerView()); };
  const errorText = error => esc(error?.message || '서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
  const tryQuery = async work => { try { return await work(); } catch (error) { show(shell('연결 오류', '서버 설정을 확인해주세요.', `<p class="trainer-error">${errorText(error)}</p>`)); return null; } };
  const assertResult = result => { if (result?.error) throw result.error; return result?.data; };

  function localView() {
    show(shell('트레이너와 함께 운동하기', '계정 서버를 연결하면 사용할 수 있어요.', `<div class="trainer-card"><h3>이렇게 사용할 수 있어요</h3><p>① 트레이너가 공유 코드를 만듭니다.<br>② 회원이 코드를 입력하고 기록 열람·대리 기록 권한을 선택합니다.<br>③ 트레이너와 회원이 같은 운동 기록에 코멘트를 남깁니다.<br>④ 허용한 경우 트레이너가 회원을 선택해 운동 기록을 대신 작성합니다.</p></div><p class="trainer-note">현재 사이트는 기기 내 저장 모드입니다. 계정 서버가 연결되기 전에는 다른 사람의 기록을 볼 수 없습니다.</p>`, false));
  }

  async function memberView() {
    const s = session();
    if (!s) return localView();
    if (!s.exerciseConsent) {
      show(shell('내 트레이너', '기록을 공유하려면 운동 정보의 서버 저장 동의가 필요해요.', '<p class="trainer-note">계정의 동의 설정에서 운동·신체 정보 저장을 켠 뒤 다시 열어주세요.</p>'));
      return;
    }
    const result = await tryQuery(async () => {
      const links = assertResult(await s.client.from('trainer_member_links').select('trainer_id,status,can_write,updated_at').eq('member_id',s.user.id));
      const ids = (links || []).map(row => row.trainer_id);
      const profiles = ids.length ? assertResult(await s.client.from('trainer_profiles').select('user_id,display_name').in('user_id',ids)) : [];
      return { links: links || [], names: Object.fromEntries((profiles || []).map(row => [row.user_id,row.display_name])) };
    });
    if (!sameSession(s)) return;
    if (!result) return;
    const active = result.links.filter(row => row.status === 'active');
    show(shell('내 트레이너', '내가 허용한 기록만 연결된 트레이너가 볼 수 있어요.', `<div class="trainer-card"><h3>트레이너 코드 등록</h3><p>등록하면 트레이너가 내 서버 운동 기록을 볼 수 있습니다. 대리 기록은 따로 허용할 수 있고 언제든 해제할 수 있어요.</p><label class="trainer-field">트레이너 코드<input id="trainerInviteCode" maxlength="32" autocomplete="off" placeholder="예: ABCD-EFGH-IJKL-MNOP"></label><label class="trainer-row trainer-note"><span>트레이너가 내 운동 기록을 대신 작성하도록 허용</span><input id="trainerAllowWrite" type="checkbox"></label><button class="trainer-primary" id="joinTrainer" type="button">코드 등록</button></div><h3>연결된 트레이너</h3>${active.length ? active.map(row => `<div class="trainer-card"><div class="trainer-row"><strong>${esc(result.names[row.trainer_id]||'트레이너')}</strong><button class="trainer-subtle" data-revoke="${esc(row.trainer_id)}" type="button">연결 해제</button></div><label class="trainer-row trainer-note"><span>대리 기록 작성 허용</span><input type="checkbox" data-write="${esc(row.trainer_id)}" ${row.can_write?'checked':''}></label></div>`).join('') : '<p class="trainer-empty">아직 연결된 트레이너가 없어요.</p>'}<p class="trainer-note">운동 사진은 이 기기에만 저장되어 트레이너에게 보이지 않습니다.</p>`));
    overlay.querySelector('#joinTrainer').onclick = async () => {
      const code = overlay.querySelector('#trainerInviteCode').value.trim();
      if (!/^[A-Za-z0-9-]{12,32}$/.test(code)) { overlay.querySelector('#trainerInviteCode').focus(); return; }
      const allow = overlay.querySelector('#trainerAllowWrite').checked;
      const {error} = await s.client.rpc('join_trainer',{code,allow_trainer_write:allow});
      if (error) { overlay.querySelector('#trainerContent').insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)}</p>`); return; }
      memberView();
    };
    overlay.querySelectorAll('[data-write]').forEach(input => input.onchange = async () => {
      const {error} = await s.client.rpc('set_trainer_access',{target_trainer:input.dataset.write,allow_trainer_write:input.checked,revoke_link:false});
      if (error) { input.checked = !input.checked; alert('권한 변경에 실패했어요.'); }
    });
    overlay.querySelectorAll('[data-revoke]').forEach(control => control.onclick = async () => {
      if (!confirm('트레이너의 기록 열람과 대리 작성 권한을 해제할까요?')) return;
      const {error} = await s.client.rpc('set_trainer_access',{target_trainer:control.dataset.revoke,allow_trainer_write:false,revoke_link:true});
      if (error) alert('연결 해제에 실패했어요.'); else memberView();
    });
  }

  async function trainerView() {
    const s = session();
    if (!s) return localView();
    const profileResult = await s.client.from('trainer_profiles').select('user_id,display_name,invite_code').eq('user_id',s.user.id).maybeSingle();
    if (!sameSession(s)) return;
    if (profileResult.error) { show(shell('트레이너 화면', '서버 설정을 확인해주세요.', `<p class="trainer-error">${errorText(profileResult.error)}</p>`)); return; }
    const profile = profileResult.data;
    if (!profile) {
      show(shell('트레이너 화면', '회원에게 공유할 코드를 만드세요.', '<div class="trainer-card"><h3>트레이너 이름 등록</h3><p>회원에게 보일 이름을 적어주세요. 전문 자격 확인 기능은 아직 없습니다.</p><label class="trainer-field">표시 이름<input id="trainerName" maxlength="60" placeholder="예: 김 트레이너"></label><button class="trainer-primary" id="createTrainer" type="button">코드 만들기</button></div>'));
      overlay.querySelector('#createTrainer').onclick = async () => {
        const name = overlay.querySelector('#trainerName').value.trim();
        if (!name || name.length > 60) return;
        const {error} = await s.client.rpc('create_trainer_profile',{trainer_name:name});
        if (error) alert('트레이너 코드 생성에 실패했어요.'); else trainerView();
      };
      return;
    }
    const result = await tryQuery(async () => {
      const links = assertResult(await s.client.from('trainer_member_links').select('member_id,can_write,status').eq('trainer_id',s.user.id).eq('status','active')) || [];
      const ids = links.map(row => row.member_id);
      const records = ids.length ? assertResult(await s.client.from('user_app_data').select('user_id,payload,updated_at').in('user_id',ids)) || [] : [];
      return {links,records:Object.fromEntries(records.map(row=>[row.user_id,row]))};
    });
    if (!sameSession(s)) return;
    if (!result) return;
    const code = profile.invite_code.replace(/(.{4})/g,'$1-').replace(/-$/,'');
    show(shell('트레이너 화면', '연결된 회원의 운동 기록을 확인하세요.', `<div class="trainer-card"><h3>회원 초대 코드</h3><div class="trainer-code">${esc(code)}</div><p>회원이 자신의 계정에서 이 코드를 등록하고 기록 공유에 동의하면 아래에 나타납니다.</p></div><h3>연결된 회원 ${result.links.length}명</h3>${result.links.length ? result.links.map(link=>{const payload=result.records[link.member_id]?.payload||{},name=payload.profile?.name||'이름 미입력',count=(payload.logs||[]).length;return `<button type="button" class="library-card" data-member="${esc(link.member_id)}"><span class="library-card-copy"><strong>${esc(name)}</strong><small>회원 기록 ${count}회 · ${link.can_write?'대리 작성 허용':'열람·코멘트만 허용'}</small></span><span aria-hidden="true">›</span></button>`}).join('') : '<p class="trainer-empty">아직 연결된 회원이 없어요.</p>'}`));
    overlay.querySelectorAll('[data-member]').forEach(row => row.onclick = () => memberRecords(row.dataset.member));
  }

  const trainerLog = row => {
    const items=(Array.isArray(row.items)?row.items:[]).map(item=>{
      const weight=Number(item?.weight),sets=Number(item?.sets),reps=Number(item?.reps);
      if(!item||!Number.isFinite(weight)||weight<0||weight>1000||!Number.isInteger(sets)||sets<1||sets>30||!Number.isInteger(reps)||reps<1||reps>100)return null;
      return {name:String(item.name||'운동').slice(0,80),equipment:String(item.equipment||'').slice(0,80),weight,sets,reps,rir:null,formOk:false};
    }).filter(Boolean);
    return {id:`trainer-${row.id}`,source:'trainer',trainerId:row.trainer_id,loggedAt:row.created_at,date:row.entry_date,title:row.title,effort:row.effort,note:row.note,photoIds:[],items};
  };
  async function refreshTrainerEntries() {
    const s = session();
    if (!s || !s.exerciseConsent) return;
    const {data,error} = await s.client.from('trainer_log_entries').select('id,trainer_id,entry_date,title,effort,note,items,created_at').eq('member_id',s.user.id).order('created_at',{ascending:false}).limit(500);
    if (!sameSession(s)) return;
    if (error) { console.warn('Trainer records could not be loaded',error); return; }
    const state = bridge.getState();
    const current = (state.logs||[]).filter(log=>log.source==='trainer');
    const received = (data||[]).map(trainerLog).filter(row=>row.items.length);
    if (current.length===received.length && current.every((row,i)=>row.id===received[i].id)) return;
    bridge.replaceState({...state,logs:[...(state.logs||[]).filter(log=>log.source!=='trainer'),...received]});
  }

  async function getComments(memberId, logKey) {
    const s = session();
    if (!s) return [];
    const {data,error}=await s.client.from('record_comments').select('id,author_id,body,created_at').eq('member_id',memberId).eq('log_key',logKey).order('created_at',{ascending:true}).limit(100);
    if (error) throw error;
    return data||[];
  }
  function commentsMarkup(rows, ownerId) {
    return rows.map(row=>`<div class="trainer-comment"><b>${row.author_id===ownerId?'회원':'트레이너'}</b><time>${esc(new Date(row.created_at).toLocaleString('ko-KR'))}</time><div>${esc(row.body)}</div></div>`).join('') || '<p class="trainer-note">아직 코멘트가 없어요.</p>';
  }
  async function addComment(memberId, logKey, body) {
    const s = session();
    const {error}=await s.client.from('record_comments').insert({member_id:memberId,log_key:logKey,author_id:s.user.id,body:body.trim()});
    if (error) throw error;
  }
  async function memberRecords(memberId) {
    const s = session();
    if (!s) return;
    const result = await tryQuery(async () => {
      const link = assertResult(await s.client.from('trainer_member_links').select('can_write,status').eq('trainer_id',s.user.id).eq('member_id',memberId).single());
      if (link.status!=='active') throw Error('연결이 해제된 회원입니다.');
      const record = assertResult(await s.client.from('user_app_data').select('payload').eq('user_id',memberId).maybeSingle());
      const entries = assertResult(await s.client.from('trainer_log_entries').select('id,trainer_id,entry_date,title,effort,note,items,created_at').eq('member_id',memberId).order('created_at',{ascending:false}).limit(500)) || [];
      return {link,record,entries};
    });
    if (!sameSession(s)) return;
    if (!result) return;
    const profile=result.record?.payload?.profile||{};
    const logs=[...(result.record?.payload?.logs||[]),...result.entries.map(trainerLog)].filter(row=>row.id&&Array.isArray(row.items)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    show(shell(profile.name||'회원 기록', '회원이 공유한 운동 기록입니다.', `<button class="trainer-subtle" id="backToMembers" type="button">← 회원 목록</button>${result.link.can_write?'<button class="trainer-primary" id="trainerNewLog" type="button" style="margin-left:8px">운동 기록 대신 작성</button>':''}<div class="trainer-card"><h3>운동 기록 ${logs.length}회</h3>${logs.length?logs.map(log=>`<div class="trainer-log"><h4>${esc(log.title||'운동 기록')}</h4><small>${esc(log.date)} · ${esc(log.effort||'난이도 미기록')} · ${log.source==='trainer'?'트레이너 작성':'회원 작성'}</small><p>${(log.items||[]).map(item=>`${esc(item.name)} ${esc(item.weight)}kg · ${esc(item.sets)}세트 × ${esc(item.reps)}회`).join('<br>')}</p>${log.note?`<p>${esc(log.note)}</p>`:''}<div class="trainer-comments" data-thread="${esc(log.id)}"><button class="trainer-subtle" type="button" data-load-comment="${esc(log.id)}">코멘트 보기</button></div></div>`).join(''):'<p class="trainer-empty">아직 운동 기록이 없어요.</p>'}</div><p class="trainer-note">사진은 회원 기기에만 저장되어 이 화면에 나타나지 않습니다.</p>`));
    overlay.querySelector('#backToMembers').onclick=trainerView;
    const newLog=overlay.querySelector('#trainerNewLog');if(newLog)newLog.onclick=()=>trainerRecordForm(memberId,profile.name||'회원');
    overlay.querySelectorAll('[data-load-comment]').forEach(control=>control.onclick=()=>loadPortalThread(memberId,control.dataset.loadComment));
  }
  async function loadPortalThread(memberId, logKey) {
    const root=Array.from(overlay.querySelectorAll('[data-thread]')).find(el=>el.dataset.thread===logKey);
    if (!root) return;
    try {
      const comments=await getComments(memberId,logKey);
      root.innerHTML=`${commentsMarkup(comments,memberId)}<form class="trainer-comment-form"><input maxlength="1000" aria-label="코멘트" placeholder="코멘트를 남겨주세요" required><button type="submit">보내기</button></form>`;
      root.querySelector('form').onsubmit=async event=>{event.preventDefault();const input=root.querySelector('input');if(!input.value.trim())return;try{await addComment(memberId,logKey,input.value);loadPortalThread(memberId,logKey)}catch(error){alert(error.message||'코멘트를 저장하지 못했어요.')}};
    } catch(error) { root.innerHTML=`<p class="trainer-error">${errorText(error)}</p>`; }
  }

  function trainerRecordForm(memberId, memberName) {
    const now=new Date(),today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
    show(shell('운동 기록 대신 작성', `${memberName}님의 운동을 지도하며 기록합니다.`, `<button class="trainer-subtle" id="backToMember" type="button">← 회원 기록</button><form id="trainerRecordForm" class="trainer-card"><label class="trainer-field">운동 날짜<input name="date" type="date" max="${today}" value="${today}" required></label><label class="trainer-field">운동 이름<input name="exercise" maxlength="80" list="trainerExercises" placeholder="예: 스쿼트" required><datalist id="trainerExercises">${(window.PACEFIT_LIBRARY||[]).filter(item=>['가슴','등','어깨','팔','하체'].includes(item.category)).map(item=>`<option value="${esc(item.name)}"></option>`).join('')}</datalist></label><div class="trainer-fields"><label class="trainer-field">무게 kg<input name="weight" type="number" min="0" max="1000" step="0.5" value="0" required></label><label class="trainer-field">세트 수<input name="sets" type="number" min="1" max="30" value="3" required></label><label class="trainer-field">세트당 횟수<input name="reps" type="number" min="1" max="100" value="10" required></label></div><label class="trainer-field">오늘 난이도<select name="effort"><option>적당했어요</option><option>쉬웠어요</option><option>힘들었어요</option><option>통증이 있었어요</option></select></label><label class="trainer-field">메모<textarea name="note" maxlength="1000" placeholder="지도 중 확인한 내용을 기록하세요"></textarea></label><p class="trainer-note">저장하면 회원 일지에 ‘트레이너 작성’으로 표시되고 작성한 계정과 시간이 서버에 남습니다.</p><button class="trainer-primary" type="submit">회원 기록으로 저장</button></form>`));
    overlay.querySelector('#backToMember').onclick=()=>memberRecords(memberId);
    overlay.querySelector('#trainerRecordForm').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,fields=new FormData(form),date=String(fields.get('date')||''),name=String(fields.get('exercise')||'').trim(),weight=Number(fields.get('weight')),sets=Number(fields.get('sets')),reps=Number(fields.get('reps')),note=String(fields.get('note')||'').trim(),effort=String(fields.get('effort')||'적당했어요');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today||!name||name.length>80||!Number.isFinite(weight)||weight<0||weight>1000||!Number.isInteger(sets)||sets<1||sets>30||!Number.isInteger(reps)||reps<1||reps>100)return;
      const save=form.querySelector('[type=submit]');save.disabled=true;
      const s=session();const {error}=await s.client.from('trainer_log_entries').insert({trainer_id:s.user.id,member_id:memberId,entry_date:date,title:`트레이너 기록 · ${name}`,effort,note,items:[{name,equipment:'',weight,sets,reps,rir:null,formOk:false}]});
      if(error){save.disabled=false;form.insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)}</p>`);return;}
      memberRecords(memberId);
    };
  }

  async function loadJournalThread(logId, root) {
    const s=session();if(!s)return;
    try {
      const rows=await getComments(s.user.id,logId);
      root.innerHTML=`${commentsMarkup(rows,s.user.id)}<form class="trainer-comment-form"><input maxlength="1000" aria-label="코멘트" placeholder="트레이너와 대화할 내용을 적어주세요" required><button type="submit">보내기</button></form>`;
      root.querySelector('form').onsubmit=async event=>{event.preventDefault();const input=root.querySelector('input');if(!input.value.trim())return;try{await addComment(s.user.id,logId,input.value);loadJournalThread(logId,root)}catch(error){root.insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)}</p>`)}};
    } catch(error) {root.innerHTML=`<p class="trainer-error">${errorText(error)}</p>`;}
  }
  function decorateJournal() {
    const s=session();if(!s||!s.exerciseConsent)return;
    document.querySelectorAll('#logList .log-item[data-log-id]').forEach(item=>{
      const logId=item.dataset.logId,detail=item.querySelector('.log-details');
      if(!logId||!detail||detail.querySelector('.trainer-journal-comments'))return;
      const root=document.createElement('div');root.className='trainer-journal-comments';root.innerHTML='<button type="button" class="trainer-subtle">코멘트 보기</button>';
      root.querySelector('button').onclick=()=>loadJournalThread(logId,root);
      detail.appendChild(root);
    });
  }
  const list=document.getElementById('logList');if(list)new MutationObserver(()=>queueMicrotask(decorateJournal)).observe(list,{childList:true});
  button.onclick=()=>session()?memberView():localView();
  overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden)close()});
  window.addEventListener('refit:session-ready',()=>{button.textContent='트레이너';refreshTrainerEntries();decorateJournal()});
  window.addEventListener('refit:session-ended',()=>{close();button.textContent='트레이너'});
  let lastRefresh=0;
  window.addEventListener('focus',()=>{if(session()&&Date.now()-lastRefresh>60000){lastRefresh=Date.now();refreshTrainerEntries()}});
})();
