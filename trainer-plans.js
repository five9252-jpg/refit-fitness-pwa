(() => {
  'use strict';
  const bridge = window.RefitAccountBridge;
  const catalog = window.PacefitRoutineCatalog;
  const home = document.getElementById('paceHome');
  if (!bridge || !catalog || !home) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = (offset = 0) => {
    const now = new Date(); now.setDate(now.getDate() + offset);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const dateText = value => new Date(`${value}T12:00:00`).toLocaleDateString('ko-KR', {month:'long',day:'numeric',weekday:'short'});
  const recentWeight = (logs, name) => {
    const ordered = [...(logs || [])].sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.loggedAt || '').localeCompare(String(a.loggedAt || '')));
    const item = ordered.flatMap(log => Array.isArray(log.items) ? log.items : []).find(row => row.name === name && row.weight != null && Number.isFinite(Number(row.weight)));
    return item ? Number(item.weight) : null;
  };
  const root = document.createElement('section');
  root.id = 'trainerNextWorkout'; root.className = 'trainer-next'; root.hidden = true;
  home.querySelector('.home-recommend')?.before(root);
  const overlay = document.createElement('div');
  overlay.className = 'trainer-plan-overlay'; overlay.hidden = true;
  document.body.appendChild(overlay);
  const style = document.createElement('style');
  style.textContent = `.trainer-next{margin:0 0 17px;padding:20px;border:1px solid #cfe3e2;border-radius:20px;background:#f0f7f5;box-shadow:0 12px 30px #20343a0a}.trainer-next[hidden],.trainer-plan-overlay[hidden]{display:none}.trainer-next small{display:block;color:#57736e;font-size:11px;font-weight:800}.trainer-next h2{margin:6px 0;font-size:20px;letter-spacing:-.04em}.trainer-next p{margin:6px 0;color:#526b68;font-size:12px;line-height:1.55}.trainer-next ul{margin:12px 0;padding-left:19px;color:#274c49;font-size:12px;line-height:1.8}.trainer-next button,.trainer-plan-primary{border:0;border-radius:10px;padding:10px 14px;background:#244c5a;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.trainer-plan-overlay{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:14px;background:#19272db3}.trainer-plan-panel{width:min(680px,100%);max-height:calc(100dvh - 28px);overflow:auto;border-radius:20px;background:#fff;padding:22px;box-shadow:0 25px 80px #102b3650}.trainer-plan-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.trainer-plan-head h2{margin:0;font-size:22px}.trainer-plan-head p,.trainer-plan-hint{font-size:12px;line-height:1.55;color:#607078}.trainer-plan-close,.trainer-plan-add,.trainer-plan-remove{border:1px solid #dce6e7;border-radius:9px;background:#fff;padding:8px 11px;color:#244c5a;font-size:12px;font-weight:800;cursor:pointer}.trainer-plan-panel label{display:block;margin:12px 0 0;color:#49636a;font-size:11px;font-weight:800}.trainer-plan-panel input,.trainer-plan-panel select,.trainer-plan-panel textarea{display:block;width:100%;min-height:40px;margin-top:5px;padding:8px 10px;border:1px solid #dce6e7;border-radius:9px;background:#fff;color:#19272d;font:inherit;font-size:13px}.trainer-plan-panel textarea{min-height:68px;resize:vertical}.trainer-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px}.trainer-plan-exercise{margin-top:13px;padding:12px;border:1px solid #e5eaec;border-radius:13px;background:#f8fafb}.trainer-plan-exercise-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.trainer-plan-exercise-head strong{font-size:12px}.trainer-plan-exercise .trainer-plan-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.trainer-plan-error{margin:12px 0;padding:10px;border-radius:9px;background:#fff0ec;color:#9a3e32;font-size:12px}.trainer-plan-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px}@media(max-width:560px){.trainer-plan-panel{padding:17px}.trainer-plan-grid{grid-template-columns:1fr}.trainer-plan-exercise .trainer-plan-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.trainer-next{padding:16px}}`;
  document.head.appendChild(style);

  function renderPlanCard(plan, trainerName) {
    const current = bridge.getState();
    const applied = current.trainerPlanApplied?.id === plan.id && current.trainerPlanApplied?.date === date() &&
      current.trainerPlanApplied?.baseEdits === JSON.stringify(current.routineEdits?.[plan.body_part] ?? null);
    root.innerHTML = `<small>TRAINER · NEXT WORKOUT · ${esc(dateText(plan.target_date))}</small><h2>${esc(plan.title)}</h2><p>${esc(trainerName)}님이 보낸 ${esc(plan.body_part)} 운동 제안이에요.</p><ul>${plan.exercises.map(item => `<li>${esc(item.name)} · ${esc(item.sets)}세트 × ${esc(item.reps)}회${item.weight == null ? '' : ` · 참고 ${esc(item.weight)}kg`}</li>`).join('')}</ul>${plan.note ? `<p>${esc(plan.note)}</p>` : ''}<p>참고 무게는 실제 운동 전에 몸 상태에 맞춰 확인해 주세요. 기록은 직접 입력합니다.</p><button id="applyTrainerPlan" type="button">${applied ? '적용한 운동 보기' : '오늘 운동으로 적용'}</button>`;
    root.hidden = false;
    root.querySelector('#applyTrainerPlan').onclick = () => {
      if (!applied) {
        const exercises = plan.exercises.filter(item => catalog.has(plan.body_part, item.name));
        if (exercises.length !== plan.exercises.length || !exercises.length) { window.toast('운동 목록이 변경되어 이 제안을 적용할 수 없어요.'); return; }
        const current = bridge.getState();
        const next = {...current,
          routineChoice:{date:date(),part:plan.body_part},
          trainerPlanApplied:{id:plan.id,date:date(),bodyPart:plan.body_part,trainerName,exercises,
            baseEdits:JSON.stringify(current.routineEdits?.[plan.body_part] ?? null)}};
        if (!window.commitState(next,'트레이너의 운동 제안을 적용했어요.')) return;
        renderPlanCard(plan,trainerName);
      }
      document.getElementById('homeStart')?.click();
    };
  }

  async function loadMemberPlan() {
    const s = window.RefitAccountSession;
    root.hidden = true;
    if (!s?.exerciseConsent) return;
    const capturedId = s.user.id;
    const {data,error} = await s.client.from('trainer_workout_plans')
      .select('id,trainer_id,target_date,body_part,title,note,exercises,created_at')
      .eq('member_id',capturedId).gte('target_date',date(-7))
      .order('created_at',{ascending:false}).limit(20);
    if (window.RefitAccountSession?.user?.id !== capturedId) return;
    if (error) { console.warn('Trainer workout plan load failed',error); return; }
    const plan = (data || []).find(row => row.target_date >= date() && Array.isArray(row.exercises) && row.exercises.length && row.exercises.every(item => catalog.has(row.body_part,item?.name)));
    if (!plan) return;
    const nameResult = await s.client.from('trainer_profiles').select('display_name').eq('user_id',plan.trainer_id).maybeSingle();
    if (window.RefitAccountSession?.user?.id !== capturedId) return;
    renderPlanCard(plan,nameResult.data?.display_name || '연결된 트레이너');
  }

  function openComposer({memberId,memberName,memberLogs = []}) {
    const s = window.RefitAccountSession;
    if (!s || !memberId || !catalog) return;
    let part = '가슴';
    const close = () => {overlay.hidden = true; overlay.innerHTML = '';};
    const exerciseRow = (name = '') => {
      const weight = recentWeight(memberLogs,name);
      return `<div class="trainer-plan-exercise"><div class="trainer-plan-exercise-head"><strong>운동</strong><button class="trainer-plan-remove" type="button" aria-label="운동 빼기">빼기</button></div><label>운동 이름<input class="trainer-plan-name" list="trainerPlanCatalog" value="${esc(name)}" maxlength="80" placeholder="종목 검색" required></label><div class="trainer-plan-grid"><label>세트<input class="trainer-plan-sets" type="number" min="1" max="30" step="1" value="3" required></label><label>횟수/세트<input class="trainer-plan-reps" type="number" min="1" max="100" step="1" value="10" required></label><label>참고 무게 kg<input class="trainer-plan-weight" type="number" min="0" max="1000" step="0.5" value="${weight == null ? '' : esc(weight)}" placeholder="선택"></label></div>${weight == null ? '' : `<small class="trainer-plan-hint">최근 기록 ${esc(weight)}kg를 시작점으로 표시했어요.</small>`}</div>`;
    };
    const renderOptions = () => {
      const list = overlay.querySelector('#trainerPlanCatalog');
      list.innerHTML = catalog.list(part).map(item => `<option value="${esc(item.name)}"></option>`).join('');
    };
    const addRow = (name = '') => {
      const rows = overlay.querySelector('#trainerPlanRows');
      if (rows.children.length >= 8) return;
      rows.insertAdjacentHTML('beforeend',exerciseRow(name));
      const added = rows.lastElementChild;
      added.querySelector('.trainer-plan-remove').onclick = () => {
        if (rows.children.length > 1) added.remove();
      };
    };
    const error = message => {const box = overlay.querySelector('#trainerPlanError'); box.textContent = message; box.hidden = false;};
    overlay.innerHTML = `<section class="trainer-plan-panel" role="dialog" aria-modal="true" aria-label="다음 운동 제안"><div class="trainer-plan-head"><div><h2>${esc(memberName)}님 다음 운동 제안</h2><p>회원의 지난 기록을 참고해 종목과 강도를 직접 정하세요.</p></div><button class="trainer-plan-close" type="button">닫기</button></div><form id="trainerPlanForm"><div class="trainer-plan-grid"><label>운동 날짜<input name="target_date" type="date" min="${date()}" max="${date(90)}" value="${date(1)}" required></label><label>운동 부위<select name="body_part">${catalog.parts.map(p => `<option value="${p}">${p}</option>`).join('')}</select></label></div><label>제안 제목<input name="title" maxlength="80" value="가슴 운동" required></label><div id="trainerPlanRows"></div><datalist id="trainerPlanCatalog"></datalist><div class="trainer-plan-actions"><button class="trainer-plan-add" type="button">＋ 운동 추가</button></div><label>트레이너 메모<textarea name="note" maxlength="1000" placeholder="준비 운동, 자세 주의점, 강도 조절 기준 등을 적어주세요."></textarea></label><p class="trainer-plan-hint">제안은 회원 일지를 수정하지 않습니다. 회원이 직접 ‘오늘 운동으로 적용’을 눌러야 반영돼요.</p><p id="trainerPlanError" class="trainer-plan-error" role="alert" hidden></p><div class="trainer-plan-actions"><button class="trainer-plan-primary" type="submit">회원에게 제안 보내기</button></div></form></section>`;
    overlay.hidden = false;
    overlay.querySelector('.trainer-plan-close').onclick = close;
    overlay.onclick = event => { if (event.target === overlay) close(); };
    const form = overlay.querySelector('#trainerPlanForm');
    renderOptions();
    catalog.list(part).slice(0,3).forEach(item => addRow(item.name));
    overlay.querySelector('.trainer-plan-add').onclick = () => addRow();
    form.elements.body_part.onchange = () => {
      part = form.elements.body_part.value;
      form.elements.title.value = `${part} 운동`;
      overlay.querySelector('#trainerPlanRows').innerHTML = '';
      renderOptions();
      catalog.list(part).slice(0,3).forEach(item => addRow(item.name));
    };
    form.onsubmit = async event => {
      event.preventDefault();
      const targetDate = form.elements.target_date.value;
      const title = form.elements.title.value.trim();
      const note = form.elements.note.value.trim();
      const exercises = [];
      for (const row of overlay.querySelectorAll('.trainer-plan-exercise')) {
        const name = row.querySelector('.trainer-plan-name').value.trim();
        const sets = Number(row.querySelector('.trainer-plan-sets').value);
        const reps = Number(row.querySelector('.trainer-plan-reps').value);
        const rawWeight = row.querySelector('.trainer-plan-weight').value.trim();
        const weight = rawWeight === '' ? null : Number(rawWeight);
        if (!catalog.has(part,name) || !Number.isInteger(sets) || sets < 1 || sets > 30 || !Number.isInteger(reps) || reps < 1 || reps > 100 || (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1000))) {
          error('운동 이름·세트·횟수·참고 무게를 확인해주세요. 선택한 부위의 종목만 넣을 수 있어요.'); return;
        }
        if (exercises.some(item => item.name === name)) { error('같은 운동은 한 번만 넣어주세요.'); return; }
        exercises.push({name,sets,reps,weight});
      }
      if (!exercises.length || exercises.length > 8 || !title || title.length > 80 || !targetDate || targetDate < date() || targetDate > date(90)) { error('날짜와 제목을 확인해주세요. 운동은 1~8개까지 넣을 수 있어요.'); return; }
      const button = form.querySelector('[type=submit]'); button.disabled = true;
      const {error:saveError} = await s.client.from('trainer_workout_plans').insert({trainer_id:s.user.id,member_id:memberId,target_date:targetDate,body_part:part,title,note,exercises});
      if (saveError) { button.disabled = false; error(`제안 저장에 실패했어요: ${saveError.message || '서버 연결을 확인해주세요.'}`); return; }
      overlay.querySelector('.trainer-plan-panel').innerHTML = `<div class="trainer-plan-head"><div><h2>제안을 보냈어요</h2><p>${esc(memberName)}님의 다음 운동에 ${esc(exercises.length)}종목을 제안했습니다. 회원이 사이트를 열면 제안을 볼 수 있어요.</p></div><button class="trainer-plan-close" type="button">닫기</button></div>`;
      overlay.querySelector('.trainer-plan-close').onclick = close;
    };
  }

  window.PacefitTrainerPlans = {openComposer,refresh:loadMemberPlan};
  window.addEventListener('refit:session-ready', loadMemberPlan);
  window.addEventListener('refit:session-ended', () => {root.hidden = true;overlay.hidden = true;});
  window.addEventListener('focus', () => {if (window.RefitAccountSession?.exerciseConsent) loadMemberPlan();});
  if (window.RefitAccountSession) loadMemberPlan();
})();

