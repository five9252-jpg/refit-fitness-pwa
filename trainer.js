(() => {
  'use strict';
  const bridge = window.RefitAccountBridge;
  const topRight = document.querySelector('.top-right');
  if (!bridge || !topRight) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'profile-edit trainer-open';
  button.textContent = '트레이너 연결';
  topRight.insertBefore(button, topRight.firstChild);
  const switchButton = document.createElement('button');
  switchButton.type = 'button';
  switchButton.className = 'profile-edit role-switch';
  switchButton.textContent = '화면 선택';
  topRight.insertBefore(switchButton, button);
  const entry = document.createElement('div');
  entry.id = 'roleEntry';
  entry.className = 'role-entry';
  entry.hidden = true;
  document.body.appendChild(entry);
  const overlay = document.createElement('div');
  overlay.id = 'trainerOverlay';
  overlay.className = 'trainer-overlay';
  overlay.hidden = true;
  document.body.appendChild(overlay);
  const style = document.createElement('style');
  style.textContent = `.trainer-overlay{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;padding:16px;background:#152D30b3}.trainer-overlay[hidden]{display:none}.trainer-panel{width:min(800px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:24px;border-radius:22px;background:#fff;box-shadow:0 25px 80px #102b3650}.trainer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.trainer-head h2{margin:2px 0;font-size:24px;letter-spacing:-.04em}.trainer-head p{font-size:12px;color:#607078;margin:5px 0 0}.trainer-close,.trainer-tabs button,.trainer-subtle{border:1px solid #e5eaec;border-radius:10px;padding:9px 12px;background:#fff;color:#023F46;font-size:12px;font-weight:800;cursor:pointer}.trainer-tabs{display:flex;gap:8px;margin:18px 0}.trainer-tabs button.active{background:#023F46;color:#fff;border-color:#023F46}.trainer-card{border:1px solid #e5eaec;border-radius:15px;padding:16px;margin:12px 0;background:#f8fafb}.trainer-card h3{font-size:15px;margin:0 0 7px}.trainer-card p{font-size:12px;line-height:1.6;color:#53666d;margin:7px 0}.trainer-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.trainer-row input[type=checkbox]{width:19px;height:19px;flex:none;accent-color:#023F46}.trainer-permission-choice{display:flex;align-items:flex-start;gap:12px;margin:14px 0;padding:14px;border:1px solid #b8d4c6;border-radius:13px;background:#edf6f0;color:#173f35}.trainer-permission-choice input{width:21px;height:21px;flex:none;margin:1px 0 0;accent-color:#286448}.trainer-permission-choice strong,.trainer-permission-choice small{display:block}.trainer-permission-choice strong{font-size:13px}.trainer-permission-choice small{margin-top:5px;color:#536b5d;font-size:11px;line-height:1.5}.trainer-field{display:block;font-size:11px;font-weight:800;color:#53666d;margin:11px 0}.trainer-field input,.trainer-field textarea,.trainer-field select{display:block;width:100%;min-height:42px;margin-top:5px;padding:9px 10px;border:1px solid #e0eaec;border-radius:10px;background:#fff;color:#152D30;font:inherit;font-size:13px}.trainer-field textarea{min-height:72px;resize:vertical}.trainer-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.trainer-primary{min-height:42px;border:0;border-radius:11px;background:#023F46;color:#fff;padding:10px 16px;font-size:12px;font-weight:800;cursor:pointer}.trainer-primary:disabled{opacity:.5;cursor:not-allowed}.trainer-code{display:inline-block;padding:11px 14px;border:1px solid #dcefea;border-radius:11px;background:#EDF7F2;color:#023F46;font-size:17px;font-weight:850;letter-spacing:.12em;word-break:break-all}.trainer-note{font-size:11px;color:#607078;line-height:1.6}.trainer-error{padding:11px;border-radius:10px;background:#fff2ef;color:#9a3e32;font-size:12px}.trainer-log{border-top:1px solid #e5eaec;padding:13px 0}.trainer-log:first-of-type{border-top:0}.trainer-log h4{font-size:13px;margin:0 0 4px}.trainer-log small{color:#607078;font-size:10px}.trainer-comments{margin-top:10px;padding:10px;border-radius:11px;background:#f1f6f7}.trainer-comment{font-size:11px;line-height:1.5;padding:7px 0;border-bottom:1px solid #e5eaec}.trainer-comment:last-child{border:0}.trainer-comment b{color:#023F46}.trainer-comment time{color:#607078;margin-left:7px}.trainer-comment-form{display:flex;gap:7px;margin-top:8px}.trainer-comment-form input{flex:1;min-width:0;border:1px solid #e3eaec;border-radius:9px;padding:9px;font-size:12px}.trainer-comment-form button{border:0;border-radius:9px;background:#023F46;color:#fff;padding:9px 11px;font-size:11px;font-weight:800}.trainer-journal-comments{margin-top:10px}.trainer-empty{color:#607078;font-size:12px;padding:18px 0}@media(max-width:560px){.trainer-panel{padding:17px;border-radius:17px}.trainer-fields{grid-template-columns:1fr}.trainer-comment-form{flex-direction:column}.trainer-open{font-size:10px;padding:7px 9px!important}.topbar{height:auto;min-height:64px;flex-wrap:wrap;gap:6px;padding:9px 0}.top-right{margin-left:auto;gap:6px}.top-right .avatar{display:none}}`;
  style.textContent += `.role-entry{position:fixed;inset:0;z-index:1050;display:grid;place-items:center;overflow:auto;padding:24px;background:#f7f9fa}.role-entry[hidden]{display:none}.role-entry-inner{width:min(760px,100%)}.role-entry-brand{display:flex;align-items:center;gap:10px;color:#023F46;font-size:15px;font-weight:900}.role-entry-brand img{width:36px;height:36px}.role-entry-brand-copy{display:flex;flex-direction:column;align-items:center;gap:3px;line-height:1.1}.role-entry-brand-copy strong{font-size:15px}.role-entry-brand-copy small{font-size:9px;color:#607078;font-weight:700}.role-entry h1{margin:35px 0 8px;font-size:clamp(28px,5vw,42px);line-height:1.2;letter-spacing:-.055em}.role-entry-intro{margin:0 0 28px;color:#607078;font-size:15px}.role-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.role-choice{min-height:210px;text-align:left;border:1px solid #e5eaec;border-radius:22px;background:#fff;padding:24px;box-shadow:0 14px 35px #20343a10;color:#152D30;cursor:pointer;transition:transform .2s,box-shadow .2s}.role-choice:hover,.role-choice:focus-visible{transform:translateY(-3px);box-shadow:0 20px 40px #20343a22;outline:2px solid #a1c6cf}.role-choice-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#E8F3EF;color:#023F46;font-size:22px;margin-bottom:25px}.role-choice strong{display:block;font-size:23px;letter-spacing:-.04em}.role-choice span:last-child{display:block;margin-top:8px;color:#607078;font-size:13px;line-height:1.5}.role-entry-note{margin-top:20px;color:#607078;font-size:12px;line-height:1.6}.trainer-member-select{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:end}.trainer-member-select .trainer-field{margin:0}.trainer-member-select button{white-space:nowrap}@media(max-width:560px){.role-entry{padding:18px}.role-entry h1{margin-top:28px}.role-choices{grid-template-columns:1fr}.role-choice{min-height:150px;padding:20px}.role-choice-mark{margin-bottom:12px}.trainer-member-select{grid-template-columns:1fr 1fr}.trainer-member-select .trainer-field{grid-column:1/-1}.trainer-member-select button{white-space:normal}}`;
  style.textContent += `.trainer-profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.trainer-profile-item{padding:11px;border-radius:11px;background:#fff;border:1px solid #e5eaec;min-width:0}.trainer-profile-item small{display:block;color:#718087;font-size:10px;margin-bottom:5px}.trainer-profile-item strong{display:block;color:#153c3f;font-size:13px;overflow-wrap:anywhere}.trainer-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.trainer-summary-stat{padding:12px;border-radius:12px;background:#f0f6f4}.trainer-summary-stat small{display:block;color:#607078;font-size:10px}.trainer-summary-stat strong{display:block;margin-top:4px;color:#023F46;font-size:17px}.trainer-diet-day{border-top:1px solid #e5eaec;padding-top:12px;margin-top:12px}.trainer-diet-day h4{margin:0 0 8px;color:#153c3f}.trainer-diet-macros{display:flex;flex-wrap:wrap;gap:6px}.trainer-diet-macros span{border-radius:20px;background:#f0f6f4;padding:5px 8px;font-size:10px;color:#355c55}.trainer-diet-entry{padding:8px 0;border-top:1px solid #edf0f0}.trainer-diet-entry:first-of-type{border-top:0}.trainer-diet-entry strong{font-size:12px}.trainer-diet-entry small{display:block;margin-top:3px;color:#607078;font-size:10px}.trainer-section-title{display:flex;justify-content:space-between;align-items:center;gap:10px}.trainer-section-title small{font-weight:500;color:#718087;font-size:10px}@media(max-width:560px){.trainer-profile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.trainer-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  style.textContent += `.keep-word{white-space:nowrap}`;
  style.textContent += ".trainer-nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.trainer-nav button{border:1px solid #dce8e4;border-radius:999px;padding:9px 14px;background:#f3f8f6;color:#315d53;font-size:12px;font-weight:800;cursor:pointer}.trainer-nav button[aria-current=true]{background:#023F46;color:#fff;border-color:#023F46}.class-week{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;margin:14px 0}.class-week-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.class-day{min-height:57px;border:1px solid #e1eae7;border-radius:12px;background:#fff;color:#153c3f;cursor:pointer;font:inherit}.class-day small,.class-day strong{display:block}.class-day small{font-size:10px;color:#70837e}.class-day strong{margin-top:5px;font-size:13px}.class-day[aria-pressed=true]{background:#e7f3ed;border-color:#78a78c;box-shadow:inset 0 0 0 1px #78a78c}.class-day.has-session:after{content:'';display:block;width:5px;height:5px;border-radius:50%;background:#d0e96d;margin:3px auto 0}.class-session{display:grid;grid-template-columns:82px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px 0;border-top:1px solid #e6ecea}.class-time{color:#15534d;font-weight:850;font-size:15px}.class-session h4{margin:0;font-size:13px}.class-session p{margin:5px 0;color:#607078;font-size:11px;line-height:1.5}.class-journal{grid-column:2/4;padding:12px;border-radius:13px;background:#f5f8f7}.class-journal summary{cursor:pointer;font-size:12px;font-weight:800;color:#164c48}.class-journal-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.class-journal-grid label:last-child{grid-column:1/-1}.class-journal-grid textarea{min-height:62px}.class-status{font-size:10px;padding:4px 7px;border-radius:99px;background:#e8f3ef;color:#315d53}.class-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 9px}.class-form .wide{grid-column:span 2}.class-form .full{grid-column:1/-1}@media(max-width:560px){.class-week{grid-template-columns:1fr}.class-week-days{gap:3px}.class-day{min-height:52px}.class-session{grid-template-columns:55px minmax(0,1fr)}.class-session>[data-cancel-session]{grid-column:2;justify-self:start}.class-journal{grid-column:1/-1}.class-journal-grid{grid-template-columns:1fr}.class-journal-grid label:last-child{grid-column:auto}.class-form{grid-template-columns:1fr 1fr}.class-form .wide{grid-column:span 2}}";
    style.textContent += `.class-view-tabs{display:flex;gap:7px;margin:14px 0}.class-view-tabs button{border:1px solid #dce8e4;border-radius:10px;background:#fff;color:#315d53;padding:9px 14px;font-weight:800;font-size:12px}.class-view-tabs button[aria-pressed=true]{background:#023F46;color:#fff;border-color:#023F46}.class-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin:12px 0}.class-month-grid .class-weekday{padding:5px;text-align:center;color:#718087;font-size:10px}.class-month-grid .class-day{min-height:42px}.class-month-grid .class-day.outside-month{opacity:.42}.class-session-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.class-kind{font-size:10px;padding:4px 8px;border-radius:20px;background:#e6f0f3;color:#15534d;font-weight:850}.class-journal-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(210px,.8fr);gap:12px;margin-top:10px}.class-journal-main,.class-trainer-memo{min-width:0;padding:12px;border-radius:12px;background:#fff;border:1px solid #e2eae8}.class-journal-layout .trainer-field{margin:0 0 10px}.class-exercise-entry{padding:10px;margin:8px 0;border-radius:11px;background:#f4f8f6;border:1px solid #e0eae5}.class-exercise-entry-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}.class-exercise-entry-head input,.class-set-row input{width:100%;min-width:0;border:1px solid #dce8e4;border-radius:8px;padding:8px;font:inherit;font-size:12px}.class-exercise-entry-head button,.class-set-row button,.class-add-exercise{border:1px solid #dce8e4;border-radius:8px;background:#fff;color:#15534d;padding:7px 9px;font-weight:800;font-size:11px}.class-set-row{display:grid;grid-template-columns:54px minmax(0,1fr) minmax(0,1fr) auto;gap:6px;align-items:center;margin-top:7px}.class-set-row small{color:#718087;font-size:10px}.class-journal-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.class-next-plan{margin-top:10px;padding:12px;border-radius:12px;background:#eef5f1}.class-next-plan textarea{min-height:70px}.class-fixed-row{display:flex;align-items:flex-start;gap:8px;padding:10px 0;color:#315d53;font-size:12px}.class-fixed-row input{margin-top:2px;accent-color:#023F46}.class-fixed-until{max-width:220px}.class-title-visible{font-size:16px!important;font-weight:900!important}.class-count{font-size:12px!important;font-weight:750!important;color:#15534d!important}@media(max-width:650px){.class-journal-layout{grid-template-columns:1fr}.class-month-grid{gap:3px}.class-month-grid .class-day{min-height:38px}.class-set-row{grid-template-columns:44px minmax(0,1fr) minmax(0,1fr) auto}.class-view-tabs{width:100%}.class-view-tabs button{flex:1;padding:9px 5px}}`;
  document.head.appendChild(style);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session = () => window.RefitAccountSession;
  const sameSession = captured => Boolean(captured && session()?.user?.id === captured.user.id);
  let activeRole = null;
  let viewEpoch = 0;
  const directoryState = {query:'',filter:'all',group:'all',page:1};
  let directoryRows=[],directoryOwner=null;
  const memberPeriods=new Map();
  const periodFor=id=>{if(!memberPeriods.has(id))memberPeriods.set(id,{mode:'all',anchor:window.PacefitRecordPeriod.day(new Date())});return memberPeriods.get(id);};
  const displayName=(owner,id,fallback)=>window.PacefitTrainerWorkspace.loadAliases?.(owner)?.[id]||fallback;
  const appRoot = document.querySelector('.app');
  const originalOverflow = document.body.style.overflow;
  function syncWorkspace() {
    const on = activeRole === 'trainer' && !overlay.hidden;
    overlay.classList.toggle('trainer-workspace',on);
    if (appRoot) appRoot.inert = on;
    document.body.style.overflow = on ? 'hidden' : originalOverflow;
  }
  const close = () => { if (activeRole === 'trainer') { showEntry(); return; } viewEpoch++; overlay.hidden = true; syncWorkspace(); button.focus(); };
  function showEntry() {
    viewEpoch++;
    activeRole = null;
    overlay.hidden = true;
    syncWorkspace();
    const profileBackdrop = document.getElementById('profileBackdrop');
    if (profileBackdrop) profileBackdrop.classList.remove('open');
    overlay.hidden = true;
    entry.innerHTML = `<div class="role-entry-inner"><div class="role-entry-brand"><img src="./assets/brand/facefit-logo-social.png" alt=""><span class="role-entry-brand-copy"><strong>페이스핏</strong><small>운동 메이트</small></span></div><h1>오늘은 어떤 화면으로<br>시작할까요?</h1><p class="role-entry-intro">운동을 기록하거나, 회원의 운동을 함께 관리하세요.</p><div class="role-choices"><button class="role-choice" id="enterPersonal" type="button"><span class="role-choice-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20c.4-4 2.6-6 6.5-6s6.1 2 6.5 6"/></svg></span><strong>개인</strong><span>내 운동 추천과 일지를 확인하고 기록하기</span></button><button class="role-choice" id="enterTrainer" type="button"><span class="role-choice-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M8 11h8M8 15h5"/></svg></span><strong>트레이너</strong><span>연결된 회원을 선택하고 운동을 대신 기록하기</span></button></div><p class="role-entry-note">회원 기록 공유와 대리 작성은 회원의 동의와 서버 연결이 필요합니다.</p></div>`;
    entry.hidden = false;
    entry.querySelector('#enterPersonal').onclick = () => {
      activeRole = 'personal'; entry.hidden = true;
      const state = bridge.getState();
      if (state && !state.profile && !state.onboardingSkipped && !state.demo && typeof window.openProfile === 'function') window.openProfile();
    };
    entry.querySelector('#enterTrainer').onclick = () => { activeRole = 'trainer'; entry.hidden = true; trainerView(); };
    entry.querySelector('#enterPersonal').focus();
  }
  const shell = (title, intro, body) => `<section class="trainer-panel" role="dialog" aria-modal="true" aria-label="트레이너와 회원"><div class="trainer-head"><div><h2>${esc(title)}</h2><p>${esc(intro)}</p></div><button class="trainer-close" type="button" data-close>${activeRole === 'trainer' ? '화면 선택' : '닫기'}</button></div><div id="trainerContent">${body}</div></section>`;
  const show = html => { overlay.innerHTML = html; overlay.hidden = false; syncWorkspace(); overlay.querySelector('[data-close]').onclick = close; overlay.querySelector('[data-close]').focus(); overlay.querySelectorAll('[data-mode]').forEach(tab => tab.onclick = () => tab.dataset.mode === 'member' ? memberView() : tab.dataset.mode === 'schedule' ? trainerScheduleView() : trainerView()); };
  const errorText = error => esc(error?.message || '서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
  const tryQuery = async work => { const epoch=viewEpoch, owner=session(); try { return await work(); } catch (error) { if(epoch===viewEpoch && sameSession(owner)) show(shell('연결 오류', '서버 설정을 확인해주세요.', `<p class="trainer-error">${errorText(error)}</p>`)); return null; } };
  const assertResult = result => { if (result?.error) throw result.error; return result?.data; };
  // Older production schemas do not yet have these optional sharing features.
  // Fall back only for missing schema; permission and network errors still surface.
  const schemaAvailable = {trainerSharing:true,poseSharing:true};
  async function optionalQuery(query, feature) {
    const result = await query;
    if (['42703','42P01','PGRST204','PGRST205'].includes(result?.error?.code)) {
      schemaAvailable[feature] = false;
      return {data:null,error:null};
    }
    return result;
  }

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
      const [links, ownProfile, shareRow] = await Promise.all([
        s.client.from('trainer_member_links').select('trainer_id,status,can_write,updated_at').eq('member_id',s.user.id),
        s.client.from('trainer_profiles').select('invite_code').eq('user_id',s.user.id).maybeSingle(),
        optionalQuery(s.client.from('member_trainer_shares').select('share_pose').eq('user_id',s.user.id).maybeSingle(),'poseSharing')
      ]).then(rows => rows.map(assertResult));
      const ids = (links || []).map(row => row.trainer_id);
      let profiles = ids.length ? assertResult(await optionalQuery(s.client.from('trainer_profiles').select('user_id,display_name,share_workouts_with_members').in('user_id',ids),'trainerSharing')) : [];
      if (ids.length && !schemaAvailable.trainerSharing) profiles = assertResult(await s.client.from('trainer_profiles').select('user_id,display_name').in('user_id',ids));
      const activeLinks=(links||[]).filter(row=>row.status==='active'),trainerIds=activeLinks.filter(row=>profiles.find(profile=>profile.user_id===row.trainer_id)?.share_workouts_with_members).map(row=>row.trainer_id);
      const shared=trainerIds.length?assertResult(await optionalQuery(s.client.from('trainer_shared_workouts').select('id,trainer_id,workout_date,title,items,note').in('trainer_id',trainerIds).order('workout_date',{ascending:false}).limit(30),'trainerSharing'))||[]:[];
      return { links: links || [], ownInviteCode: ownProfile?.invite_code || '', sharePose:shareRow?.share_pose===true, names: Object.fromEntries((profiles || []).map(row => [row.user_id,row.display_name])), shared };
    });
    if (!sameSession(s)) return;
    if (!result) return;
    const active = result.links.filter(row => row.status === 'active');
    show(shell('내 트레이너', '공유할 자료를 각각 선택할 수 있어요.', `<div class="trainer-card"><h3>트레이너 코드 등록</h3><p>연결되면 허용한 자료만 트레이너에게 보입니다. 대리 기록은 따로 허용할 수 있어요.</p><label class="trainer-field">트레이너 코드<input id="trainerInviteCode" maxlength="32" autocomplete="off" placeholder="예: ABCD-EFGH-IJKL-MNOP"></label><label class="trainer-permission-choice"><input id="trainerManagementConsent" type="checkbox"><span><strong>회원 관리에 필요한 트레이너 기능을 허용합니다</strong><small>연결된 트레이너가 운동 기록을 대신 작성하고 수업일지를 작성할 수 있습니다. 저장에 동의한 식단 기록·사진과 자세 체크 요약도 공유합니다. 식단 서버 저장 동의가 꺼져 있으면 식단은 공유되지 않습니다. 카메라 영상과 AI 사진 분석은 포함되지 않으며, 권한은 나중에 변경할 수 있습니다.</small></span></label><button class="trainer-primary" id="joinTrainer" type="button">동의하고 코드 등록</button></div>${active.length?`<div class="trainer-card"><h3>자세 체크 공유</h3><p>요약 결과만 공유하며 카메라 영상은 저장하거나 전송하지 않습니다.</p><label class="trainer-row trainer-note"><span>연결된 트레이너가 자세 체크 결과 보기</span><input id="sharePoseChoice" type="checkbox" ${result.sharePose?'checked':''}></label></div>`:'' }</div><div class="trainer-card"><h3>트레이너가 공개한 운동</h3>${result.shared.length?result.shared.map(row=>`<div class="trainer-log"><h4>${esc(row.title)}</h4><small>${esc(result.names[row.trainer_id]||'트레이너')} · ${esc(row.workout_date)}</small><p>${(row.items||[]).map(trainerItemMarkup).join('<br>')}</p>${row.note?`<p>${esc(row.note)}</p>`:''}</div>`).join(''):'<p class="trainer-empty">트레이너가 본인 운동 기록을 공개하면 여기에 표시됩니다.</p>'}</div><h3>연결된 트레이너</h3>${active.length ? active.map(row => `<div class="trainer-card"><div class="trainer-row"><strong>${esc(result.names[row.trainer_id]||'트레이너')}</strong><button class="trainer-subtle" data-revoke="${esc(row.trainer_id)}" type="button">연결 해제</button></div><label class="trainer-permission-choice"><input type="checkbox" data-write="${esc(row.trainer_id)}" ${row.can_write?'checked':''}><span><strong>트레이너 대리 작성 허용</strong><small>끄면 이후 트레이너가 회원 이름으로 새 운동 기록을 추가할 수 없습니다.</small></span></label></div>`).join('') : '<p class="trainer-empty">아직 연결된 트레이너가 없어요.</p>'}<p class="trainer-note">식단 공유는 식단 화면의 저장·사진 인식 동의 설정에서 별도로 허용할 수 있습니다. 운동 사진은 이 기기에만 저장되어 트레이너에게 보이지 않습니다.</p>`));
    overlay.querySelector('#sharePoseChoice').disabled=!schemaAvailable.poseSharing;
    if(!schemaAvailable.poseSharing) overlay.querySelector('#trainerContent').insertAdjacentHTML('afterbegin','<p class="trainer-note">현재 서버는 자세 결과 공유를 지원하지 않아 설정을 변경할 수 없습니다.</p>');
    overlay.querySelector('#sharePoseChoice').onchange=async event=>{if(!schemaAvailable.poseSharing)return;const {error}=await s.client.rpc('set_member_pose_sharing',{enabled:event.target.checked});if(error){event.target.checked=!event.target.checked;alert('자세 기록 공유 설정을 저장하지 못했습니다. 서버 설정을 업데이트해주세요.')}};
    overlay.querySelector('#joinTrainer').onclick = async () => {
      const code = overlay.querySelector('#trainerInviteCode').value.trim();
      const showCodeError = message => {
        overlay.querySelector('#trainerContent > .trainer-error')?.remove();
        overlay.querySelector('#trainerContent').insertAdjacentHTML('afterbegin', `<p class="trainer-error" role="alert">${esc(message)}</p>`);
      };
      if (!/^[A-Za-z0-9-]{12,32}$/.test(code)) { showCodeError('트레이너 코드를 확인해주세요.'); overlay.querySelector('#trainerInviteCode').focus(); return; }
      if (code.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === result.ownInviteCode) {
        showCodeError('현재 로그인한 계정의 코드입니다. 회원은 별도 계정으로 로그인해 이 트레이너 코드를 등록해야 합니다.');
        return;
      }
      const consent=overlay.querySelector('#trainerManagementConsent');
      if(!consent.checked){showCodeError('트레이너와 연결하려면 관리 권한 범위를 확인하고 동의해주세요.');consent.focus();return;}
      const {data:dietConsent,error:dietReadError}=await s.client.from('diet_consents').select('server_storage,ai_photo_analysis,share_with_trainer,notice_version').eq('user_id',s.user.id).maybeSingle();
      if(dietReadError){showCodeError('식단 공유 동의를 확인할 수 없어 연결하지 않았습니다. 다시 시도해주세요.');return;}
      const {error} = await s.client.rpc('join_trainer',{code,allow_trainer_write:true});
      if (error) { showCodeError(error.message === 'Invalid trainer code' ? '코드를 찾을 수 없습니다. 트레이너 화면에 표시된 코드를 다시 확인해주세요.' : error.message || '트레이너 연결에 실패했어요.'); return; }
      const permissionErrors=[];
      if(schemaAvailable.poseSharing){const {error:poseError}=await s.client.rpc('set_member_pose_sharing',{enabled:true});if(poseError)permissionErrors.push('자세 결과 공유');}
      if(dietConsent?.server_storage===true){const consentRow={user_id:s.user.id,server_storage:true,ai_photo_analysis:dietConsent.ai_photo_analysis===true,share_with_trainer:true,notice_version:'2026-11-18-trainer-management-v1',accepted_at:new Date().toISOString()};const {error:shareError}=await s.client.from('diet_consents').upsert(consentRow,{onConflict:'user_id'});if(shareError)permissionErrors.push('식단 공유');else{const {error:eventError}=await s.client.from('diet_consent_events').insert(consentRow);if(eventError)permissionErrors.push('식단 공유 동의 이력');}}
      if(permissionErrors.length)alert(`트레이너 연결은 완료했지만 ${permissionErrors.join(', ')} 설정은 저장되지 않았습니다. 권한 설정을 확인해주세요.`);
      else if(dietConsent?.server_storage!==true)alert('트레이너 연결을 완료했습니다. 식단 서버 저장 동의가 꺼져 있어 식단은 공유되지 않습니다.');
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
    const epoch = ++viewEpoch;
    const s = session();
    if (!s) return localView();
    show(shell('회원 관리', 'PACEFIT · 트레이너 작업공간', '<p class="trainer-note" role="status">공유 회원 목록을 불러오는 중…</p>'));
    let profileResult = await optionalQuery(s.client.from('trainer_profiles').select('user_id,display_name,invite_code,share_workouts_with_members').eq('user_id',s.user.id).maybeSingle(),'trainerSharing');
    if (!sameSession(s) || epoch !== viewEpoch) return;
    if (!schemaAvailable.trainerSharing) profileResult = await s.client.from('trainer_profiles').select('user_id,display_name,invite_code').eq('user_id',s.user.id).maybeSingle();
    if (!sameSession(s) || epoch !== viewEpoch) return;
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
      // The list needs names and workouts, not potentially large report images.
      const records = ids.length ? assertResult(await s.client.from('user_app_data').select('user_id,profile:payload->profile,logs:payload->logs,updated_at').in('user_id',ids)) || [] : [];
      return {links,records:Object.fromEntries(records.map(row=>[row.user_id,{user_id:row.user_id,updated_at:row.updated_at,payload:{profile:row.profile,logs:row.logs}}]))};
    });
    if (!sameSession(s) || epoch !== viewEpoch) return;
    if (!result) return;
    const code = profile.invite_code.replace(/(.{4})/g,'$1-').replace(/-$/,'');
    const rawRows = window.PacefitTrainerWorkspace.members(result.links,result.records);
    const rows = window.PacefitTrainerWorkspace.aliasRows?.(rawRows,s.user.id)||rawRows;
    directoryRows=rows;directoryOwner=s.user.id;
    show(shell('회원 관리', '페이스핏 · 트레이너 작업공간', `<nav class="trainer-nav" aria-label="트레이너 메뉴"><button type="button" data-mode="members" aria-current="true">회원 관리</button><button type="button" data-mode="schedule">수업 일정 · 일지</button></nav><div class="tw-layout"><section><h3>오늘 확인할 회원을 찾아보세요</h3><p class="trainer-note">공유 운동 기준 · 7일 이상 기록이 없는 회원을 확인하세요. 공유 데이터 없음은 미동의·미저장 등으로 조회되지 않은 상태이며 이유를 단정하지 않습니다. 트레이너가 별도로 작성한 수업 기록은 회원 상세에서 확인하세요.</p><div id="trainerDirectory"></div>${!rows.length?'<p class="trainer-empty">아직 연결된 회원이 없어요. 초대 코드를 회원에게 전달하세요.</p>':''}</section><aside class="tw-sidebar"><div class="trainer-card"><h3>회원 초대 코드</h3><div class="trainer-code">${esc(code)}</div><p>회원이 연결과 정보 공유에 동의해야 볼 수 있어요.</p></div><div class="trainer-card"><h3>내 운동 기록 공개 (선택)</h3><p>켜면 공개한 운동 기록을 연결 회원이 볼 수 있어요. 기본값은 비공개예요.</p><label class="trainer-row trainer-note"><span>회원에게 공개 동의</span><input id="trainerShareOwnChoice" type="checkbox" ${profile.share_workouts_with_members?'checked':''}></label><button class="trainer-subtle" id="publishOwnWorkouts" type="button" ${profile.share_workouts_with_members?'':'disabled'}>내 최근 운동 기록 업데이트</button></div></aside></div>`));
    window.PacefitTrainerWorkspace.mount(overlay.querySelector('#trainerDirectory'),rows,directoryState,memberRecords,{groups:window.PacefitTrainerWorkspace.loadGroups(s.user.id),onGroupChange:(memberId,group)=>{if(!sameSession(s))return false;const ok=window.PacefitTrainerWorkspace.saveGroup(s.user.id,memberId,group);if(!ok)alert('회원 분류를 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.');return ok;}});
    const shareOwn=overlay.querySelector('#trainerShareOwnChoice'),publish=overlay.querySelector('#publishOwnWorkouts');shareOwn.disabled=!schemaAvailable.trainerSharing;
    if(!schemaAvailable.trainerSharing){publish.disabled=true;overlay.querySelector('#trainerContent').insertAdjacentHTML('afterbegin','<p class="trainer-note">현재 서버는 트레이너 운동 공개를 지원하지 않아 해당 기능은 꺼져 있습니다. 회원 관리와 기존 <span class="keep-word">대리기록</span>은 사용할 수 있습니다.</p>');}
    shareOwn.onchange=async()=>{if(!schemaAvailable.trainerSharing)return;const {error}=await s.client.rpc('set_trainer_workout_sharing',{enabled:shareOwn.checked});if(error){shareOwn.checked=!shareOwn.checked;alert('공개 설정을 저장하지 못했습니다. 새 서버 정책을 적용해주세요.');return;}publish.disabled=!shareOwn.checked;if(!shareOwn.checked){const removed=await s.client.from('trainer_shared_workouts').delete().eq('trainer_id',s.user.id);if(removed.error)alert('공개는 껐지만 저장된 공개 사본을 정리하지 못했습니다. 운영자에게 확인이 필요합니다.');}};
    publish.onclick=async()=>{if(!schemaAvailable.trainerSharing||!shareOwn.checked)return;const ownLogs=(bridge.getState()?.logs||[]).filter(row=>Array.isArray(row.items)).slice(-20);if(!ownLogs.length){alert('공개할 운동 기록이 없습니다.');return;}publish.disabled=true;try{const old=await s.client.from('trainer_shared_workouts').delete().eq('trainer_id',s.user.id);if(old.error)throw old.error;const rows=ownLogs.map(row=>({trainer_id:s.user.id,workout_date:row.date,title:String(row.title||'운동 기록').slice(0,100),items:row.items,note:String(row.note||'').slice(0,1000)}));const {error}=await s.client.from('trainer_shared_workouts').insert(rows);if(error)throw error;alert('최근 운동 기록을 연결 회원에게 공개했습니다.');}catch{alert('운동 기록을 공개하지 못했습니다. 서버 정책을 확인해주세요.');}finally{publish.disabled=false;}};
  }

  const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const shiftDate = (date, days) => { const next = new Date(date); next.setDate(next.getDate()+days); return next; };
  const sessionDate = row => new Date(row.session_at);
  let scheduleViewMode='week';
  async function trainerScheduleView(anchorValue, modeValue) {
    const epoch=++viewEpoch,s=session(); if(!s)return localView();
    const anchor=anchorValue?new Date(`${anchorValue}T12:00:00`):new Date();
    if(modeValue)scheduleViewMode=modeValue;
    const mode=scheduleViewMode,monday=shiftDate(anchor,-((anchor.getDay()+6)%7));
    const monthStart=new Date(anchor.getFullYear(),anchor.getMonth(),1,12),monthEnd=new Date(anchor.getFullYear(),anchor.getMonth()+1,1,12);
    const start=mode==='today'?new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate(),12):mode==='month'?monthStart:monday;
    const end=mode==='today'?shiftDate(start,1):mode==='month'?monthEnd:shiftDate(monday,7);
    const from=`${localDay(start)}T00:00:00+09:00`,to=`${localDay(end)}T00:00:00+09:00`;
    show(shell('수업 일정 · 일지','수업을 확인하고, 운동일지처럼 종목과 세트를 기록해요.','<p class="trainer-note" role="status">일정을 불러오는 중…</p>'));
    const result=await tryQuery(async()=>{
      const links=assertResult(await s.client.from('trainer_member_links').select('member_id,status').eq('trainer_id',s.user.id).eq('status','active'))||[],ids=links.map(row=>row.member_id);
      const [records,schedules]=await Promise.all([
        ids.length?s.client.from('user_app_data').select('user_id,profile:payload->profile').in('user_id',ids):Promise.resolve({data:[],error:null}),
        s.client.from('trainer_class_sessions').select('id,trainer_id,member_id,session_at,duration_minutes,title,status,session_type,is_fixed,created_at').eq('trainer_id',s.user.id).gte('session_at',from).lt('session_at',to).order('session_at',{ascending:true})
      ]);
      if(records.error)throw records.error;
      const members=(records.data||[]).map(row=>({id:row.user_id,name:displayName(s.user.id,row.user_id,row.profile?.name||'이름 미입력')})),sessions=assertResult(schedules)||[];
      const journals=sessions.length?assertResult(await s.client.from('trainer_lesson_journals').select('session_id,lesson_summary,private_notes,next_steps,workout_items,lesson_completed,updated_at').in('session_id',sessions.map(row=>row.id)))||[]:[];
      return {members,sessions,journals:Object.fromEntries(journals.map(row=>[row.session_id,row]))};
    });
    if(!sameSession(s)||epoch!==viewEpoch||!result)return;
    const selected=localDay(anchor),daySessions=result.sessions.filter(row=>localDay(sessionDate(row))===selected),sessionDates=new Set(result.sessions.map(row=>localDay(sessionDate(row))));
    const memberName=id=>result.members.find(row=>row.id===id)?.name||'연결 회원';
    const weekDays=Array.from({length:7},(_,i)=>shiftDate(monday,i)),weekMarkup=weekDays.map(day=>`<button class="class-day ${sessionDates.has(localDay(day))?'has-session':''}" type="button" data-schedule-day="${localDay(day)}" aria-pressed="${localDay(day)===selected}"><small>${new Intl.DateTimeFormat('ko-KR',{weekday:'short'}).format(day)}</small><strong>${day.getDate()}일</strong></button>`).join('');
    const monthOffset=(monthStart.getDay()+6)%7,monthDays=Array.from({length:42},(_,i)=>shiftDate(monthStart,i-monthOffset));
    const monthMarkup=`<div class="class-month-grid">${['월','화','수','목','금','토','일'].map(day=>`<div class="class-weekday">${day}</div>`).join('')}${monthDays.map(day=>`<button class="class-day ${sessionDates.has(localDay(day))?'has-session':''} ${day.getMonth()!==anchor.getMonth()?'outside-month':''}" type="button" data-schedule-day="${localDay(day)}" aria-pressed="${localDay(day)===selected}"><strong>${day.getDate()}</strong></button>`).join('')}</div>`;
    const options=result.members.map(row=>`<option value="${esc(row.id)}">${esc(row.name)}</option>`).join('');
    const exerciseOptions=`<datalist id="trainerExerciseOptions">${(window.PACEFIT_LIBRARY||[]).map(item=>`<option value="${esc(item.name)}"></option>`).join('')}</datalist>`;
    const defaultSet=()=>`<div class="class-set-row"><small>1세트</small><input name="set_weight" type="number" min="0" max="1000" step="0.1" placeholder="무게 kg" aria-label="세트 무게 kg"><input name="set_reps" type="number" min="1" max="100" step="1" placeholder="횟수" aria-label="세트 횟수"><button type="button" data-remove-set aria-label="세트 삭제">×</button></div>`;
    const exerciseEntry=item=>`<div class="class-exercise-entry" data-exercise-entry><div class="class-exercise-entry-head"><input name="exercise_name" maxlength="80" list="trainerExerciseOptions" placeholder="운동 이름 검색 또는 입력" aria-label="운동 이름" value="${esc(item?.name||'')}"><button type="button" data-remove-exercise>삭제</button></div><div class="class-set-list">${(Array.isArray(item?.sets)&&item.sets.length?item.sets:[{}]).map((set,index)=>`<div class="class-set-row"><small>${index+1}세트</small><input name="set_weight" type="number" min="0" max="1000" step="0.1" placeholder="무게 kg" aria-label="${index+1}세트 무게 kg" value="${esc(set.weight??'')}"><input name="set_reps" type="number" min="1" max="100" step="1" placeholder="횟수" aria-label="${index+1}세트 횟수" value="${esc(set.reps??'')}"><button type="button" data-remove-set aria-label="세트 삭제">×</button></div>`).join('')}</div><button type="button" class="class-add-exercise" data-add-set>+ 세트 추가</button></div>`;
    const cards=daySessions.length?daySessions.map(row=>{
      const journal=result.journals[row.id]||{},date=sessionDate(row),time=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(date),savedItems=Array.isArray(journal.workout_items)?journal.workout_items:[];
      const itemsMarkup=(savedItems.length?savedItems:[{}]).map(exerciseEntry).join('');
      const nextPlan=journal.lesson_completed?`<form class="class-next-plan" data-next-plan-session="${esc(row.id)}"><label class="trainer-field">다음 수업 계획<textarea name="next_steps" maxlength="1000" placeholder="이번 수업 기록을 마친 뒤 다음 목표와 준비 사항을 적어요">${esc(journal.next_steps||'')}</textarea></label><button class="trainer-primary" type="submit">다음 계획 저장</button></form>`:`<div class="class-next-plan"><strong>다음 수업 계획</strong><p class="trainer-note">수업일지를 먼저 저장하면 작성할 수 있어요.</p></div>`;
      return `<article class="class-session"><div class="class-time">${esc(time)}<small style="display:block;font-size:10px;color:#718087;font-weight:500">${row.duration_minutes}분</small></div><div><div class="trainer-row"><h4 class="class-title-visible">${esc(memberName(row.member_id))} · ${esc(row.title)}</h4><span class="class-status">${row.status==='completed'?'완료':row.status==='cancelled'?'취소':'예정'}</span></div><div class="class-session-meta"><span class="class-kind">${row.session_type==='OT'?'OT 수업':'PT 수업'}</span>${row.is_fixed?'<span class="class-kind">고정 수업</span>':''}</div><p>${esc(new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'}).format(date))}</p></div><button type="button" class="trainer-subtle" data-cancel-session="${esc(row.id)}" ${row.status==='cancelled'?'disabled':''}>취소</button><details class="class-journal"><summary>수업일지 ${journal.updated_at?'수정':'작성'}</summary><form class="class-journal-form" data-journal-session="${esc(row.id)}"><div class="class-journal-layout"><section class="class-journal-main"><strong>오늘 진행한 운동</strong>${exerciseOptions}<div class="class-exercises">${itemsMarkup}</div><button type="button" class="class-add-exercise" data-add-exercise>+ 운동 추가</button><label class="trainer-field" style="margin-top:12px">간단한 수업 요약<textarea name="lesson_summary" maxlength="2000" placeholder="운동 세트 입력 후 필요한 내용을 짧게 적어주세요">${esc(journal.lesson_summary||'')}</textarea></label></section><aside class="class-trainer-memo"><label class="trainer-field">트레이너 메모<textarea name="private_notes" maxlength="2000" placeholder="복사·붙여넣기 가능한 개인 메모: 컨디션, 자세 관찰, 상담 포인트">${esc(journal.private_notes||'')}</textarea></label><small class="trainer-note">트레이너에게만 보이는 개인 메모입니다.</small></aside></div><div class="class-journal-actions"><button class="trainer-primary" type="submit">수업일지 저장</button><small class="trainer-note">저장 후 다음 수업 계획을 작성할 수 있어요.</small></div></form>${nextPlan}</details></article>`;
    }).join(''):'<p class="trainer-empty">선택한 날짜에 등록된 수업이 없어요.</p>';
    const modeLabel=mode==='today'?'오늘 수업':mode==='month'?'이번 달 수업':'이번 주 수업',periodLabel=mode==='month'?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long'}).format(anchor):mode==='today'?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(anchor):`${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric'}).format(monday)}–${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric'}).format(shiftDate(monday,6))}`;
    const calendar=mode==='month'?monthMarkup:mode==='week'?`<div class="class-week-days">${weekMarkup}</div>`:'';
    show(shell('수업 일정 · 일지','오늘·이번 주·이번 달 일정과 회원 수업기록을 확인해요.',`<nav class="trainer-nav" aria-label="트레이너 메뉴"><button type="button" data-mode="members">회원 관리</button><button type="button" data-mode="schedule" aria-current="true">수업 일정 · 일지</button></nav><div class="trainer-card"><div class="trainer-section-title"><h3 class="class-title-visible">${modeLabel}</h3><small class="class-count">${esc(periodLabel)}</small></div><div class="class-view-tabs" role="group" aria-label="일정 기간">${[['today','오늘'],['week','이번 주'],['month','이번 달']].map(([key,label])=>`<button type="button" data-schedule-mode="${key}" aria-pressed="${mode===key}">${label}</button>`).join('')}</div><div class="class-week"><button type="button" class="trainer-subtle" id="schedulePrev">이전</button>${calendar}<button type="button" class="trainer-subtle" id="scheduleNext">다음</button></div><div class="trainer-row"><h3 class="class-title-visible">${esc(new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(anchor))}</h3><span class="trainer-note class-count">${daySessions.length}개 수업</span></div>${cards}</div><details class="trainer-card" open><summary><strong>수업 일정 추가</strong> <span class="trainer-note">PT·OT 및 고정 주간 수업 등록</span></summary><form class="class-form" id="classScheduleForm"><label class="trainer-field wide">회원<select name="member_id" required><option value="">회원 선택</option>${options}</select></label><label class="trainer-field">수업 유형<select name="session_type"><option value="PT" selected>PT 수업</option><option value="OT">OT 수업</option></select></label><label class="trainer-field">날짜<input type="date" name="date" value="${selected}" required></label><label class="trainer-field">시작 시간<input type="time" name="time" value="10:00" required></label><label class="trainer-field">수업 시간<select name="duration"><option value="30">30분</option><option value="50" selected>50분</option><option value="60">60분</option><option value="90">90분</option></select></label><label class="trainer-field wide">수업 제목<input name="title" maxlength="80" value="PT 수업" placeholder="예: 하체 · 스쿼트 자세"></label><label class="class-fixed-row full"><input type="checkbox" name="is_fixed"><span><strong>고정 수업</strong><small class="trainer-note" style="display:block">매주 같은 요일·시간으로 반복 등록합니다.</small></span></label><label class="trainer-field class-fixed-until full" data-repeat-until hidden>반복 종료일<input type="date" name="repeat_until" min="${selected}"><small class="trainer-note">시작일부터 1년 이내로 선택해요.</small></label><div class="full"><button class="trainer-primary" type="submit" ${result.members.length?'':'disabled'}>일정 저장</button> <span class="trainer-note">연결 회원이 없으면 먼저 회원을 연결해주세요.</span></div></form></details>`));
    overlay.querySelectorAll('[data-schedule-day]').forEach(button=>button.onclick=()=>trainerScheduleView(button.dataset.scheduleDay,mode));
    overlay.querySelectorAll('[data-schedule-mode]').forEach(button=>button.onclick=()=>trainerScheduleView(selected,button.dataset.scheduleMode));
    const shiftAnchor=delta=>mode==='today'?shiftDate(anchor,delta):mode==='month'?new Date(anchor.getFullYear(),anchor.getMonth()+delta,1,12):shiftDate(anchor,delta*7);
    overlay.querySelector('#schedulePrev').onclick=()=>trainerScheduleView(localDay(shiftAnchor(-1)),mode);
    overlay.querySelector('#scheduleNext').onclick=()=>trainerScheduleView(localDay(shiftAnchor(1)),mode);
    const classForm=overlay.querySelector('#classScheduleForm'),fixedToggle=classForm.elements.is_fixed,repeatWrap=classForm.querySelector('[data-repeat-until]'),repeatInput=classForm.elements.repeat_until;
    fixedToggle.onchange=()=>{repeatWrap.hidden=!fixedToggle.checked;repeatInput.required=fixedToggle.checked;if(fixedToggle.checked&&!repeatInput.value)repeatInput.value=classForm.elements.date.value;};
    classForm.elements.date.onchange=()=>{repeatInput.min=classForm.elements.date.value;if(fixedToggle.checked&&repeatInput.value<classForm.elements.date.value)repeatInput.value=classForm.elements.date.value;};
    classForm.onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,fields=new FormData(form),date=String(fields.get('date')),time=String(fields.get('time')),memberId=String(fields.get('member_id')),title=String(fields.get('title')||'PT 수업').trim(),sessionType=String(fields.get('session_type')||'PT'),isFixed=fixedToggle.checked,repeatUntil=String(fields.get('repeat_until')||'');
      if(!window.PacefitRecordPeriod.valid(date)||!/^\d{2}:\d{2}$/.test(time)||!result.members.some(row=>row.id===memberId)||!title||title.length>80||!['PT','OT'].includes(sessionType))return;
      if(isFixed&&(!window.PacefitRecordPeriod.valid(repeatUntil)||repeatUntil<date||new Date(`${repeatUntil}T12:00:00`)-new Date(`${date}T12:00:00`)>366*86400000)){form.insertAdjacentHTML('afterbegin','<p class="trainer-error">고정 수업 종료일은 시작일 이후 1년 이내로 선택해주세요.</p>');return;}
      const dates=[date];if(isFixed)for(let next=shiftDate(new Date(`${date}T12:00:00`),7);localDay(next)<=repeatUntil;next=shiftDate(next,7))dates.push(localDay(next));
      const save=form.querySelector('[type=submit]');save.disabled=true;
      const {error}=await s.client.from('trainer_class_sessions').insert(dates.map(day=>({trainer_id:s.user.id,member_id:memberId,session_at:`${day}T${time}:00+09:00`,duration_minutes:Number(fields.get('duration')),title,status:'scheduled',session_type:sessionType,is_fixed:isFixed})));
      if(!sameSession(s)||epoch!==viewEpoch)return;
      if(error){save.disabled=false;form.insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)} · 수업기록 DB 변경이 적용됐는지 확인해주세요.</p>`);return;}
      trainerScheduleView(date,mode);
    };
    overlay.querySelectorAll('[data-cancel-session]').forEach(button=>button.onclick=async()=>{if(!confirm('이 수업 일정을 취소할까요?'))return;const {error}=await s.client.from('trainer_class_sessions').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',button.dataset.cancelSession).eq('trainer_id',s.user.id);if(error){alert('일정 상태를 변경하지 못했어요.');return;}trainerScheduleView(selected,mode);});
    overlay.querySelectorAll('.class-journal-form').forEach(form=>{
      const list=form.querySelector('.class-exercises');
      form.onclick=event=>{
        if(event.target.closest('[data-add-exercise]'))list.insertAdjacentHTML('beforeend',exerciseEntry({name:'',sets:[{}]}));
        const addSet=event.target.closest('[data-add-set]');if(addSet){const setList=addSet.closest('[data-exercise-entry]').querySelector('.class-set-list'),n=setList.querySelectorAll('.class-set-row').length+1;setList.insertAdjacentHTML('beforeend',`<div class="class-set-row"><small>${n}세트</small><input name="set_weight" type="number" min="0" max="1000" step="0.1" placeholder="무게 kg" aria-label="${n}세트 무게 kg"><input name="set_reps" type="number" min="1" max="100" step="1" placeholder="횟수" aria-label="${n}세트 횟수"><button type="button" data-remove-set aria-label="세트 삭제">×</button></div>`);}
        const removeSet=event.target.closest('[data-remove-set]');if(removeSet&&form.querySelectorAll('.class-set-row').length>1)removeSet.closest('.class-set-row').remove();
        const removeExercise=event.target.closest('[data-remove-exercise]');if(removeExercise&&form.querySelectorAll('[data-exercise-entry]').length>1)removeExercise.closest('[data-exercise-entry]').remove();
      };
      form.onsubmit=async event=>{event.preventDefault();const fields=new FormData(form),sessionId=form.dataset.journalSession,row=daySessions.find(item=>item.id===sessionId);if(!row)return;const workoutItems=Array.from(form.querySelectorAll('[data-exercise-entry]')).map(entry=>({name:String(entry.querySelector('[name=exercise_name]').value||'').trim(),sets:Array.from(entry.querySelectorAll('.class-set-row')).map(set=>({weight:Number(set.querySelector('[name=set_weight]').value),reps:Number(set.querySelector('[name=set_reps]').value)}))})).filter(item=>item.name);if(workoutItems.length>30||workoutItems.some(item=>item.sets.length>30||item.sets.some(set=>!Number.isFinite(set.weight)||set.weight<0||set.weight>1000||!Number.isInteger(set.reps)||set.reps<1||set.reps>100))){form.insertAdjacentHTML('afterbegin','<p class="trainer-error">운동명과 모든 세트의 무게·횟수를 확인해주세요. 최대 30종목, 종목당 30세트까지 저장할 수 있어요.</p>');return;}const save=form.querySelector('[type=submit]');save.disabled=true;const {error}=await s.client.from('trainer_lesson_journals').upsert({session_id:sessionId,trainer_id:s.user.id,member_id:row.member_id,lesson_summary:String(fields.get('lesson_summary')||'').trim(),private_notes:String(fields.get('private_notes')||'').trim(),next_steps:result.journals[sessionId]?.next_steps||'',workout_items:workoutItems,lesson_completed:true,updated_at:new Date().toISOString()},{onConflict:'session_id'});if(error){save.disabled=false;form.insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)}</p>`);return;}trainerScheduleView(selected,mode);};
    });
    overlay.querySelectorAll('[data-next-plan-session]').forEach(form=>form.onsubmit=async event=>{event.preventDefault();const sessionId=form.dataset.nextPlanSession,row=daySessions.find(item=>item.id===sessionId);if(!row)return;const save=form.querySelector('[type=submit]');save.disabled=true;const {error}=await s.client.from('trainer_lesson_journals').upsert({session_id:sessionId,trainer_id:s.user.id,member_id:row.member_id,next_steps:String(new FormData(form).get('next_steps')||'').trim(),updated_at:new Date().toISOString()},{onConflict:'session_id'});if(error){save.disabled=false;form.insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)}</p>`);return;}trainerScheduleView(selected,mode);});
  }
  const trainerLog = row => {
    const items=(Array.isArray(row.items)?row.items:[]).map(item=>{
      const weight=Number(item?.weight),sets=Number(item?.sets),reps=Number(item?.reps);
      if(!item||!Number.isFinite(weight)||weight<0||weight>1000||!Number.isInteger(sets)||sets<1||sets>30||!Number.isInteger(reps)||reps<1||reps>100)return null;
      return {name:String(item.name||'운동').slice(0,80),equipment:String(item.equipment||'').slice(0,80),weight,sets,reps,rir:null,formOk:false};
    }).filter(Boolean);
    return {id:`trainer-${row.id}`,source:'trainer',trainerId:row.trainer_id,loggedAt:row.created_at,date:row.entry_date,title:row.title,effort:row.effort,note:row.note,photoIds:[],items};
  };
  let entryRefreshBusy=false;
  async function refreshTrainerEntries() {
    if(entryRefreshBusy)return;entryRefreshBusy=true;
    try {
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
    }catch(error){console.warn('Trainer records refresh failed',error);}finally{entryRefreshBusy=false;}
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
  function trainerItemMarkup(item) {
    const sets = Array.isArray(item.setDetails) ? item.setDetails.filter(set => set && Number.isFinite(Number(set.weight)) && Number.isInteger(Number(set.reps)) && Number(set.reps) > 0) : [];
    return `${esc(item.name)} ${sets.length ? sets.map((set,index) => `${index + 1}세트 ${esc(set.weight)}kg × ${esc(set.reps)}회`).join(' / ') : `${esc(item.weight)}kg · ${esc(item.sets)}세트 × ${esc(item.reps)}회`}`;
  }
  async function memberRecords(memberId, section = 'profile') {
    const epoch = ++viewEpoch;
    const s = session();
    if (!s) return;
    show(shell('회원 정보', '회원이 허용한 정보를 새로 조회합니다.', '<button class="trainer-subtle" id="loadingBackToMembers" type="button">← 회원 목록</button><p class="trainer-note" role="status">공유 정보를 불러오는 중…</p>'));
    overlay.querySelector('#loadingBackToMembers').onclick=trainerView;
    const result = await tryQuery(async () => {
      const link = assertResult(await s.client.from('trainer_member_links').select('trainer_id,can_write,status').eq('trainer_id',s.user.id).eq('member_id',memberId).single());
      if (link.status!=='active') throw Error('연결이 해제된 회원입니다.');
      const record = assertResult(await s.client.from('user_app_data').select('payload').eq('user_id',memberId).maybeSingle());
      const entries = assertResult(await s.client.from('trainer_log_entries').select('id,trainer_id,entry_date,title,effort,note,items,created_at').eq('member_id',memberId).order('created_at',{ascending:false}).limit(500)) || [];
      const [diets,poses,shares]=await Promise.all([
        s.client.from('diet_entries').select('id,entry_date,meal,food_name,amount_g,note,nutrients,photo_path,created_at').eq('user_id',memberId).order('created_at',{ascending:false}).limit(500),
        optionalQuery(s.client.from('pose_check_entries').select('id,exercise_name,rep_count,duration_seconds,max_angle,observed,created_at').eq('user_id',memberId).order('created_at',{ascending:false}).limit(50),'poseSharing'),
        optionalQuery(s.client.from('member_trainer_shares').select('share_pose').eq('user_id',memberId).maybeSingle(),'poseSharing')
      ]);
      return {link,record,entries,diets:assertResult(diets)||[],poses:assertResult(poses)||[],sharePose:assertResult(shares)?.share_pose===true};
    });
    if (!sameSession(s) || epoch !== viewEpoch) return;
    if (!result) return;
    const profile=result.record?.payload?.profile||{};
    const logs=[...(result.record?.payload?.logs||[]),...result.entries.map(trainerLog)].filter(row=>row.id&&Array.isArray(row.items)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const I=window.PacefitMemberInsights;
    const P=window.PacefitRecordPeriod,period=P?periodFor(memberId):null;
    const filteredLogs=P?P.select(logs,period.mode,period.anchor):logs;
    const graph=I.workoutSummary(filteredLogs,profile);
    const profileFields=[['운동 경험',profile.experienceOther||profile.experience],['운동 목표',profile.goalOther||profile.goal],['주간 목표',profile.days?`주 ${profile.days}회`:null],['성별',profile.sex||profile.gender],['키',profile.height?`${profile.height}cm`:null]];
    const profileHtml=`<div class="trainer-profile-grid">${profileFields.map(([label,value])=>`<div class="trainer-profile-item"><small>${esc(label)}</small><strong>${esc(value||'미입력')}</strong></div>`).join('')}${I.historyMarkup(result.record?.payload?.bodyMetricsV1,'weight',profile)}${I.historyMarkup(result.record?.payload?.bodyMetricsV1,'bmr',profile)}</div>${I.reportsMarkup(result.record?.payload?.sharedBodyReportsV1,memberId)}<p class="trainer-note">회원이 공유한 정보만 표시합니다. 검사표는 사진별 별도 공유 동의가 필요합니다.</p>`;
    const dietHtml=I.dietMarkup(P?P.select(result.diets,period.mode,period.anchor,'entry_date'):result.diets,profile);
    const poseHtml=!schemaAvailable.poseSharing?'<p class="trainer-empty">현재 서버는 자세 결과 공유를 지원하지 않습니다. 카메라 영상은 전송하거나 저장하지 않습니다.</p>':result.sharePose&&result.poses.length?result.poses.map(row=>`<div class="trainer-log"><h4>${esc(row.exercise_name)} · ${row.rep_count}회</h4><small>${esc(new Date(row.created_at).toLocaleString('ko-KR'))} · ${row.duration_seconds}초 · 최대 각도 ${row.max_angle??'—'}°</small><p>${esc(row.observed)}</p></div>`).join(''):'<p class="trainer-empty">공유 허용된 자세 분석 결과가 없어요. 카메라 영상은 저장하지 않습니다.</p>';
    const {data:sharedTrainerLogs}=schemaAvailable.trainerSharing ? await optionalQuery(s.client.from('trainer_shared_workouts').select('id,workout_date,title,items,note').eq('trainer_id',result.link.trainer_id).order('workout_date',{ascending:false}).limit(20),'trainerSharing') : {data:[]};
    if (!sameSession(s) || epoch !== viewEpoch) return;
    const trainerLogsHtml=(sharedTrainerLogs||[]).length?(sharedTrainerLogs||[]).map(row=>`<div class="trainer-log"><h4>${esc(row.title)}</h4><small>${esc(row.workout_date)} · 트레이너 공개 운동</small><p>${(row.items||[]).map(trainerItemMarkup).join('<br>')}</p>${row.note?`<p>${esc(row.note)}</p>`:''}</div>`).join(''):'<p class="trainer-empty">트레이너가 공개한 운동 기록이 없어요.</p>';
    const memberName=displayName(s.user.id,memberId,profile.name||'회원 기록');
    show(shell(memberName, '회원이 허용한 운동·자세·식단 기록을 확인합니다.', `<button class="trainer-subtle" id="backToMembers" type="button">← 회원 목록</button><button class="trainer-subtle" id="openTrainerSchedule" type="button" style="margin-left:8px">수업 일정 · 일지</button><button class="trainer-primary" id="trainerNewPlan" type="button" style="margin-left:8px">다음 운동 제안</button>${result.link.can_write?'<button class="trainer-primary" id="trainerNewLog" type="button" style="margin-left:8px">운동 기록 대신 작성</button>':''}<form class="pf-alias" id="trainerAliasForm"><label>내 화면에서 부를 이름<input name="alias" maxlength="40" value="${esc(window.PacefitTrainerWorkspace.loadAliases?.(s.user.id)?.[memberId]||'')}" placeholder="원래 이름 사용"></label><button class="trainer-subtle" type="submit">표시 이름 저장</button><small>현재 브라우저의 내 트레이너 계정에만 저장됩니다. 비우면 원래 이름으로 돌아갑니다.</small><span role="status" id="aliasStatus"></span></form><p class="trainer-note">아래 기간은 운동·식단 기록에 적용합니다. 프로필 이력과 자세 결과는 별도입니다.</p><div id="trainerRecordPeriod"></div><nav class="tw-detail-nav" aria-label="회원 정보 바로가기">${[['profile','프로필'],['workout','운동·변화'],['diet','식단'],['pose','자세']].map(([key,label])=>`<button type="button" data-detail="${key}" aria-current="${section===key}">${label}</button>`).join('')}</nav><div class="trainer-card tw-detail-section" id="trainerDetail-profile" tabindex="-1"><h3>회원 프로필</h3><p>${esc(profile.name||'이름 미입력')}님의 기본 정보와 운동 목표</p>${result.record?profileHtml:'<p class="trainer-empty">공유 프로필을 조회할 수 없어요. 미동의·미저장 등일 수 있으며 현재 화면에서 사유를 확인할 수 없습니다.</p>'}</div><div class="trainer-card tw-detail-section" id="trainerDetail-workout" tabindex="-1"><h3>운동 변화 그래프</h3>${graph}<h3>운동 기록 ${filteredLogs.length}회</h3>${I.workoutLogs(filteredLogs,profile)}</div><div class="trainer-card tw-detail-section" id="trainerDetail-pose" tabindex="-1"><h3>자세 체크 ${!schemaAvailable.poseSharing?'· 서버 미지원':result.sharePose?'· 공유 허용':'· 미공유'}</h3>${poseHtml}</div><div class="trainer-card tw-detail-section" id="trainerDetail-diet" tabindex="-1"><h3>식단 기록 · 회원이 공유한 데이터</h3>${dietHtml}</div><div class="trainer-card"><h3>트레이너가 공개한 운동</h3>${trainerLogsHtml}</div><p class="trainer-note">식단·자세 데이터는 회원 동의가 있을 때만 서버에서 읽을 수 있습니다. 사진 분석 원본 영상은 전송하거나 저장하지 않습니다.</p>`));
    // Directory cache contains only the last RLS-visible name/workout list, never report images.
    if(directoryOwner===s.user.id && directoryRows.length) {
      const content=overlay.querySelector('#trainerContent');
      const detail=document.createElement('div');detail.className='tw-detail-main';
      while(content.firstChild)detail.appendChild(content.firstChild);
      const split=document.createElement('div');split.className='tw-split';
      const aside=document.createElement('aside');aside.setAttribute('aria-label','회원 목록');
      split.appendChild(aside);split.appendChild(detail);content.appendChild(split);
      window.PacefitTrainerWorkspace.mount(aside,window.PacefitTrainerWorkspace.aliasRows?.(directoryRows,s.user.id)||directoryRows,directoryState,memberRecords,{groups:window.PacefitTrainerWorkspace.loadGroups(s.user.id),onGroupChange:(id,group)=>sameSession(s)&&window.PacefitTrainerWorkspace.saveGroup(s.user.id,id,group)});
      aside.querySelectorAll('.tw-member').forEach(row=>row.dataset.selected=String(row.querySelector('[data-member]')?.dataset.member===memberId));
    }
    const aliasForm=overlay.querySelector('#trainerAliasForm');
    aliasForm.onsubmit=event=>{event.preventDefault();if(!sameSession(s))return;
      if(!window.PacefitTrainerWorkspace.saveAlias(s.user.id,memberId,aliasForm.elements.alias.value)){overlay.querySelector('#aliasStatus').textContent='저장하지 못했어요. 저장 공간과 40자 제한을 확인해주세요.';return;}
      memberRecords(memberId,section);
    };
    if(P)P.mount(overlay.querySelector('#trainerRecordPeriod'),period,()=>memberRecords(memberId,overlay.querySelector('[data-detail][aria-current="true"]')?.dataset.detail||section));
    const navigateDetail = key => {
      const target=overlay.querySelector('#trainerDetail-'+key);
      if(!target) return;
      overlay.querySelectorAll('[data-detail]').forEach(control=>control.setAttribute('aria-current',String(control.dataset.detail===key)));
      overlay.querySelectorAll('.tw-detail-section').forEach(panel=>{panel.hidden=panel!==target;});
      target.focus(); target.scrollIntoView({block:'nearest'});
    };
    overlay.querySelectorAll('[data-detail]').forEach(control=>control.onclick=()=>navigateDetail(control.dataset.detail));
    navigateDetail(section);
    overlay.querySelector('#backToMembers').onclick=trainerView;
    overlay.querySelector('#openTrainerSchedule').onclick=()=>trainerScheduleView();
    overlay.querySelector('#trainerNewPlan').onclick=()=>window.PacefitTrainerPlans?.openComposer({memberId,memberName,memberLogs:logs});
    const newLog=overlay.querySelector('#trainerNewLog');if(newLog)newLog.onclick=()=>trainerRecordForm(memberId,memberName);
    overlay.querySelectorAll('[data-lesson-log]').forEach(card=>{const log=logs.find(row=>row.id===card.dataset.lessonLog);if(!log)return;const open=document.createElement('button');open.type='button';open.className='lj-new';open.textContent='사진·영상·펜 피드백';open.onclick=()=>window.PacefitLessonJournal?.open({memberId,memberName,log});card.appendChild(open);});
    overlay.querySelectorAll('[data-load-comment]').forEach(control=>control.onclick=()=>loadPortalThread(memberId,control.dataset.loadComment));
    for(const image of overlay.querySelectorAll('[data-diet-photo]')){const {data:signed}=await s.client.storage.from('diet-photos').createSignedUrl(image.dataset.dietPhoto,600);if (!sameSession(s) || epoch !== viewEpoch) return; if(signed?.signedUrl)image.src=signed.signedUrl;else image.hidden=true;}
    return epoch;
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
    const composerEpoch=++viewEpoch,composerSession=session();
    if(!composerSession)return;
    const now=new Date(),today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
    const drawer=document.createElement('section');drawer.className='pf-record-drawer';drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','운동 기록 대신 작성');
    drawer.innerHTML=`<h3>${esc(memberName)} · 운동 기록 작성</h3><button class="trainer-subtle" id="backToMember" type="button">← 회원 기록</button><form id="trainerRecordForm" class="trainer-card"><label class="trainer-field">운동 날짜<input name="date" type="date" max="${today}" value="${today}" required></label><label class="trainer-field">운동 이름<input name="exercise" maxlength="80" list="trainerExercises" placeholder="예: 스쿼트" required><datalist id="trainerExercises">${(window.PACEFIT_LIBRARY||[]).filter(item=>['가슴','등','어깨','팔','하체'].includes(item.category)).map(item=>`<option value="${esc(item.name)}"></option>`).join('')}</datalist></label><div class="trainer-fields"><label class="trainer-field">무게 kg<input name="weight" type="number" min="0" max="1000" step="0.5" value="0" required></label><label class="trainer-field">세트 수<input name="sets" type="number" min="1" max="30" value="3" required></label><label class="trainer-field">세트당 횟수<input name="reps" type="number" min="1" max="100" value="10" required></label></div><label class="trainer-field">오늘 난이도<select name="effort"><option>적당했어요</option><option>쉬웠어요</option><option>힘들었어요</option><option>통증이 있었어요</option></select></label><label class="trainer-field">메모<textarea name="note" maxlength="1000" placeholder="지도 중 확인한 내용을 기록하세요"></textarea></label><p class="trainer-note">저장하면 회원 일지에 ‘트레이너 작성’으로 표시되고 작성한 계정과 시간이 서버에 남습니다.</p><button class="trainer-primary" type="submit">기록 저장 후 사진·영상·필기 추가</button></form>`;
    const shade=document.createElement('div');shade.className='pf-record-drawer-backdrop';
    const background=overlay.querySelector('.trainer-panel');background.inert=true;
    overlay.appendChild(shade);overlay.appendChild(drawer);drawer.querySelector('input')?.focus();
    drawer.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=Array.from(drawer.querySelectorAll('button:not(:disabled),input,select,textarea'));const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
    overlay.querySelector('#backToMember').onclick=()=>memberRecords(memberId,'workout');
    overlay.querySelector('#trainerRecordForm').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,fields=new FormData(form),date=String(fields.get('date')||''),name=String(fields.get('exercise')||'').trim(),weight=Number(fields.get('weight')),sets=Number(fields.get('sets')),reps=Number(fields.get('reps')),note=String(fields.get('note')||'').trim(),effort=String(fields.get('effort')||'적당했어요');
      if(!window.PacefitRecordPeriod.valid(date)||date>today||!name||name.length>80||!Number.isFinite(weight)||weight<0||weight>1000||!Number.isInteger(sets)||sets<1||sets>30||!Number.isInteger(reps)||reps<1||reps>100)return;
      const save=form.querySelector('[type=submit]');save.disabled=true;
      const s=composerSession;if(!sameSession(s)||composerEpoch!==viewEpoch)return;const {data:created,error}=await s.client.from('trainer_log_entries').insert({trainer_id:s.user.id,member_id:memberId,entry_date:date,title:`트레이너 기록 · ${name}`,effort,note,items:[{name,equipment:'',weight,sets,reps,rir:null,formOk:false}]}).select('id,trainer_id,entry_date,title,effort,note,items,created_at').single();
      if(!sameSession(s)||composerEpoch!==viewEpoch)return;
      if(error){save.disabled=false;form.insertAdjacentHTML('afterbegin',`<p class="trainer-error">${errorText(error)}</p>`);return;}
      const p=periodFor(memberId);p.anchor=date;
      const detailEpoch=await memberRecords(memberId,'workout');
      if(sameSession(s)&&detailEpoch===viewEpoch&&created)window.PacefitLessonJournal?.open({memberId,memberName,log:trainerLog(created)});
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
    document.querySelectorAll('#logList .log-item[data-log-id], #calendarDayLogs .log-item[data-log-id]').forEach(item=>{
      const logId=item.dataset.logId,detail=item.querySelector('.log-details');
      if(!logId||!detail||detail.querySelector('.trainer-journal-comments'))return;
      const root=document.createElement('div');root.className='trainer-journal-comments';root.innerHTML='<button type="button" class="trainer-subtle">코멘트 보기</button>';
      root.querySelector('button').onclick=()=>loadJournalThread(logId,root);
      detail.appendChild(root);
    });
  }
  const list=document.getElementById('logList');if(list)new MutationObserver(()=>queueMicrotask(decorateJournal)).observe(list,{childList:true});
  const calendarLogs=document.getElementById('calendarDayLogs');if(calendarLogs)new MutationObserver(()=>queueMicrotask(decorateJournal)).observe(calendarLogs,{childList:true});
  button.onclick=()=>{ activeRole='personal'; session()?memberView():localView(); };
  switchButton.onclick=showEntry;
  overlay.addEventListener('click',event=>{if(event.target===overlay && activeRole!=='trainer')close()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden && activeRole!=='trainer')close()});
  overlay.addEventListener('keydown',event=>{
    if(event.key!=='Tab' || activeRole!=='trainer' || !overlay.contains(document.activeElement)) return;
    const controls=Array.from(overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')).filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];
    if(!first)return;
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  });
  window.addEventListener('refit:session-ready',()=>{button.textContent='트레이너 연결';refreshTrainerEntries();decorateJournal();if(activeRole==='trainer')trainerView();else showEntry()});
  window.addEventListener('refit:local-ready',()=>{ if (activeRole!=='trainer' && (!document.getElementById('accountGate') || document.getElementById('accountGate').hidden)) showEntry(); });
  window.addEventListener('refit:session-ended',()=>{overlay.hidden=true;entry.hidden=true;activeRole=null;viewEpoch++;Object.assign(directoryState,{query:'',filter:'all',group:'all',page:1});overlay.innerHTML='';directoryRows=[];directoryOwner=null;memberPeriods.clear();syncWorkspace();button.textContent='트레이너 연결'});
  try { if (JSON.parse(localStorage.getItem('refit-local-consent-v2')||'null')?.acceptedAt && !window.REFIT_CONFIG?.supabaseUrl && !window.REFIT_CONFIG?.supabasePublishableKey) showEntry(); } catch {}
  window.setInterval?.(()=>{if(!document.hidden&&session()?.exerciseConsent&&activeRole!=='trainer')refreshTrainerEntries();},5000);
  let lastRefresh=0;
  window.addEventListener('focus',()=>{if(session()&&Date.now()-lastRefresh>60000){lastRefresh=Date.now();refreshTrainerEntries()}});
})();
