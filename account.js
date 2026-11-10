/* Account, consent, cloud sync, and operator view for the static Refit PWA. */
(function () {
  'use strict';
  const cfg = window.REFIT_CONFIG || {};
  const privacy = cfg.privacy || {};
  const partlyConfigured = Boolean(cfg.supabaseUrl || cfg.supabasePublishableKey);
  const ready = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey && privacy.noticeVersion && privacy.operatorName && privacy.contactEmail && privacy.retention && privacy.dataRegion && privacy.processorNotice);
  const localConsentKey = 'refit-local-consent-v2';
  const rememberKey = 'refit-remember-login-v1';
  const authStorageKeys = new Set();
  const rememberLogin = () => { try { return localStorage.getItem(rememberKey) !== 'off'; } catch { return false; } };
  const authStorage = {
    getItem(key) { authStorageKeys.add(key); return (rememberLogin() ? localStorage : sessionStorage).getItem(key); },
    setItem(key, value) {
      authStorageKeys.add(key);
      (rememberLogin() ? localStorage : sessionStorage).setItem(key, value);
      (rememberLogin() ? sessionStorage : localStorage).removeItem(key);
    },
    removeItem(key) { authStorageKeys.add(key); localStorage.removeItem(key); sessionStorage.removeItem(key); }
  };
  function setRememberLogin(enabled) {
    const from = rememberLogin() ? localStorage : sessionStorage;
    const to = enabled ? localStorage : sessionStorage;
    if (from !== to) for (const key of authStorageKeys) {
      const value = from.getItem(key);
      if (value !== null) { to.setItem(key, value); from.removeItem(key); }
    }
    localStorage.setItem(rememberKey, enabled ? 'on' : 'off');
  }
  const bridge = window.RefitAccountBridge;
  let client = null, currentUser = null, cloudExerciseConsent = false, syncTimer = 0, syncBusy = false, pendingSync = false, finishingUserId = null;
  let signupCredentials = null;
  const loginIdPattern = /^[a-z][a-z0-9_]{3,19}$/;
  const authAction = new URLSearchParams(location.search).get('auth');
  const authRedirect = action => `${location.origin}${location.pathname}?auth=${action}`;
  function clearAuthAction() {
    if (authAction) history.replaceState(history.state, '', location.pathname);
  }

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
      <div class="eyebrow">처음 방문 · 기기 내 저장 안내</div><h1 id="localNoticeTitle">페이스핏 데이터 이용 안내</h1>
      <p>계정 없이 사용하면 운동 정보는 운영자에게 전송되지 않고 이 브라우저에만 저장됩니다.</p>
      <dl class="notice-list"><dt>저장 정보</dt><dd>별명, 운동 목표·경험, 선택 입력한 성별·키·체중·기초대사량·운동 시간·운동 기록·메모</dd><dt>이용 목적</dt><dd>운동 기록 표시와 다음 루틴·시작 무게·운동 소모 칼로리 참고값 제공</dd><dt>저장 위치와 기간</dt><dd>현재 기기의 브라우저 저장소에 보관되며, 브라우저 데이터 삭제 시 함께 지워질 수 있습니다.</dd><dt>운동 사진</dt><dd>이 기기에만 저장되고 운영자에게 전송되지 않습니다.</dd><dt>거부 방법</dt><dd>동의하지 않으면 기록 저장과 프로필 입력을 사용할 수 없습니다. 동의 후에도 브라우저 데이터를 삭제해 저장 내용을 지울 수 있습니다.</dd></dl>
      <label class="consent-check"><input id="localConsentCheck" type="checkbox"><span>위 내용을 확인했고, 이 기기에 운동 프로필과 기록을 저장하는 데 동의합니다.</span></label>
      <div class="account-actions"><button id="localConsentContinue" class="save-manual" type="button" disabled>동의하고 시작</button><button id="localConsentLeave" class="cancel" type="button">동의하지 않음</button></div>
      <p class="account-footnote">나중에 온라인 계정을 만들면 서버 수집·이용 동의를 별도로 받습니다.</p>
    </section>`);
    gate.querySelector('#localConsentCheck').onchange = e => { gate.querySelector('#localConsentContinue').disabled = !e.target.checked; };
    gate.querySelector('#localConsentContinue').onclick = () => { localStorage.setItem(localConsentKey, JSON.stringify({version:1,acceptedAt:new Date().toISOString()})); gate.remove(); window.dispatchEvent(new CustomEvent('refit:local-ready')); };
    gate.querySelector('#localConsentLeave').onclick = () => { show(gate, '<section class="account-panel"><h1>동의하지 않았습니다</h1><p>동의하지 않으면 이 기기에 운동 프로필과 기록을 저장할 수 없습니다.</p><button class="cancel" onclick="location.reload()">돌아가기</button></section>'); };
  }
  const gate = mountGate();
  const authCallbackNotice = (() => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const code = params.get('error_code') || '';
    const error = params.get('error') || '';
    if (!code && !error) return '';
    // Remove the stale auth error fragment so refreshes return to a usable page.
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    if (authAction==='reset-password' || authAction==='find-id') return '확인 링크가 만료됐거나 이미 사용됐어요. 로그인 화면에서 새 확인 메일을 요청해 주세요.';
    if (code === 'otp_expired') return '이메일 인증 링크가 만료됐거나 이미 사용됐어요. 이미 인증을 마쳤다면 가입한 계정으로 로그인해 주세요. 아직 인증 전이면 새 인증 메일을 요청해 주세요.';
    return '이메일 인증을 완료하지 못했어요. 링크가 만료됐거나 이미 사용되었을 수 있습니다. 로그인하거나 새 인증 메일을 요청해 주세요.';
  })();
  const accountButton = document.createElement('button'); accountButton.type = 'button'; accountButton.className = 'profile-edit account-open'; accountButton.textContent = '계정'; accountButton.setAttribute('aria-label','계정 및 저장 방식');
  const topRight = document.querySelector('.top-right'); if (topRight) topRight.insertBefore(accountButton, topRight.firstChild);
  const accountStatus = document.querySelector('.account-status');
  const style = document.createElement('style'); style.textContent = `
    html.refit-backend-on .app{visibility:hidden}html.refit-backend-on:has(.account-gate[hidden]) .app{visibility:visible}
    .account-gate{position:fixed;inset:0;z-index:1000;overflow:auto;background:rgba(18,36,27,.72);display:grid;place-items:center;padding:18px}.account-gate[hidden]{display:none!important}.account-panel{width:min(100%,560px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:22px;padding:26px;box-shadow:0 22px 90px #10251955;color:#16241b}.account-panel h1{font-size:25px;margin:8px 0}.account-panel>p{color:#59665d;line-height:1.6}.account-panel .eyebrow{color:#477657;font-size:12px;font-weight:800;letter-spacing:.04em}.account-panel .field{display:grid;gap:7px;margin:14px 0}.account-panel .field input{min-height:44px;padding:10px 12px;border:1px solid #d9e1d8;border-radius:10px;font:inherit}.account-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:17px}.account-actions button,.account-panel button{min-height:42px;padding:9px 14px;border:0;border-radius:10px;font:inherit;font-weight:800;cursor:pointer}.account-panel .save-manual{background:#2f6149;color:#fff}.account-panel .cancel{background:#edf1ec;color:#284b37}.account-panel button:disabled{opacity:.45;cursor:not-allowed}.account-footnote{font-size:12px!important}.account-remember{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:14px}.account-remember input{width:17px;height:17px}.notice-list{display:grid;grid-template-columns:120px 1fr;gap:9px 12px;padding:15px;background:#f4f7f2;border-radius:14px;font-size:13px;line-height:1.5}.notice-list dt{font-weight:800;color:#2f6149}.notice-list dd{margin:0;color:#465349}.consent-check{display:flex;gap:10px;align-items:flex-start;margin:16px 0;line-height:1.5;font-size:14px}.consent-check input{margin-top:4px;flex:none}.account-link{border:0;background:none;color:#2f6149;text-decoration:underline;font:inherit;cursor:pointer;padding:4px}.account-error{color:#a1392e!important;background:#fff2ef;padding:10px;border-radius:10px}.admin-user{border:1px solid #e0e7de;border-radius:14px;padding:13px;margin:10px 0;background:#f9faf8}.admin-user summary{cursor:pointer;font-weight:800}.admin-user pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;color:#465349;background:#f0f3ef;padding:10px;border-radius:8px}.account-badge{font-size:11px;color:#2f6149;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    @media(max-width:560px){.account-panel{padding:20px;border-radius:17px}.notice-list{grid-template-columns:1fr;gap:3px}.notice-list dd{margin-bottom:7px}.account-open{font-size:10px;padding:7px 9px!important}}
  `; document.head.appendChild(style);
  style.textContent += '.account-info{color:#23513b;background:#edf7ee;padding:10px;border-radius:10px;line-height:1.5}.account-help-links{gap:4px 12px;border-top:1px solid #e7ece7;padding-top:10px}.account-help-links .account-link{min-height:36px;padding:5px 0;font-size:12px;text-align:left}';

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
    gate.querySelector('#returnLocal').onclick = () => { document.documentElement.classList.remove('refit-backend-on'); gate.hidden = true; localMode(); window.dispatchEvent(new CustomEvent('refit:local-ready')); };
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    show(gate, '<section class="account-panel"><div class="eyebrow">계정 서버 연결</div><h1>서버 기능을 불러오는 중이에요</h1><p>서버 저장을 확인한 뒤 앱을 열겠습니다.</p></section>');
    const sdk=document.createElement('script');sdk.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';sdk.onload=()=>startServer();sdk.onerror=()=>show(gate,'<section class="account-panel"><h1>계정 연결을 불러오지 못했어요</h1><p>인터넷 연결 후 새로고침해 주세요. 서버 저장이 확인되지 않아 앱을 열지 않았습니다.</p><button class="cancel" onclick="location.reload()">다시 시도</button></section>');document.head.appendChild(sdk);return;
  }
  startServer();
  function startServer() {
  client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage}});
  const pill = document.getElementById('localPill');
  const userBadge = document.createElement('span'); userBadge.className = 'account-badge'; if (accountStatus) accountStatus.insertBefore(userBadge, accountStatus.firstChild);
  function authErrorKo(error) {
    const message = String(error && error.message || error || '').trim();
    const code = String(error && error.code || '').trim();
    const text = `${code} ${message}`.toLowerCase();
    if (/over_email_send_rate_limit|email rate limit exceeded|too many emails/.test(text)) return '인증 메일 요청이 너무 많아요. 잠시 기다린 뒤 다시 시도해주세요.';
    if (/over_request_rate_limit|too many requests/.test(text)) return '요청이 잠시 많았어요. 몇 분 뒤 다시 시도해주세요.';
    if (/invalid login credentials|invalid email or password/.test(text)) return '이메일 또는 비밀번호가 맞지 않습니다.';
    if (/email not confirmed|email_not_confirmed/.test(text)) return '이메일 인증이 아직 완료되지 않았어요. 받은편지함에서 인증 링크를 확인해주세요.';
    if (/user already registered|user already exists|already registered/.test(text)) return '이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해주세요.';
    if (/error sending confirmation email|smtp|535|525|mail.*send|email provider/.test(text)) return '가입 인증 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요. 문제가 계속되면 운영자에게 문의해주세요.';
    if (/email_address_not_authorized|email address not authorized/.test(text)) return '현재 이메일 발송 설정에서 이 주소로 메일을 보낼 수 없습니다. 운영자에게 문의해주세요.';
    if (/invalid email|email address.*invalid|unable to validate email/.test(text)) return '이메일 주소를 다시 확인해주세요.';
    if (/password.*(weak|least|short|contain|characters)/.test(text)) return '비밀번호 조건을 확인해주세요. 8자 이상으로 입력해주세요.';
    if (/failed to fetch|networkerror|network request failed|fetch failed/.test(text)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해주세요.';
    if (/database error saving new user/.test(text)) return '가입 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.';
    return '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요. 문제가 계속되면 운영자에게 문의해주세요.';
  }
  function authView(message = '', tone = 'error') {
    document.documentElement.classList.add('refit-backend-on');
    const notice=message?`<p class="${tone==='success'?'account-info':'account-error'}" role="${tone==='success'?'status':'alert'}">${escapeHtml(message)}</p>`:'';
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><div class="eyebrow">개인 운동 기록</div><h1 id="accountTitle">로그인</h1><p>아이디 또는 가입 이메일로 로그인하세요.</p>${notice}<div class="field"><label for="loginId">아이디 또는 이메일</label><input id="loginId" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="254" required></div><div class="field"><label for="accountPassword">비밀번호</label><input id="accountPassword" type="password" autocomplete="current-password" minlength="8" required></div><label class="account-remember"><input id="rememberLogin" type="checkbox" ${rememberLogin()?'checked':''}> 이 기기에서 자동 로그인</label><div class="account-actions"><button class="save-manual" id="signInButton">로그인</button><button class="cancel" id="signUpButton">새 계정 만들기</button></div><div class="account-actions account-help-links"><button class="account-link" id="findLoginId">아이디 찾기</button><button class="account-link" id="resetPassword">비밀번호 찾기</button><button class="account-link" id="resendEmailLink">인증 메일 다시 받기</button></div></section>`);
    gate.querySelector('#signInButton').onclick = async () => {
      const identifier=gate.querySelector('#loginId').value.trim().toLowerCase();
      const password=gate.querySelector('#accountPassword').value;
      const isEmail=identifier.includes('@');
      if(!(isEmail?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier):loginIdPattern.test(identifier))||password.length<8){authView('아이디 또는 이메일과 비밀번호를 확인해주세요.');return;}
      setRememberLogin(gate.querySelector('#rememberLogin').checked);
      const button=gate.querySelector('#signInButton');button.disabled=true;
      try {
        if(isEmail){
          const {data,error}=await client.auth.signInWithPassword({email:identifier,password});
          if(error) throw error;
          if(data.user) await finishSession(data.user);
        }else{
          const {data,error}=await client.functions.invoke('username-login',{body:{username:identifier,password}});
          if(error||!data?.access_token||!data?.refresh_token) throw error||new Error('invalid_credentials');
          const {data:sessionData,error:sessionError}=await client.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
          if(sessionError) throw sessionError;
          if(sessionData.user) await finishSession(sessionData.user);
        }
      } catch(error) {
        authView(error?.context?.status===429?'로그인 시도가 많아요. 15분 뒤 다시 시도해주세요.':error?.context?.status===503?'로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.':isEmail?authErrorKo(error):'아이디 또는 비밀번호가 맞지 않습니다.');
      }
    };
    gate.querySelector('#signUpButton').onclick = () => signupView();
    gate.querySelector('#findLoginId').onclick = () => recoveryEmailView('id');
    gate.querySelector('#resetPassword').onclick = () => recoveryEmailView('password');
    gate.querySelector('#resendEmailLink').onclick = () => resendEmailView();
  }
  function recoveryEmailView(kind, message='', error=false) {
    const isId=kind==='id';
    const title=isId?'아이디 찾기':'비밀번호 찾기';
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">계정 복구</div><h1>${title}</h1><p>가입할 때 인증한 이메일을 입력하세요. 본인 확인 링크를 보내드립니다.</p>${message?`<p class="${error?'account-error':'account-info'}" role="${error?'alert':'status'}">${escapeHtml(message)}</p>`:''}<div class="field"><label for="recoveryEmail">가입 이메일</label><input id="recoveryEmail" type="email" autocomplete="email" maxlength="254" required></div><div class="account-actions"><button id="sendRecovery" class="save-manual">확인 메일 보내기</button><button id="recoveryBack" class="cancel">로그인으로 돌아가기</button></div><p class="account-footnote">가입된 이메일인지 여부는 화면에 표시하지 않습니다. 메일이 오지 않으면 스팸함도 확인해 주세요.</p></section>`);
    gate.querySelector('#sendRecovery').onclick=async()=>{
      const input=gate.querySelector('#recoveryEmail');
      if(!input.checkValidity()){input.reportValidity();return;}
      const button=gate.querySelector('#sendRecovery');button.disabled=true;
      const email=input.value.trim();
      const result=isId
        ? await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:authRedirect('find-id')}})
        : await client.auth.resetPasswordForEmail(email,{redirectTo:authRedirect('reset-password')});
      if(result.error){recoveryEmailView(kind,authErrorKo(result.error),true);return;}
      recoveryEmailView(kind,'요청을 접수했어요. 가입된 이메일이라면 확인 링크가 도착합니다.');
    };
    gate.querySelector('#recoveryBack').onclick=()=>authView();
  }
  async function foundIdView() {
    const {data,error}=await client.rpc('my_login_id');
    if(error){authView('아이디를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');return;}
    clearAuthAction();
    show(gate,`<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">이메일 확인 완료</div><h1>내 로그인 아이디</h1><p class="account-info">${data?escapeHtml(data):'이 계정에는 아직 로그인 아이디가 연결되지 않았습니다.'}</p><p>확인된 이메일: ${escapeHtml(currentUser?.email||'')}</p><div class="account-actions"><button id="foundIdContinue" class="save-manual">계속 사용하기</button></div></section>`);
    gate.querySelector('#foundIdContinue').onclick=()=>{gate.hidden=true;};
  }
  function newPasswordView(message='') {
    document.documentElement.classList.add('refit-backend-on');
    show(gate,`<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">이메일 확인 완료</div><h1>새 비밀번호 설정</h1>${message?`<p class="account-error" role="alert">${escapeHtml(message)}</p>`:''}<div class="field"><label for="recoveryPassword">새 비밀번호</label><input id="recoveryPassword" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="recoveryPasswordAgain">새 비밀번호 확인</label><input id="recoveryPasswordAgain" type="password" autocomplete="new-password" minlength="8" required></div><div class="account-actions"><button id="saveNewPassword" class="save-manual">비밀번호 변경</button></div><p class="account-footnote">8자 이상으로 설정하세요. 변경 후 현재 기기에서 로그인 상태가 유지됩니다.</p></section>`);
    gate.querySelector('#saveNewPassword').onclick=async()=>{
      const password=gate.querySelector('#recoveryPassword').value;
      const again=gate.querySelector('#recoveryPasswordAgain').value;
      if(password.length<8||password!==again){newPasswordView('비밀번호를 8자 이상, 두 칸에 동일하게 입력해주세요.');return;}
      gate.querySelector('#saveNewPassword').disabled=true;
      const {error}=await client.auth.updateUser({password});
      if(error){newPasswordView(authErrorKo(error));return;}
      clearAuthAction();
      const {data}=await client.auth.getUser();
      if(data?.user) await finishSession(data.user);
      else authView('비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.','success');
    };
  }
  function resendEmailView(message='') {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">이메일 인증</div><h1>인증 메일 다시 받기</h1><p>가입할 때 입력한 이메일 주소를 적어주세요.</p>${message?`<p class="account-info" role="status">${escapeHtml(message)}</p>`:''}<div class="field"><label for="resendEmail">이메일</label><input id="resendEmail" type="email" autocomplete="email" required></div><div class="account-actions"><button id="resendEmailSubmit" class="save-manual">인증 메일 보내기</button><button id="resendEmailBack" class="cancel">돌아가기</button></div></section>`);
    gate.querySelector('#resendEmailSubmit').onclick=async()=>{
      const input=gate.querySelector('#resendEmail');
      if(!input.checkValidity()){resendEmailView('이메일 주소를 확인해주세요.');return;}
      const email=input.value.trim();
      const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error){resendEmailView(authErrorKo(error));return;}
      verificationView(email,'새 인증 메일을 보냈어요. 가장 최근 메일의 번호를 사용해주세요.');
    };
    gate.querySelector('#resendEmailBack').onclick=()=>authView();
  }
  function signupView(message='') {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">1단계 · 계정 만들기</div><h1>아이디와 비밀번호</h1><p>이메일은 다음 단계에서 별도로 인증합니다.</p>${message?`<p class="account-error" role="alert">${escapeHtml(message)}</p>`:''}<div class="field"><label for="newLoginId">로그인 아이디</label><input id="newLoginId" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" minlength="4" maxlength="20" required><small>영문 소문자로 시작, 영문·숫자·밑줄 4~20자</small></div><div class="field"><label for="newPassword">비밀번호</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="newPasswordAgain">비밀번호 확인</label><input id="newPasswordAgain" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="newEmail">인증받을 이메일</label><input id="newEmail" type="email" autocomplete="email" maxlength="254" required></div><div class="account-actions"><button id="signupNext" class="save-manual">다음 · 동의 확인</button><button id="signupBack" class="cancel">돌아가기</button></div></section>`);
    gate.querySelector('#signupNext').onclick=async()=>{
      const username=gate.querySelector('#newLoginId').value.trim().toLowerCase();
      const password=gate.querySelector('#newPassword').value;
      const repeated=gate.querySelector('#newPasswordAgain').value;
      const email=gate.querySelector('#newEmail').value.trim();
      if(!loginIdPattern.test(username)){signupView('아이디는 영문 소문자로 시작하고 영문·숫자·밑줄 4~20자로 입력해주세요.');return;}
      if(password.length<8||password!==repeated){signupView('비밀번호는 8자 이상으로 입력하고 확인란과 같게 적어주세요.');return;}
      if(!gate.querySelector('#newEmail').checkValidity()){signupView('인증받을 이메일 주소를 확인해주세요.');return;}
      const {data,error}=await client.rpc('login_id_available',{proposed:username});
      if(error){signupView('아이디 확인 서버에 연결하지 못했어요. 다시 시도해주세요.');return;}
      if(!data){signupView('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');return;}
      signupCredentials={username,password,email};
      consentView('signup');
    };
    gate.querySelector('#signupBack').onclick=()=>authView();
  }
  function verificationView(email, message='') {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">2단계 · 이메일 확인</div><h1>인증 메일을 확인해주세요</h1><p>${escapeHtml(email)}로 보낸 인증번호를 입력하세요. 메일의 인증 버튼을 눌러도 됩니다.</p>${message?`<p class="account-info" role="status">${escapeHtml(message)}</p>`:''}<div class="field"><label for="emailCode">이메일 인증번호</label><input id="emailCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" pattern="[0-9]{6,8}" required></div><div class="account-actions"><button id="verifyEmailCode" class="save-manual">이메일 인증 완료</button><button id="resendSignupEmail" class="cancel">인증 메일 다시 보내기</button><button id="verificationBack" class="cancel">로그인 화면</button></div></section>`);
    gate.querySelector('#verifyEmailCode').onclick=async()=>{
      const token=gate.querySelector('#emailCode').value.trim();
      if(!/^[0-9]{6,8}$/.test(token)){verificationView(email,'메일에 적힌 숫자 6~8자리를 입력해주세요.');return;}
      const {data,error}=await client.auth.verifyOtp({email,token,type:'signup'});
      if(error){verificationView(email,'인증번호가 맞지 않거나 만료됐어요. 새 인증 메일을 요청해주세요.');return;}
      if(data?.user){sessionStorage.removeItem('refit-pending-consent');await finishSession(data.user);}
    };
    gate.querySelector('#resendSignupEmail').onclick=async()=>{
      const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});
      verificationView(email,error?authErrorKo(error):'새 인증 메일을 보냈어요. 가장 최근 메일의 번호를 사용해주세요.');
    };
    gate.querySelector('#verificationBack').onclick=()=>authView();
  }
  function consentView(mode) {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="consentTitle"><div class="eyebrow">${mode==='signup'?'회원가입 · 개인정보 확인':'계정 이용 · 개인정보 확인'}</div><h1 id="consentTitle">개인정보 수집·이용 동의</h1><p>운영자: <b>${escapeHtml(privacy.operatorName)}</b> · 문의: <b>${escapeHtml(privacy.contactEmail)}</b></p><dl class="notice-list"><dt>필수 정보</dt><dd>로그인 아이디, 이메일 계정 정보, 별명·운동 경험·목표·주간 목표. 비밀번호는 인증 서비스에서 처리합니다.</dd><dt>이용 목적</dt><dd>계정 로그인, 이메일 주소 확인, 프로필 저장, 운동 서비스 제공과 계정 관리</dd><dt>보유 기간</dt><dd>${escapeHtml(privacy.retention)}</dd><dt>거부 권리</dt><dd>필수 항목 동의를 거부하면 온라인 계정을 만들거나 사용할 수 없습니다. 이 기기 전용으로 사용할 수 있습니다.</dd></dl><label class="consent-check"><input id="basicConsent" type="checkbox"><span><b>[필수]</b> 위 개인정보 수집·이용 내용을 확인했고 동의합니다.</span></label><dl class="notice-list"><dt>운동·신체 정보</dt><dd>운동 종목·날짜·무게·세트·횟수·난이도·운동 시간·예상 칼로리·메모, 선택 입력한 성별·키·체중·기초대사량·1RM 참고 기록을 서버에 저장합니다. 동의하면 이 기기에 이미 저장된 기록도 해당 계정으로 동기화될 수 있습니다. 운동 사진은 서버에 올리지 않습니다.</dd><dt>이용 목적</dt><dd>운동 일지 동기화와 개인화된 다음 운동·참고 중량 표시. 트레이너와 기록을 공유하려면 별도로 연결 코드와 공유 권한을 선택합니다.</dd><dt>보유 기간</dt><dd>${escapeHtml(privacy.retention)}</dd><dt>거부 시</dt><dd>동의를 거부해도 계정 기본 기능은 쓸 수 있지만, 운동·신체 기록은 서버에 동기화되지 않아 운영자 조회와 기기 간 기록 동기화를 사용할 수 없습니다.</dd></dl><label class="consent-check"><input id="exerciseConsent" type="checkbox"><span><b>[선택]</b> 운동·신체 정보의 서버 저장과 이용에 동의합니다.</span></label><dl class="notice-list"><dt>저장·처리 위치</dt><dd>${escapeHtml(privacy.dataRegion)}의 Supabase 데이터베이스/Auth에 저장됩니다. ${escapeHtml(privacy.processorNotice)}</dd></dl><div class="account-actions"><button class="save-manual" id="acceptConsent">확인하고 계속</button><button class="cancel" id="consentBack">돌아가기</button></div><p class="account-footnote">동의는 계정 설정에서 철회할 수 있으며, 철회 시 서버 운동 기록 동기화를 중단합니다. 기록 삭제 요청은 운영자 연락처로 접수할 수 있습니다.</p></section>`);
    const fullNotice=document.createElement('p');fullNotice.className='account-footnote';fullNotice.innerHTML='<a href="./privacy.html" target="_blank" rel="noopener">개인정보 처리 안내 전체 보기</a>';
    gate.querySelector('.account-actions').before(fullNotice);
    gate.querySelector('#acceptConsent').onclick = async () => {
      const basic=gate.querySelector('#basicConsent').checked;
      if (!basic) { gate.querySelector('#basicConsent').focus(); return; }
      const exercise=gate.querySelector('#exerciseConsent').checked, acceptedAt=new Date().toISOString();
      if (mode === 'preauth') {
        sessionStorage.setItem('refit-pending-consent',JSON.stringify({basic,exercise,acceptedAt}));authView();
      } else if (mode === 'signup') {
        sessionStorage.setItem('refit-pending-consent',JSON.stringify({basic,exercise,acceptedAt}));
        if(!signupCredentials){signupView('아이디·비밀번호·이메일을 먼저 입력해주세요.');return;}
        await performSignup(signupCredentials,{basic,exercise,acceptedAt});
      } else if (currentUser) {
        const result=await storeConsent(currentUser.id,basic,exercise,acceptedAt);
        if(result.error){consentView('existing');return;}
        cloudExerciseConsent=exercise; await loadCloudState();
      }
    };
    gate.querySelector('#consentBack').onclick = () => currentUser?accountMenu():mode==='signup'?signupView():authView();
  }
  async function performSignup(credentials,choices) {
    const {username,email,password}=credentials;
    if(!loginIdPattern.test(username)||!email||!password||password.length<8){signupView('아이디·이메일·비밀번호를 다시 입력해주세요.');return;}
    const acceptedAt=choices.acceptedAt||new Date().toISOString();
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:{pacefit_username:username,refit_consent:{version:privacy.noticeVersion,basic:choices.basic===true,exercise:choices.exercise===true,acceptedAt,operator:privacy.operatorName,contact:privacy.contactEmail,retention:privacy.retention}}}});
    signupCredentials=null;
    if(error){signupView(authErrorKo(error));return;}
    if(!data.session){verificationView(email);return;}
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
    else if(cloudExerciseConsent){next.logs=(state.logs||[]).filter(log=>log.source!=='trainer').map(log=>({...log,photoIds:[]}));}
    else {next.logs=[]; if(next.profile) next.profile={name:next.profile.name,experience:next.profile.experience,experienceOther:next.profile.experienceOther,goal:next.profile.goal,goalOther:next.profile.goalOther,days:next.profile.days};}
    return next;
  }
  function scheduleSync() { if(!currentUser)return;pill.textContent='서버 저장 대기 중';clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,650); }
  async function syncNow() {
    if(!currentUser||!bridge)return;
    if(syncBusy){pendingSync=true;return;}
    syncBusy=true; pill.textContent='서버에 저장 중';
    try {const {error}=await client.from('user_app_data').upsert({user_id:currentUser.id,payload:cloudPayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;pill.textContent=cloudExerciseConsent?'서버에 저장됨':'프로필만 서버 저장';}
    catch(error){pill.textContent='기기에 저장됨 · 서버 저장 실패';console.warn('Refit cloud sync failed',error);}
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
    document.documentElement.classList.remove('refit-backend-on');
    gate.hidden=true;userBadge.textContent=currentUser.email||'로그인됨';accountButton.textContent='계정';pill.textContent=cloudExerciseConsent?'서버에 저장됨':'프로필만 서버 저장';
    window.RefitAccountSession={client,user:currentUser,exerciseConsent:cloudExerciseConsent};
    window.dispatchEvent(new CustomEvent('refit:session-ready'));
    accountButton.onclick=accountMenu;
  }
  async function showAdmin() {
    if (window.PacefitOperatorDashboard) {
      gate.hidden = true;
      await window.PacefitOperatorDashboard.open({client,user:currentUser});
      return;
    }
    const {data:membership,error:membershipError}=await client.from('admin_memberships').select('user_id').eq('user_id',currentUser.id).maybeSingle();
    if(membershipError||!membership){alert('운영자 권한이 없습니다.');return;}
    const {data,error}=await client.from('user_app_data').select('user_id,payload,updated_at').order('updated_at',{ascending:false}).limit(500);
    if(error){alert('운영자 데이터를 불러오지 못했습니다.');return;}
    const [linksResult,entriesResult,commentsResult]=await Promise.all([
      client.from('trainer_member_links').select('trainer_id,member_id,status,can_write,updated_at').limit(500),
      client.from('trainer_log_entries').select('id,trainer_id,member_id,entry_date,title,items,created_at').limit(500),
      client.from('record_comments').select('id,member_id,log_key,author_id,body,created_at').limit(500)
    ]);
    const linked=linksResult.error?[]:linksResult.data||[],trainerEntries=entriesResult.error?[]:entriesResult.data||[],comments=commentsResult.error?[]:commentsResult.data||[];
    const html=(data||[]).map(row=>{const p=row.payload&&row.payload.profile||{},logs=row.payload&&row.payload.logs||[],last=logs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0],memberEntries=trainerEntries.filter(item=>item.member_id===row.user_id),memberComments=comments.filter(item=>item.member_id===row.user_id),memberLinks=linked.filter(item=>item.member_id===row.user_id);return `<details class="admin-user"><summary>${escapeHtml(p.name||'이름 미입력')} · ${escapeHtml(p.goal||'목표 미입력')} · 회원 ${logs.length}회 / 트레이너 ${memberEntries.length}회 기록</summary><p>계정 ID: ${escapeHtml(row.user_id)}<br>주간 목표: ${escapeHtml(p.days||'—')}일 · 신체정보: ${p.height?escapeHtml(p.height)+'cm':''}${p.weight?` · ${escapeHtml(p.weight)}kg`:''}<br>최근 저장: ${escapeHtml(new Date(row.updated_at).toLocaleString('ko-KR'))}</p>${last?`<p>마지막 운동: ${escapeHtml(last.date)} · ${escapeHtml(last.title)} · ${escapeHtml(last.effort||'난이도 미기록')}</p>`:''}<p>트레이너 연결 ${memberLinks.length}건 · 코멘트 ${memberComments.length}건</p><pre>${escapeHtml(JSON.stringify({memberLogs:logs,trainerEntries:memberEntries,trainerLinks:memberLinks,comments:memberComments},null,2))}</pre></details>`;}).join('')||'<p>서버 기록이 없습니다.</p>';
    show(gate,`<section class="account-panel"><div class="eyebrow">운영자 전용</div><h1>회원 운동 기록</h1><p>${(data||[]).length}개 계정 데이터 · 트레이너 기록 ${trainerEntries.length}개 · 코멘트 ${comments.length}개. 사진 파일은 이 화면에 표시되지 않습니다.</p>${html}<div class="account-actions"><button id="adminClose" class="cancel">닫기</button><button id="adminRefresh" class="cancel">새로고침</button></div></section>`);
    gate.querySelector('#adminClose').onclick=()=>gate.hidden=true;gate.querySelector('#adminRefresh').onclick=showAdmin;
  }
  async function restoreRecords() {
    if (!currentUser) return;
    if (privacy.recoveryEnabled !== true) { alert('복구용 보관 기능은 아직 준비 중입니다.'); return; }
    if (!cloudExerciseConsent) { alert('운동·신체 정보 서버 저장에 동의한 뒤 복구할 수 있습니다.'); consentView('existing'); return; }
    const choice = window.confirm('같은 이메일로 탈퇴한 계정의 운동 기록을 복구할까요? 현재 계정의 운동 기록은 복구 기록으로 교체됩니다.');
    if (!choice) return;
    const {data,error} = await client.rpc('restore_withdrawn_records');
    if (error) { accountMenu(); alert('복구에 실패했습니다. 잠시 후 다시 시도해주세요.'); return; }
    if (!data) { accountMenu(); alert('복구할 기록이 없거나 보관 기간이 지났습니다.'); return; }
    try { await loadCloudState(); alert('운동 기록을 복구했습니다.'); }
    catch { accountMenu(); alert('복구는 완료됐지만 화면을 다시 불러오지 못했습니다. 새로고침해주세요.'); }
  }
  function withdrawView() {
    const recoveryOption=privacy.recoveryEnabled===true&&cloudExerciseConsent?'<label class="consent-check"><input id="keepRecovery" type="checkbox"><span>운동 기록 복구를 위해 서버 기록과 코멘트를 탈퇴 후 1년간 별도로 보관합니다. 같은 이메일로 새 계정을 만들고 인증하면 복구할 수 있습니다.</span></label>':'<p>복구용 보관은 아직 제공하지 않습니다. 탈퇴하면 서버 기록은 즉시 삭제됩니다.</p>';
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="withdrawTitle"><div class="eyebrow">계정 탈퇴</div><h1 id="withdrawTitle">계정을 삭제할까요?</h1><p>탈퇴하면 로그인과 트레이너 연결이 종료됩니다. 이 기기에 남은 현재 기록과 사진도 삭제합니다.</p>${recoveryOption}<label class="consent-check"><input id="withdrawUnderstand" type="checkbox"><span>탈퇴 후 트레이너 연결은 복구되지 않고, 이 기기에만 있던 사진은 복구할 수 없음을 확인했습니다.</span></label><div class="account-actions"><button id="withdrawSubmit" class="save-manual" type="button" disabled>계정 탈퇴</button><button id="withdrawCancel" class="cancel" type="button">취소</button></div><p id="withdrawError" class="account-error" hidden></p></section>`);
    const understood=gate.querySelector('#withdrawUnderstand'),submit=gate.querySelector('#withdrawSubmit');
    understood.onchange=()=>{submit.disabled=!understood.checked;};
    gate.querySelector('#withdrawCancel').onclick=accountMenu;
    submit.onclick=async()=>{
      submit.disabled=true;
      const keep=gate.querySelector('#keepRecovery')?.checked===true;
      try {
        clearTimeout(syncTimer);
        if (keep) {
          const {error:syncError}=await client.from('user_app_data').upsert({user_id:currentUser.id,payload:cloudPayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
          if (syncError) throw syncError;
        }
        const {error}=await client.rpc('withdraw_account',{keep_recovery:keep});
        if (error) throw error;
        if (bridge&&bridge.clearCurrentPhotos) await bridge.clearCurrentPhotos();
        if (window.RefitDietJournal?.clearLocal) await window.RefitDietJournal.clearLocal();
        await client.auth.signOut().catch(()=>{});
        currentUser=null;cloudExerciseConsent=false;window.RefitAccountSession=null;
        window.dispatchEvent(new CustomEvent('refit:session-ended'));
        if (bridge) bridge.resetForLogout();
        authView(keep?'계정 탈퇴가 완료됐습니다. 같은 이메일로 다시 가입해 1년 안에 운동 기록을 복구할 수 있습니다.':'계정 탈퇴가 완료됐습니다. 서버 기록과 이 기기의 현재 기록을 삭제했습니다.');
      } catch(error) {
        const note=gate.querySelector('#withdrawError');if(note){note.hidden=false;note.textContent='탈퇴를 완료하지 못했습니다. 서버 연결을 확인하고 다시 시도해주세요.';}
        submit.disabled=false;
      }
    };
  }
  function claimLoginIdView(message='') {
    show(gate, `<section class="account-panel" role="dialog" aria-modal="true"><div class="eyebrow">기존 계정 연결</div><h1>로그인 아이디 만들기</h1><p>현재 이메일 계정에 아이디를 연결합니다. 운동 기록과 트레이너 연결은 그대로 유지됩니다.</p>${message?`<p class="account-error" role="alert">${escapeHtml(message)}</p>`:''}<div class="field"><label for="claimLoginId">새 로그인 아이디</label><input id="claimLoginId" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" minlength="4" maxlength="20"><small>영문 소문자로 시작, 영문·숫자·밑줄 4~20자</small></div><div class="account-actions"><button id="claimIdSubmit" class="save-manual">아이디 연결</button><button id="claimIdBack" class="cancel">돌아가기</button></div></section>`);
    gate.querySelector('#claimIdSubmit').onclick=async()=>{
      const proposed=gate.querySelector('#claimLoginId').value.trim().toLowerCase();
      if(!loginIdPattern.test(proposed)){claimLoginIdView('아이디 형식을 확인해주세요.');return;}
      const {data:available,error:checkError}=await client.rpc('login_id_available',{proposed});
      if(checkError||!available){claimLoginIdView(checkError?'아이디 확인에 실패했어요. 잠시 후 다시 시도해주세요.':'이미 사용 중인 아이디입니다.');return;}
      const {data,error}=await client.rpc('claim_login_id',{proposed});
      if(error||data!==proposed){claimLoginIdView('아이디를 연결하지 못했어요. 다른 아이디로 다시 시도해주세요.');return;}
      accountMenu();
    };
    gate.querySelector('#claimIdBack').onclick=accountMenu;
  }
  async function accountMenu() {
    const [{data:membership},{data:loginId}]=await Promise.all([
      client.from('admin_memberships').select('user_id').eq('user_id',currentUser.id).maybeSingle(),
      client.rpc('my_login_id')
    ]);
    show(gate,`<section class="account-panel"><div class="eyebrow">로그인 중</div><h1>${escapeHtml(loginId||currentUser.email||'계정')}</h1><p>인증 이메일: ${escapeHtml(currentUser.email||'—')}<br>운동·신체 정보 ${cloudExerciseConsent?'서버 동기화에 동의함':'서버 동기화에 동의하지 않음'}</p><label class="account-remember"><input id="menuRememberLogin" type="checkbox" ${rememberLogin()?'checked':''}> 이 기기에서 자동 로그인</label><p class="account-footnote">공용 기기에서는 끄고 사용하세요. 끄면 브라우저를 닫을 때 로그인 상태가 해제됩니다.</p><div class="account-actions">${membership?'<button id="openAdmin" class="save-manual">운영자 데이터 보기</button>':''}${!loginId?'<button id="claimLoginId" class="save-manual">로그인 아이디 만들기</button>':''}<button id="changeConsent" class="cancel">동의 설정 변경</button>${privacy.recoveryEnabled===true?'<button id="restoreRecords" class="cancel">탈퇴 전 기록 복구</button>':''}<button id="signOut" class="cancel">로그아웃</button><button id="withdrawAccount" class="cancel">계정 탈퇴</button><button id="closeAccountMenu" class="cancel">닫기</button></div><p class="account-footnote">동의를 철회하거나 기록 삭제를 요청하려면 운영자에게 문의하세요: ${escapeHtml(privacy.contactEmail)}</p></section>`);
    gate.querySelector('#menuRememberLogin').onchange=e=>setRememberLogin(e.target.checked);
    const claimButton=gate.querySelector('#claimLoginId');if(claimButton)claimButton.onclick=()=>claimLoginIdView();
    const admin=gate.querySelector('#openAdmin');if(admin)admin.onclick=showAdmin;gate.querySelector('#changeConsent').onclick=()=>consentView('existing');const restoreButton=gate.querySelector('#restoreRecords');if(restoreButton)restoreButton.onclick=restoreRecords;gate.querySelector('#withdrawAccount').onclick=withdrawView;gate.querySelector('#closeAccountMenu').onclick=()=>gate.hidden=true;
     gate.querySelector('#signOut').onclick=async()=>{clearTimeout(syncTimer);await client.auth.signOut();currentUser=null;cloudExerciseConsent=false;window.RefitAccountSession=null;window.dispatchEvent(new CustomEvent('refit:session-ended'));userBadge.textContent='';bridge.resetForLogout();document.getElementById('localPill').textContent='로그아웃됨';authView();};
  }
  async function finishSession(user) {
    if(finishingUserId===user.id)return;
    finishingUserId=user.id;
    currentUser=user;
    try {if(!(await ensureConsent(user)))return;await loadCloudState();if(authAction==='find-id')await foundIdView();}
    catch(error){show(gate,`<section class="account-panel"><h1>계정 데이터를 불러오지 못했어요</h1><p class="account-error">${escapeHtml(authErrorKo(error))}</p><button id="retryAccount" class="cancel">다시 시도</button><button id="signOutError" class="cancel">로그아웃</button></section>`);gate.querySelector('#retryAccount').onclick=()=>finishSession(user);gate.querySelector('#signOutError').onclick=async()=>{await client.auth.signOut();currentUser=null;authView();};}
    finally {if(finishingUserId===user.id)finishingUserId=null;}
  }
  const basePersist=window.persist;
  if(typeof basePersist==='function')window.persist=function(){const ok=basePersist();if(ok&&currentUser)scheduleSync();return ok;};
  window.addEventListener('online',scheduleSync);
  accountButton.onclick=()=>authView();
  gate.hidden=false;
  show(gate,'<section class="account-panel"><div class="eyebrow">안전한 계정 연결</div><h1>연결 상태를 확인하고 있어요</h1><p>계정과 동의 기록을 확인한 다음 화면을 열겠습니다.</p></section>');
  client.auth.getSession().then(({data,error})=>{
    if(error||!data.session){authView(authCallbackNotice);return;}
    if(authAction==='reset-password'){newPasswordView();return;}
    finishSession(data.session.user);
  });
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'&&session){setTimeout(()=>newPasswordView(),0);return;}
    if(event==='SIGNED_IN'&&session&&session.user&&session.user.id!==(currentUser&&currentUser.id)){
      if(authAction==='reset-password'){setTimeout(()=>newPasswordView(),0);return;}
      setTimeout(()=>finishSession(session.user),0);
    }
    if(event==='SIGNED_OUT'){currentUser=null;cloudExerciseConsent=false;window.RefitAccountSession=null;window.dispatchEvent(new CustomEvent('refit:session-ended'));userBadge.textContent='';bridge.resetForLogout();authView();}
  });
  }
})();

