(() => {
  'use strict';
  const bridge = window.RefitAccountBridge;
  if (!bridge || typeof window.getPlan !== 'function' || typeof window.renderPlan !== 'function') return;

  const parts = ['가슴', '등', '어깨', '팔', '하체'];
  const defaults = {
    가슴: ['체스트 프레스', '인클라인 덤벨 프레스', '덤벨 체스트 프레스'],
    등: ['랫 풀다운', '시티드 로우', '시티드 하이백 로우'],
    어깨: ['덤벨 숄더 프레스', '머신 레터럴 레이즈', '벤트오버 레터럴 레이즈'],
    팔: ['덤벨 바이셉스 컬', '케이블 트라이셉스 푸시다운', '해머 컬'],
    하체: ['레그 프레스', '레그 컬', '스쿼트', '머신 카프 레이즈']
  };
  const oldCurrentRoutine = window.getCurrentRoutine;
  const oldRenderPlan = window.renderPlan;
  const oldRenderLogs = window.renderLogs;
  const catalog = new Map();
  ['상체 A', '하체 A', '상체 B', '하체 B', '상체 C', '하체 C'].forEach(name => {
    oldCurrentRoutine(name).forEach(ex => { if (!catalog.has(ex.name)) catalog.set(ex.name, ex); });
  });
  [
    {name:'체스트 프레스',group:'가슴 · 머신',sets:3,reps:10},
    {name:'인클라인 덤벨 프레스',group:'가슴 · 덤벨',sets:3,reps:10},
    {name:'덤벨 체스트 프레스',group:'가슴 · 덤벨',sets:3,reps:10},
    {name:'랫 풀다운',group:'등 · 머신',sets:3,reps:10},
    {name:'시티드 로우',group:'등 · 머신',sets:3,reps:10},
    {name:'시티드 하이백 로우',group:'등 · 머신',sets:3,reps:10},
    {name:'벤치 지지 원암 덤벨 로우',group:'등 · 덤벨',sets:3,reps:10},
    {name:'덤벨 숄더 프레스',group:'어깨 · 덤벨',sets:2,reps:10},
    {name:'머신 레터럴 레이즈',group:'어깨 · 머신',sets:2,reps:12},
    {name:'벤트오버 레터럴 레이즈',group:'어깨 · 덤벨',sets:2,reps:12},
    {name:'덤벨 스텝업',group:'하체 · 덤벨',sets:2,reps:8},
    {name:'덤벨 프런트 레이즈',group:'어깨 · 덤벨',sets:2,reps:10},
    {name:'덤벨 바이셉스 컬',group:'팔 · 덤벨',sets:2,reps:10},
    {name:'케이블 트라이셉스 푸시다운',group:'팔 · 케이블',sets:2,reps:10},
    {name:'해머 컬',group:'팔 · 덤벨',sets:2,reps:10},
    {name:'덤벨 트라이셉스 킥백',group:'팔 · 덤벨',sets:2,reps:10},
    {name:'덤벨 사이드 런지',group:'하체 · 덤벨',sets:2,reps:8},
    {name:'파머스 캐리',group:'하체 · 덤벨',sets:3,reps:20,repLabel:'걸음'},
    {name:'레그 프레스',group:'하체 · 머신',sets:3,reps:10},
    {name:'레그 컬',group:'하체 · 머신',sets:3,reps:10},
    {name:'머신 카프 레이즈',group:'하체 · 머신',sets:2,reps:12},
    {name:'스쿼트',group:'하체 · 맨몸',equipment:'맨몸',sets:2,reps:8}
  ].forEach(ex => { if (!catalog.has(ex.name)) catalog.set(ex.name, ex); });
  (window.PACEFIT_LIBRARY || []).forEach(ex => {
    if (parts.includes(ex.category) && !catalog.has(ex.name)) {
      catalog.set(ex.name, { name: ex.name, group: `${ex.category} · ${ex.equipment || '운동'}`, equipment: ex.equipment === '맨몸' ? '맨몸' : '', sets: 2, reps: 10 });
    }
  });
  const state = () => bridge.getState();
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const byDate = (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.loggedAt || '').localeCompare(String(a.loggedAt || ''));
  const exercisePart = item => {
    const found = catalog.get(item.name);
    if (found && typeof window.exerciseCategory === 'function') return window.exerciseCategory(found);
    const group = String(item.group || '');
    return parts.find(part => group.includes(part)) || null;
  };
  window.PacefitRoutineCatalog = Object.freeze({
    parts: [...parts],
    list: part => [...catalog.values()].filter(item => exercisePart(item) === part)
      .map(item => ({name:item.name,group:item.group,sets:item.sets,reps:item.reps})),
    has: (part, name) => Boolean(catalog.has(name) && exercisePart(catalog.get(name)) === part)
  });
  const logHasPart = (log, part) => log.bodyPart === part || (log.items || []).some(item => exercisePart(item) === part);
  const today = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('ko-KR', {month:'long',day:'numeric',weekday:'short'});
  const draft = new Map();
  const draftKey = (part, name) => `${part}\u0000${name}`;

  window.getPlan = function () {
    const saved = state().routineChoice;
    const split = saved && parts.includes(saved.part) ? saved.part : '가슴';
    const latest = (state().logs || []).filter(log => logHasPart(log, split)).sort(byDate)[0] || null;
    return { split, latest, autoSplit: split, manual: true };
  };

  window.getCurrentRoutine = function (part) {
    if (!parts.includes(part)) return oldCurrentRoutine(part);
    const applied = state().trainerPlanApplied;
    const baseEdits = JSON.stringify(state().routineEdits?.[part] ?? null);
    if (applied?.date === today() && applied.bodyPart === part && applied.baseEdits === baseEdits &&
        Array.isArray(applied.exercises) && applied.exercises.length &&
        applied.exercises.every(item => catalog.has(item.name))) {
      return applied.exercises.map(item => ({...catalog.get(item.name),sets:item.sets,reps:item.reps}));
    }
    const edits = state().routineEdits && state().routineEdits[part];
    if (Array.isArray(edits)) return edits.map(row => {
      const original = catalog.get(row?.name);
      if (!original) return null;
      return {...original,
        sets:Number.isInteger(row.sets) && row.sets >= 1 && row.sets <= 30 ? row.sets : original.sets,
        reps:Number.isInteger(row.reps) && row.reps >= 1 && row.reps <= 100 ? row.reps : original.reps};
    }).filter(Boolean).slice(0, 12);
    const recentNames = (state().logs || []).filter(log => logHasPart(log, part)).sort(byDate)
      .flatMap(log => (log.items || []).map(item => item.name))
      .filter(name => catalog.has(name) && exercisePart(catalog.get(name)) === part);
    const names = [...new Set([...recentNames, ...defaults[part]])].slice(0, part === '하체' ? 4 : 3);
    return names.map(name => catalog.get(name)).filter(Boolean);
  };

  const style = document.createElement('style');
  style.textContent = `.routine-choice-row,.routine-choice-hint{display:none!important}.part-choice-row{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 5px}.part-choice{border:1px solid #dbe5d9;border-radius:999px;background:#fff;color:#315b43;padding:9px 15px;font-size:12px;font-weight:800;cursor:pointer}.part-choice[aria-pressed="true"]{background:#315b43;border-color:#315b43;color:#fff}.part-choice:focus-visible,.set-add:focus-visible{outline:2px solid #315b43;outline-offset:2px}.home-parts{margin:14px 0 17px}.home-parts-label{display:block;color:#647369;font-size:11px;font-weight:800;margin-bottom:7px}.set-entry{display:grid;grid-template-columns:62px minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:end;padding:10px 0;border-top:1px solid #e7ece5}.set-entry:first-child{border-top:0}.set-number{align-self:center;font-size:12px;font-weight:850;color:#315b43}.set-entry label{display:block;font-size:10px;font-weight:750;color:#6a756c}.set-entry input[type=number]{display:block;width:100%;min-width:0;margin-top:4px;padding:9px 10px;border:1px solid #dce5da;border-radius:9px;background:#fff;color:#203022;font-size:12px}.set-entry input[type=number]:disabled{background:#f1f5ef;color:#55715c;opacity:1}.set-same{grid-column:2/-1;display:flex!important;align-items:center;gap:7px;margin-top:2px;font-size:11px!important;color:#395e46!important}.set-same input{accent-color:#315b43}.set-actions{display:flex;align-items:center;gap:9px;margin-top:8px}.set-add{border:1px solid #d7e4d4;border-radius:9px;background:#fff;color:#315b43;padding:8px 11px;font-size:11px;font-weight:800}.set-help{font-size:10px;color:#718074}.set-entry-list{margin-top:8px}.set-detail-line{display:block;margin-top:3px;font-size:11px;line-height:1.5}@media(max-width:560px){.part-choice{padding:9px 13px}.set-entry{grid-template-columns:50px minmax(0,1fr) minmax(0,1fr);gap:6px}}`;
  document.head.appendChild(style);

  const home = document.getElementById('paceHome');
  document.querySelector('#homeChoose strong').textContent = '운동 부위 선택';
  document.querySelector('#homeChoose small').textContent = '가슴·등·어깨·팔·하체 중 선택';
  document.getElementById('homeStart').firstChild.textContent = '선택한 부위 운동 시작 ';
  const homeParts = document.createElement('div');
  homeParts.className = 'home-parts';
  homeParts.innerHTML = '<span class="home-parts-label">운동할 부위를 선택하세요</span><div class="part-choice-row" id="homePartChoices"></div>';
  home.querySelector('.home-recommend').after(homeParts);
  const workoutParts = document.createElement('div');
  workoutParts.className = 'part-choice-row';
  workoutParts.id = 'workoutPartChoices';
  workoutParts.setAttribute('aria-label', '오늘 운동할 부위');
  document.querySelector('.routine-choice-row').before(workoutParts);

  function choosePart(part, goToWorkout) {
    if (!parts.includes(part)) return;
    const next = { ...state(), routineChoice: { date: today(), part } };
    if (window.commitState(next, `${part} 운동을 준비했어요.`) && goToWorkout) document.getElementById('homeStart').click();
  }
  function partButtons(root, current, fromHome) {
    root.innerHTML = parts.map(part => `<button class="part-choice" type="button" data-part="${part}" aria-pressed="${part === current}">${part}</button>`).join('');
    root.querySelectorAll('[data-part]').forEach(button => button.onclick = () => choosePart(button.dataset.part, fromHome));
  }
  function setMarkup(number, reps, weight = '', inherited = false) {
    return `<div class="set-entry" data-set-number="${number}"><strong class="set-number">${number}세트</strong><label>무게 kg<input ${number === 1 ? 'data-weight' : ''} data-set-weight type="number" min="0" max="1000" step="0.5" value="${escapeText(weight)}" placeholder="무게" ${inherited ? 'disabled' : ''}></label><label>횟수<input data-set-reps type="number" min="1" max="100" step="1" value="${escapeText(reps)}" placeholder="횟수"></label>${number > 1 ? `<label class="set-same"><input data-same-weight type="checkbox" ${inherited ? 'checked' : ''}>이전 세트와 같은 무게</label>` : ''}</div>`;
  }
  function setValue(row) {
    const input = row.querySelector('[data-set-weight]');
    return input ? input.value.trim() : '';
  }
  function syncInherited(section) {
    section.querySelectorAll('.set-entry').forEach((row, index, rows) => {
      if (!index) return;
      const same = row.querySelector('[data-same-weight]'), weight = row.querySelector('[data-set-weight]');
      if (same.checked) { weight.value = setValue(rows[index - 1]); weight.disabled = true; }
      else weight.disabled = false;
    });
  }
  function addSet(section, targetReps, automatic = false) {
    const list = section.querySelector('.set-entry-list'), rows = [...list.querySelectorAll('.set-entry')], last = rows.at(-1);
    if (rows.length >= 30) { if (!automatic) window.toast('한 운동은 최대 30세트까지 기록할 수 있어요.'); return; }
    const weight = setValue(last), reps = last.querySelector('[data-set-reps]').value.trim();
    if (weight === '' || reps === '') { if (!automatic) window.toast('현재 세트의 무게와 횟수를 먼저 적어주세요.'); return; }
    list.insertAdjacentHTML('beforeend', setMarkup(rows.length + 1, '', weight, true));
    if (!automatic) list.lastElementChild.querySelector('[data-set-reps]').focus();
    section.querySelector('.set-add').textContent = `＋ ${rows.length + 2}세트 추가`;
  }
  function captureDrafts() {
    const part = window.getPlan().split;
    document.querySelectorAll('#exerciseList .exercise').forEach(row => {
      if (!row.querySelector('.set-entry-list')) return;
      const key = draftKey(part, row.dataset.name);
      draft.set(key, { rows: [...row.querySelectorAll('.set-entry')].map(set => ({weight:setValue(set),reps:set.querySelector('[data-set-reps]').value,same:!!set.querySelector('[data-same-weight]')?.checked})), equipment:row.querySelector('[data-equipment]')?.value || '',rir:row.querySelector('[data-rir]')?.value || '',form:!!row.querySelector('[data-form]')?.checked });
    });
  }
  function installSets(row, ex, part) {
    const section = row.querySelector('.exercise-actual');
    if (!section) return;
    const saved = draft.get(draftKey(part, ex.name));
    const sets = saved?.rows?.length ? saved.rows : [{weight: ex.equipment === '맨몸' ? '0' : '',reps:'',same:false}];
    section.innerHTML = `<div class="actual-heading">오늘 실제 운동 기록 · 세트별 입력</div><div class="set-entry-list">${sets.map((set, index) => setMarkup(index + 1, set.reps, set.weight, index > 0 && set.same)).join('')}</div><div class="set-actions"><button type="button" class="set-add">＋ ${sets.length + 1}세트 추가</button><span class="set-help">무게가 같으면 체크만 유지하세요.</span></div>`;
    const equipment = row.querySelector('[data-equipment]'), rir = row.querySelector('[data-rir]'), form = row.querySelector('[data-form]');
    if (saved) { if (equipment) equipment.value = saved.equipment; if (rir) rir.value = saved.rir; if (form) form.checked = saved.form; }
    syncInherited(section);
    section.querySelector('.set-add').onclick = () => { addSet(section, ex.reps); captureDrafts(); };
  }

  function showTrainerWeight(row, suggested) {
    const recommendation = row.querySelector('[data-recommendation]');
    const recordedPain = recommendation?.querySelector('.recommendation-label')?.textContent.includes('통증을 기록');
    if (!recommendation || recordedPain || suggested?.weight == null || !Number.isFinite(Number(suggested.weight))) return;
    const weight = Number(suggested.weight);
    recommendation.innerHTML = `<div class="recommendation-label">트레이너가 제안한 시작 참고 무게</div><strong class="recommendation-value">${escapeText(weight)}kg</strong><p>지난 기록과 오늘 몸 상태를 확인하고, 실제 운동 무게는 직접 조절하세요.</p><button class="use-recommendation" type="button" data-use-recommendation="${escapeText(weight)}">트레이너 참고 무게 사용</button>`;
  }

  window.renderPlan = function () {
    oldRenderPlan();
    const { split, latest } = window.getPlan();
    const applied = state().trainerPlanApplied;
    const activeRoutine = window.getCurrentRoutine(split);
    const trainerPlan = applied?.date === today() && applied?.bodyPart === split &&
      applied.exercises?.length === activeRoutine.length &&
      applied.exercises?.every((item, index) => activeRoutine[index]?.name === item.name) ? applied : null;
    document.getElementById('planTitle').textContent = trainerPlan ? `${split} · 트레이너 제안` : `${split} 운동`;
    document.getElementById('planDesc').textContent = trainerPlan ? `${trainerPlan.trainerName || '트레이너'}님의 제안을 오늘 운동에 적용했어요. 무게는 참고값이며 실제 운동은 직접 기록해 주세요.` : latest ? `${dateLabel(latest.date)} ${split} 운동 기록에서 종목을 골랐어요. 종목별 무게는 같은 운동·기구의 지난 기록을 참고해요.` : `${split} 운동을 처음 기록해요. 가벼운 무게로 시작하고 종목은 자유롭게 바꿀 수 있어요.`;
    document.getElementById('basisText').textContent = `선택한 ${split} 부위에서 최근에 한 종목을 먼저 보여줍니다. 중량은 같은 종목·기구의 기록을 따로 확인해요.`;
    document.getElementById('homePlanTitle').textContent = `${split} 운동`;
    document.getElementById('homePlanDesc').textContent = latest ? `최근 ${split} 운동을 참고했어요.` : '하고 싶은 부위를 고르면 운동을 추천해요.';
    partButtons(homeParts.querySelector('#homePartChoices'), split, true);
    partButtons(workoutParts, split, false);
    const routine = window.getCurrentRoutine(split);
    document.querySelectorAll('#exerciseList .exercise').forEach(row => {
      const ex = routine.find(item => item.name === row.dataset.name);
      if (ex) installSets(row, ex, split);
      const suggested = trainerPlan?.exercises?.find(item => item.name === row.dataset.name);
      if (suggested) {
        showTrainerWeight(row, suggested);
        const note = document.createElement('div');
        note.className = 'set-help';
        note.textContent = `트레이너 제안 · ${suggested.sets}세트 × ${suggested.reps}회${suggested.weight == null ? '' : ` · 참고 ${suggested.weight}kg`}`;
        row.querySelector('.exercise-info')?.appendChild(note);
      }
    });
  };

  window.renderLogs = function () {
    oldRenderLogs();
    const logs = state().logs || [];
    document.querySelectorAll('#logList .log-item[data-log-id]').forEach(root => {
      const log = logs.find(item => item.id === root.dataset.logId);
      if (!log) return;
      let totalReps = 0;
      root.querySelectorAll('.log-detail-row').forEach((line, index) => {
        const item = log.items[index];
        if (!item) return;
        const validSets = Array.isArray(item.setDetails) ? item.setDetails.filter(set => set && Number.isFinite(Number(set.weight)) && Number.isInteger(Number(set.reps)) && Number(set.reps) >= 1) : null;
        if (validSets?.length) {
          totalReps += validSets.reduce((sum, set) => sum + Number(set.reps), 0);
          line.lastElementChild.innerHTML = validSets.map((set, setIndex) => `<span class="set-detail-line">${setIndex + 1}세트 · ${escapeText(set.weight)}kg × ${escapeText(set.reps)}회</span>`).join('');
        } else totalReps += Number(item.sets || 0) * Number(item.reps || 0);
      });
      const volume = root.querySelector('.log-volume');
      if (volume) volume.firstChild.textContent = String(totalReps);
    });
  };

  const exerciseList = document.getElementById('exerciseList');
  exerciseList.addEventListener('click', event => {
    if (event.target.closest('[data-use-recommendation]')) {
      const section = event.target.closest('.exercise')?.querySelector('.exercise-actual');
      if (section) syncInherited(section);
      captureDrafts();
    }
  });
  exerciseList.addEventListener('input', event => {
    const section = event.target.closest('.exercise-actual');
    if (section && event.target.matches('[data-set-weight]')) syncInherited(section);
    if (event.target.closest('.exercise')) captureDrafts();
  });
  exerciseList.addEventListener('change', event => {
    if (event.target.matches('[data-equipment]')) {
      const applied = state().trainerPlanApplied;
      const part = window.getPlan().split;
      if (applied?.date === today() && applied.bodyPart === part) {
        const row = event.target.closest('.exercise');
        showTrainerWeight(row, applied.exercises?.find(item => item.name === row?.dataset.name));
      }
    }
    const section = event.target.closest('.exercise-actual');
    if (section) {
      syncInherited(section);
      const rows = [...section.querySelectorAll('.set-entry')], last = rows.at(-1), exercise = section.closest('.exercise');
      const target = window.getCurrentRoutine(window.getPlan().split).find(ex => ex.name === exercise.dataset.name)?.sets || 2;
      if (last === event.target.closest('.set-entry') && rows.length < target && setValue(last) !== '' && last.querySelector('[data-set-reps]').value.trim()) addSet(section, null, true);
    }
    if (event.target.closest('.exercise')) captureDrafts();
  });

  document.getElementById('saveWorkout').onclick = async () => {
    const part = window.getPlan().split, items = [];
    for (const row of document.querySelectorAll('#exerciseList .exercise')) {
      const ex = window.getCurrentRoutine(part).find(item => item.name === row.dataset.name);
      if (!ex) continue;
      const sets = [];
      for (const set of row.querySelectorAll('.set-entry')) {
        const weightText = setValue(set), repsText = set.querySelector('[data-set-reps]').value.trim();
        if (!repsText) {
          const same = !!set.querySelector('[data-same-weight]')?.checked;
          const untouched = !weightText || same || (set.dataset.setNumber === '1' && ex.equipment === '맨몸' && weightText === '0');
          if (untouched) continue;
          window.toast(`${ex.name}: ${set.dataset.setNumber}세트의 횟수를 입력해주세요.`);
          set.querySelector('[data-set-reps]').focus();
          return;
        }
        const weight = Number(weightText), reps = Number(repsText);
        if (weightText === '' || !Number.isFinite(weight) || weight < 0 || weight > 1000 || !Number.isInteger(reps) || reps < 1 || reps > 100) {
          window.toast(`${ex.name}: 세트별 무게 0~1000kg와 횟수 1~100을 확인해주세요.`);
          (weightText === '' ? set.querySelector('[data-set-weight]') : set.querySelector('[data-set-reps]')).focus();
          return;
        }
        sets.push({weight,reps});
      }
      if (sets.length) {
        const representative = [...sets].sort((a,b) => b.weight - a.weight)[0];
        const rirValue = Number(row.querySelector('[data-rir]')?.value);
        items.push({name:ex.name,equipment:row.querySelector('[data-equipment]')?.value.trim() || '',weight:representative.weight,sets:sets.length,reps:representative.reps,setDetails:sets,rir:[1,2,3].includes(rirValue)?rirValue:null,formOk:!!row.querySelector('[data-form]')?.checked});
      }
    }
    const cardioResult = window.PacefitCardio?.read() || {data:null,error:null};
    if (cardioResult.error) { window.toast(cardioResult.error); return; }
    const cardio = cardioResult.data;
    const durationResult = window.PacefitCalories?.readDuration() || {minutes:null,error:null};
    if (durationResult.error) { window.toast(durationResult.error); return; }
    const strengthMinutes = items.length ? durationResult.minutes : null;
    const note = document.getElementById('workoutNote').value.trim();
    const hasPhoto = !!document.querySelector('#workoutPhotoPreviews img');
    if (!items.length && !cardio && !note && !hasPhoto) { window.toast('세트, 유산소, 메모 또는 사진을 입력해주세요.'); return; }
    const photos = await window.savePendingPhotos('workout');
    const effort = document.querySelector('input[name="sessionEffort"]:checked')?.value || '적당했어요';
    const current = state(), profile = current.sampleProfile ? null : current.profile;
    const calorieEstimate = window.PacefitCalories?.estimate({weightKg:profile?.weight,strengthMinutes,cardio,effort}) || null;
    const log = {id:`log-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,loggedAt:new Date().toISOString(),date:today(),bodyPart:part,title:`${part} · 헬스장 운동`,effort,note,photoIds:photos.ids,items,cardio,strengthMinutes,calorieEstimate};
    const saved = window.commitState({...current,demo:false,sampleProfile:false,profile,onboardingSkipped:current.sampleProfile?false:current.onboardingSkipped,logs:[...(current.demo?[]:current.logs),log]},'오늘 운동 기록을 저장했어요.');
    if (!saved) { await window.deleteMedia(photos.ids); return; }
    draft.clear();
    document.getElementById('workoutNote').value = '';
    window.clearPendingPhotos('workout');
    window.PacefitCardio?.clear();
    window.PacefitCalories?.afterSave(log);
    window.renderPlan();
    if (photos.error) window.toast('운동 기록은 저장했지만 사진은 저장되지 않았어요.');
    if (!profile && !current.onboardingSkipped) window.openProfile();
  };

  window.persist();
})();
