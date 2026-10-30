/* Account, consent, cloud sync, and operator view for the static Refit PWA. */
(function () {
  'use strict';
  const cfg = window.REFIT_CONFIG || {};
  const privacy = cfg.privacy || {};
  const partlyConfigured = Boolean(cfg.supabaseUrl || cfg.supabasePublishableKey);
  const ready = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey && privacy.noticeVersion && privacy.operatorName && privacy.contactEmail && privacy.retention && privacy.dataRegion && privacy.processorNotice);
  const localConsentKey = 'refit-local-consent-v1';
  const bridge = window.RefitAccountBridge;
  let client = null, currentUser = null, cloudExerciseConsent = false, syncTimer = 0, syncBusy = false, pendingSync = false, finishingUserId = null;
  let signupCredentials = null;

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const show = (root, html) => { root.innerHTML = html; root.hidden = false; };
  function mountGate() {
    const gate = document.createElement('div'); gate.id = 'accountGate'; gate.className = 'account-gate'; gate.hidden = true;
    document.body.appendChild(gate); return gate;
  }
  function mountLocalNotice() {
    const profileBackdrop=document.getElementById('profileBackdrop');if(profileBackdrop)profileBackdrop.classList.remove('open');
    const gate = document.getElementById('accountGate') || mountGate();
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="localNoticeTitle">
      <div class="eyebrow">처음 방문 · 기기 내 저장 안내</div><h1 id="localNoticeTitle">리핏 데이터 이용 안내</h1>
      <p>현재 버전은 계정과 서버가 연결되지 않은 체험판입니다. 운동 정보는 운영자에게 전송되지 않고 이 브라우저에만 저장됩니다.</p>
      <dl class="notice-list"><dt>저장 정보</dt><dd>별명, 운동 목표·경험, 선택 입력한 키·체중·운동 기록·메모</dd><dt>이용 목적</dt><dd>운동 기록 표시와 다음 루틴·시작 무게 참고값 제공</dd><dt>저장 위치와 기간</dt><dd>현재 기기의 브라우저 저장소에 보관되며, 브라우저 데이터 삭제 시 함께 지워질 수 있습니다.</dd><dt>운동 사진</dt><dd>이 기기에만 저장되고 운영자에게 전송되지 않습니다.</dd><dt>거부 방법</dt><dd>동의하지 않으면 기록 저장과 프로필 입력을 사용할 수 없습니다. 동의 후에도 브라우저 데이터를 삭제해 저장 내용을 지울 수 있습니다.</dd></dl>
      <label class="consent-check"><input id="localConsentCheck" type="checkbox"><span>위 내용을 확인했고, 이 기기에 운동 프로필과 기록을 저장하는 데 동의합니다.</span></label>
      <div class="account-actions"><button id="localConsentContinue" class="save-manual" type="button" disabled>동의하고 시작</button><button id="localConsentLeave" class="cancel" type="button">동의하지 않음</button></div>
      <p class="account-footnote">운영자 서버 연결 전 안내입니다. 서버 계정 기능을 켜면 별도의 서버 수집·이용 동의를 받습니다.</p>
    </section>`);
    gate.querySelector('#localConsentCheck').onchange = e => { gate.querySelector('#localConsentContinue').disabled = !e.target.checked; };
    gate.querySelector('#localConsentContinue').onclick = () => { localStorage.setItem(localConsentKey, JSON.stringify({version:1,acceptedAt:new Date().toISOString()})); gate.remove(); const state=bridge&&bridge.getState();if(state&&!state.profile&&!state.onboardingSkipped&&!state.demo&&typeof window.openProfile==='function')window.openProfile(); };
    gate.querySelector('#localConsentLeave').onclick = () => { show(gate, '<section class="account-panel"><h1>동의하지 않았습니다</h1><p>동의하지 않으면 이 기기에 운동 프로필과 기록을 저장할 수 없습니다.</p><button class="cancel" onclick="location.reload()">돌아가기</button></section>'); };
  }
  const gate = mountGate();
  const accountButton = document.createElement('button'); accountButton.type = 'button'; accountButton.className = 'profile-edit account-open'; accountButton.textContent = '계정'; accountButton.setAttribute('aria-label','계정 및 저장 방식');
  const topRight = document.querySelector('.top-right'); if (topRight) topRight.insertBefore(accountButton, topRight.firstChild);
  const style = document.createElement('style'); style.textContent = `
    html.refit-backend-on .app{visibility:hidden} .account-gate{position:fixed;inset:0;z-index:1000;overflow:auto;background:rgba(18,36,27,.72);display:grid;place-items:center;padding:18px}.account-gate[hidden]{display:none!important}.account-panel{width:min(100%,560px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:22px;padding:26px;box-shadow:0 22px 90px #10251955;color:#16241b}.account-panel h1{font-size:25px;margin:8px 0}.account-panel>p{color:#59665d;line-height:1.6}.account-panel .eyebrow{color:#477657;font-size:12px;font-weight:800;letter-spacing:.04em}.account-panel .field{display:grid;gap:7px;margin:14px 0}.account-panel .field input{min-height:44px;padding:10px 12px;border:1px solid #d9e1d8;border-radius:10px;font:inherit}.account-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:17px}.account-actions button,.account-panel button{min-height:42px;padding:9px 14px;border:0;border-radius:10px;font:inherit;font-weight:800;cursor:pointer}.account-panel .save-manual{background:#2f6149;color:#fff}.account-panel .cancel{background:#edf1ec;color:#284b37}.account-panel button:disabled{opacity:.45;cursor:not-allowed}.account-footnote{font-size:12px!important}.notice-list{display:grid;grid-template-columns:120px 1fr;gap:9px 12px;padding:15px;background:#f4f7f2;border-radius:14px;font-size:13px;line-height:1.5}.notice-list dt{font-weight:800;color:#2f6149}.notice-list dd{margin:0;color:#465349}.consent-check{display:flex;gap:10px;align-items:flex-start;margin:16px 0;line-height:1.5;font-size:14px}.consent-check input{margin-top:4px;flex:none}.account-link{border:0;background:none;color:#2f6149;text-decoration:underline;font:inherit;cursor:pointer;padding:4px}.account-error{color:#a1392e!important;background:#fff2ef;padding:10px;border-radius:10px}.admin-user{border:1px solid #e0e7de;border-radius:14px;padding:13px;margin:10px 0;background:#f9faf8}.admin-user summary{cursor:pointer;font-weight:800}.admin-user pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;color:#465349;background:#f0f3ef;padding:10px;border-radius:8px}.account-badge{font-size:11px;color:#2f6149;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    @media(max-width:560px){.account-panel{padding:20px;border-radius:17px}.notice-list{grid-template-columns:1fr;gap:3px}.notice-list dd{margin-bottom:7px}.account-open{font-size:10px;padding:7px 9px!important}}
  `; document.head.appendChild(style);

  function localMode() {
    document.getElementById('localPill').textContent = '이 기기에 저장 중';
    accountButton.textContent = '저장 안내'; accountButton.onclick = () => mountLocalNotice();
    try { if (!JSON.parse(localStorage.getItem(localConsentKey) || 'null')?.acceptedAt) mountLocalNotice(); } catch { mountLocalNotice(); }
  }
  if (!partlyConfigured) { localMode(); return; }
  document.documentElement.classList.add('refit-backend-on');
  accountButton.onclick = () => gate.hidden = false;
  if (!ready) {
    show(gate, `<section class="account-panel"><div class="eyebrow">서버 연결 설정 필요</div><h1>온라인 저장을 아직 시작할 수 없어요</h1><p>Supabase 프로젝트 주소와 publishable key, 개인정보처리자 표시명·문의 이메일·실제 보유 기간이 모두 설정되어야 회원가입을 열 수 있습니다.</p><p>이 설정이 비어 있는 상태에서는 서버로 기록을 전송하지 않습니다. <a href="./supabase/README.md" target="_blank" rel="noopener">연결 준비 안내</a></p><button type="button" class="cancel" id="returnLocal">이 기기에만 저장하여 사용</button></section>`);
    gate.querySelector('#returnLocal').onclick = () => { document.documentElement.classList.remove('refit-backend-on'); gate.hidden = true; localMode(); };
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    show(gate, '<section class="account-panel"><div class="eyebrow">계정 서버 연결</div><h1>서버 기능을 불러오는 중이에요</h1><p>서버 저장을 확인한 뒤 앱을 열겠습니다.</p></section>');
    const sdk=document.createElement('script');sdk.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';sdk.onload=()=>startServer();sdk.onerror=()=>show(gate,'<section class="account-panel"><h1>계정 연결을 불러오지 못했어요</h1><p>인터넷 연결 후 새로고침해 주세요. 서버 저장이 확인되지 않아 앱을 열지 않았습니다.</p><button class="cancel" onclick="location.reload()">다시 시도</button></section>');document.head.appendChild(sdk);return;
  }
  startServer();
  function startServer() {
  client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const pill = document.getElementById('localPill');
  const userBadge = document.createElement('span'); userBadge.className = 'account-badge'; if (topRight) topRight.insertBefore(userBadge, accountButton.nextSibling);
  function authView(message = '') {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><div class="eyebrow">운동 기록 온라인 저장</div><h1 id="accountTitle">리핏 계정</h1><p>로그인하면 기기 간 운동 기록을 동기화할 수 있습니다. 서버에 저장되는 정보와 동의 항목을 확인한 뒤 가입하세요.</p>${message?`<p class="account-error" role="alert">${escapeHtml(message)}</p>`:''}<div class="field"><label for="accountEmail">이메일</label><input id="accountEmail" type="email" autocomplete="email" maxlength="254" required></div><div class="field"><label for="accountPassword">비밀번호</label><input id="accountPassword" type="password" autocomplete="current-password" minlength="8" required></div><div class="account-actions"><button class="save-manual" id="signInButton">로그인</button><button class="cancel" id="signUpButton">동의 확인 후 가입</button><button class="cancel" id="localOnlyButton">이 기기에만 저장</button></div><p class="account-footnote">계정 이메일은 로그인과 계정 복구를 위해 Supabase Auth에 저장됩니다. 비밀번호는 리핏 운영자가 볼 수 없습니다.</p></section>`);
    gate.querySelector('#signInButton').onclick = async () => {const email=gate.querySelector('#accountEmail').value.trim(),password=gate.querySelector('#accountPassword').value;const {error}=await client.auth.signInWithPassword({email,password});if(error)authView(error.message);};
    gate.querySelector('#signUpButton').onclick = () => { signupCredentials={email:gate.querySelector('#accountEmail').value.trim(),password:gate.querySelector('#accountPassword').value};const saved=JSON.parse(sessionStorage.getItem('refit-pending-consent')||'null');if(saved)performSignup(signupCredentials.email,signupCredentials.password,saved);else consentView('signup'); };
    gate.querySelector('#localOnlyButton').onclick = () => {document.documentElement.classList.remove('refit-backend-on');gate.hidden=true;localMode();};
  }
  function consentView(mode) {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="consentTitle"><div class="eyebrow">${mode==='signup'?'회원가입 전':'계정 이용 전'}</div><h1 id="consentTitle">개인정보 수집·이용 동의</h1><p>운영자: <b>${escapeHtml(privacy.operatorName)}</b> · 문의: <b>${escapeHtml(privacy.contactEmail)}</b></p><dl class="notice-list"><dt>필수 정보</dt><dd>이메일 계정 정보, 별명·운동 경험·목표·주간 목표</dd><dt>이용 목적</dt><dd>계정 로그인, 프로필 저장, 운동 서비스 제공과 계정 관리</dd><dt>보유 기간</dt><dd>${escapeHtml(privacy.retention)}</dd><dt>거부 권리</dt><dd>필수 항목 동의를 거부하면 온라인 계정을 만들거나 사용할 수 없습니다. 이 기기 전용으로 사용할 수 있습니다.</dd></dl><label class="consent-check"><input id="basicConsent" type="checkbox"><span><b>[필수]</b> 위 개인정보 수집·이용 내용을 확인했고 동의합니다.</span></label><dl class="notice-list"><dt>운동·신체 정보</dt><dd>운동 종목·날짜·무게·세트·횟수·난이도·메모, 선택 입력한 키·체중·1RM 참고 기록을 서버에 저장합니다. 동의하면 이 기기에 이미 저장된 기록도 해당 계정으로 동기화될 수 있습니다. 운동 사진은 서버에 올리지 않습니다.</dd><dt>이용 목적</dt><dd>운동 일지 동기화와 개인화된 다음 운동·참고 중량 표시</dd><dt>보유 기간</dt><dd>${escapeHtml(privacy.retention)}</dd><dt>거부 시</dt><dd>동의를 거부해도 계정 기본 기능은 쓸 수 있지만, 운동·신체 기록은 서버에 동기화되지 않아 운영자 조회와 기기 간 기록 동기화를 사용할 수 없습니다.</dd></dl><label class="consent-check"><input id="exerciseConsent" type="checkbox"><span><b>[선택]</b> 운동·신체 정보의 서버 저장과 이용에 동의합니다.</span></label><dl class="notice-list"><dt>저장·처리 위치</dt><dd>${escapeHtml(privacy.dataRegion)}의 Supabase 데이터베이스/Auth에 저장됩니다. ${escapeHtml(privacy.processorNotice)}</dd></dl><div class="account-actions"><button class="save-manual" id="acceptConsent">확인하고 계속</button><button class="cancel" id="consentBack">돌아가기</button></div><p class="account-footnote">동의는 계정 설정에서 철회할 수 있으며, 철회 시 서버 운동 기록 동기화를 중단합니다. 기록 삭제 요청은 운영자 연락처로 접수할 수 있습니다.</p></section>`);
    gate.querySelector('#acceptConsent').onclick = async () => {
      const basic=gate.querySelector('#basicConsent').checked;
      if (!basic) { gate.querySelector('#basicConsent').focus(); return; }
      const exercise=gate.querySelector('#exerciseConsent').checked, acceptedAt=new Date().toISOString();
      if (mode === 'preauth') {
        sessionStorage.setItem('refit-pending-consent',JSON.stringify({basic,exercise,acceptedAt}));authView();
      } else if (mode === 'signup') {
        sessionStorage.setItem('refit-pending-consent',JSON.stringify({basic,exercise,acceptedAt}));
        if(!signupCredentials||!signupCredentials.email||!signupCredentials.password||signupCredentials.password.length<8){authView('이메일과 8자 이상의 비밀번호를 먼저 입력해주세요.');return;}
        await performSignup(signupCredentials.email,signupCredentials.password,{basic,exercise,acceptedAt});
      } else if (currentUser) {
        const result=await storeConsent(currentUser.id,basic,exercise,acceptedAt);
        if(result.error){consentView('existing');return;}
        cloudExerciseConsent=exercise; await loadCloudState();
      }
    };
    gate.querySelector('#consentBack').onclick = () => currentUser?accountMenu():authView();
  }
  async function performSignup(email,password,choices) {
    if(!email||!password||password.length<8){authView('이메일과 8자 이상의 비밀번호를 입력해주세요.');return;}
    const acceptedAt=choices.acceptedAt||new Date().toISOString();
    const {data,error}=await client.auth.signUp({email,password,options:{data:{refit_consent:{version:privacy.noticeVersion,basic:choices.basic===true,exercise:choices.exercise===true,acceptedAt,operator:privacy.operatorName,contact:privacy.contactEmail,retention:privacy.retention}}}});
    if(error){authView(error.message);return;}
    if(!data.session){authView('가입 요청을 보냈어요. 이메일 인증을 완료한 뒤 로그인해주세요. 동의 정보는 계정 인증 후 기록됩니다.');return;}
    if(data.user){const saved=await storeConsent(data.user.id,choices.basic===true,choices.exercise===true,acceptedAt);if(saved.error){authView('계정은 만들었지만 동의 기록을 저장하지 못했어요. 로그인 후 다시 확인해주세요.');return;}}
    sessionStorage.removeItem('refit-pending-consent');await finishSession(data.session.user);
  }
  async function storeConsent(userId,basic,exercise,acceptedAt) {
    const {error}=await client.from('consent_events').insert({user_id:userId,notice_version:privacy.noticeVersion,basic_data_accepted:basic,exercise_data_accepted:exercise,accepted_at:acceptedAt,operator_name:privacy.operatorName,contact_email:privacy.contactEmail,retention_text:privacy.retention});
    return {error};
  }
  async function ensureConsent(user) {
    const {data,error}=await client.from('consent_events').select('notice_version,basic_data_accepted,exercise_data_accepted').eq('user_id',user.id).order('accepted_at',{ascending:false}).limit(1).maybeSingle();
    if(error) throw error;
    if(data&&data.notice_version===privacy.noticeVersion&&data.basic_data_accepted){cloudExerciseConsent=data.exercise_data_accepted===true;return true;}
    const meta=user.user_metadata&&user.user_metadata.refit_consent;
    if(meta&&meta.version===privacy.noticeVersion&&meta.basic===true){const saved=await storeConsent(user.id,true,meta.exercise===true,meta.acceptedAt||new Date().toISOString());if(saved.error)throw saved.error;cloudExerciseConsent=meta.exercise===true;return true;}
    currentUser=user; consentView('existing'); return false;
  }
  function cloudPayload() {
    const state=bridge.getState();
    const next={...state,version:2,demo:false,sampleProfile:false};
    if(state.demo){next.profile=null;next.logs=[];}
    else if(cloudExerciseConsent){next.logs=(state.logs||[]).map(log=>({...log,photoIds:[]}));}
    else {next.logs=[]; if(next.profile) next.profile={name:next.profile.name,experience:next.profile.experience,experienceOther:next.profile.experienceOther,goal:next.profile.goal,goalOther:next.profile.goalOther,days:next.profile.days};}
    return next;
  }
  function scheduleSync() { if(!currentUser)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,650); }
  async function syncNow() {
    if(!currentUser||!bridge)return;
    if(syncBusy){pendingSync=true;return;}
    syncBusy=true; pill.textContent='서버에 저장 중';
    try {const {error}=await client.from('user_app_data').upsert({user_id:currentUser.id,payload:cloudPayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;pill.textContent=cloudExerciseConsent?'서버에 저장됨':'프로필만 서버 저장';}
    catch(error){pill.textContent='기기에 저장됨 · 서버 연결 필요';console.warn('Refit cloud sync failed',error);}
    finally{syncBusy=false;if(pendingSync){pendingSync=false;scheduleSync();}}
  }
  async function loadCloudState() {
    const {data,error}=await client.from('user_app_data').select('payload').eq('user_id',currentUser.id).maybeSingle();
    if(error)throw error;
    if(data&&data.payload){const payload=data.payload;if(!cloudExerciseConsent){payload.logs=[];if(payload.profile)payload.profile={name:payload.profile.name,experience:payload.profile.experience,experienceOther:payload.profile.experienceOther,goal:payload.profile.goal,goalOther:payload.profile.goalOther,days:payload.profile.days};}bridge.replaceState(payload);}
    else {scheduleSync();}
    const profileBackdrop=document.getElementById('profileBackdrop');if(profileBackdrop)profileBackdrop.classList.remove('open');
    const profileText=document.querySelector('#profileBackdrop .dialog>p');if(profileText)profileText.textContent='프로필은 계정에 동기화됩니다. 운동·신체 정보 동의 여부에 따라 운동 기록과 신체 정보 저장이 달라집니다.';
    const storageCard=Array.from(document.querySelectorAll('.card')).find(card=>card.textContent.includes('기록은 어디에 저장되나요?'));
    const storageText=storageCard&&storageCard.querySelector('.coach-text');if(storageText)storageText.innerHTML=cloudExerciseConsent?'프로필과 운동 기록은 로그인한 계정의 서버 데이터베이스에 동기화됩니다. 운동 사진은 이 기기에만 저장됩니다.':'프로필 기본 정보만 계정 서버에 저장됩니다. 운동 기록과 사진은 이 기기에만 남으며 운영자 서버에는 올라가지 않습니다.';
    gate.hidden=true;userBadge.textContent=currentUser.email||'로그인됨';accountButton.textContent='계정';pill.textContent=cloudExerciseConsent?'서버에 저장됨':'프로필만 서버 저장';
    accountButton.onclick=accountMenu;
    const appState=bridge.getState();if(!appState.profile&&!appState.onboardingSkipped&&!appState.demo&&typeof window.openProfile==='function')window.openProfile();
  }
  async function showAdmin() {
    const {data:membership,error:membershipError}=await client.from('admin_memberships').select('user_id').eq('user_id',currentUser.id).maybeSingle();
    if(membershipError||!membership){alert('운영자 권한이 없습니다.');return;}
    const {data,error}=await client.from('user_app_data').select('user_id,payload,updated_at').order('updated_at',{ascending:false}).limit(500);
    if(error){alert('운영자 데이터를 불러오지 못했습니다.');return;}
    const html=(data||[]).map(row=>{const p=row.payload&&row.payload.profile||{},logs=row.payload&&row.payload.logs||[],last=logs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];return `<details class="admin-user"><summary>${escapeHtml(p.name||'이름 미입력')} · ${escapeHtml(p.goal||'목표 미입력')} · ${logs.length}회 기록</summary><p>계정 ID: ${escapeHtml(row.user_id)}<br>주간 목표: ${escapeHtml(p.days||'—')}일 · 신체정보: ${p.height?escapeHtml(p.height)+'cm':''}${p.weight?` · ${escapeHtml(p.weight)}kg`:''}<br>최근 저장: ${escapeHtml(new Date(row.updated_at).toLocaleString('ko-KR'))}</p>${last?`<p>마지막 운동: ${escapeHtml(last.date)} · ${escapeHtml(last.title)} · ${escapeHtml(last.effort||'난이도 미기록')}</p>`:''}<pre>${escapeHtml(JSON.stringify(logs,null,2))}</pre></details>`;}).join('')||'<p>서버 기록이 없습니다.</p>';
    show(gate,`<section class="account-panel"><div class="eyebrow">운영자 전용</div><h1>회원 운동 기록</h1><p>${(data||[]).length}개 계정 데이터 · 사진 파일은 이 화면에 표시되지 않습니다.</p>${html}<div class="account-actions"><button id="adminClose" class="cancel">닫기</button><button id="adminRefresh" class="cancel">새로고침</button></div></section>`);
    gate.querySelector('#adminClose').onclick=()=>gate.hidden=true;gate.querySelector('#adminRefresh').onclick=showAdmin;
  }
  async function accountMenu() {
    const {data:membership}=await client.from('admin_memberships').select('user_id').eq('user_id',currentUser.id).maybeSingle();
    show(gate,`<section class="account-panel"><div class="eyebrow">로그인 중</div><h1>${escapeHtml(currentUser.email||'계정')}</h1><p>운동·신체 정보 ${cloudExerciseConsent?'서버 동기화에 동의함':'서버 동기화에 동의하지 않음'}</p><div class="account-actions">${membership?'<button id="openAdmin" class="save-manual">운영자 데이터 보기</button>':''}<button id="changeConsent" class="cancel">동의 설정 변경</button><button id="signOut" class="cancel">로그아웃</button><button id="closeAccountMenu" class="cancel">닫기</button></div><p class="account-footnote">동의를 철회하거나 기록 삭제를 요청하려면 운영자에게 문의하세요: ${escapeHtml(privacy.contactEmail)}</p></section>`);
    const admin=gate.querySelector('#openAdmin');if(admin)admin.onclick=showAdmin;gate.querySelector('#changeConsent').onclick=()=>consentView('existing');gate.querySelector('#closeAccountMenu').onclick=()=>gate.hidden=true;
    gate.querySelector('#signOut').onclick=async()=>{clearTimeout(syncTimer);await client.auth.signOut();currentUser=null;cloudExerciseConsent=false;userBadge.textContent='';bridge.resetForLogout();document.getElementById('localPill').textContent='로그아웃됨';authView();};
  }
  async function finishSession(user) {
    if(finishingUserId===user.id)return;
    finishingUserId=user.id;
    currentUser=user;
    try {if(!(await ensureConsent(user)))return;await loadCloudState();}
    catch(error){show(gate,`<section class="account-panel"><h1>계정 데이터를 불러오지 못했어요</h1><p class="account-error">${escapeHtml(error.message||'서버 연결 오류')}</p><button id="retryAccount" class="cancel">다시 시도</button><button id="signOutError" class="cancel">로그아웃</button></section>`);gate.querySelector('#retryAccount').onclick=()=>finishSession(user);gate.querySelector('#signOutError').onclick=async()=>{await client.auth.signOut();currentUser=null;authView();};}
    finally {if(finishingUserId===user.id)finishingUserId=null;}
  }
  const basePersist=window.persist;
  if(typeof basePersist==='function')window.persist=function(){const ok=basePersist();if(ok&&currentUser)scheduleSync();return ok;};
  window.addEventListener('online',scheduleSync);
  accountButton.onclick=()=>authView();
  gate.hidden=false;
  show(gate,'<section class="account-panel"><div class="eyebrow">안전한 계정 연결</div><h1>연결 상태를 확인하고 있어요</h1><p>계정과 동의 기록을 확인한 다음 화면을 열겠습니다.</p></section>');
  client.auth.getSession().then(({data,error})=>{if(error||!data.session){if(sessionStorage.getItem('refit-pending-consent'))authView();else consentView('preauth');return;}finishSession(data.session.user);});
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session&&session.user&&session.user.id!== (currentUser&&currentUser.id))setTimeout(()=>finishSession(session.user),0);if(event==='SIGNED_OUT'){currentUser=null;cloudExerciseConsent=false;userBadge.textContent='';bridge.resetForLogout();authView();}});
  }
})();
