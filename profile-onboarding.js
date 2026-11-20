(() => {
  'use strict';

  const steps = [
    { key: 'name', title: '어떻게 불러드릴까요?', hint: '이름이나 별명을 적어주세요.', type: 'text' },
    { key: 'goal', title: '지금 가장 중요한 목표는?', hint: '나중에 언제든 바꿀 수 있어요.', options: ['헬스 기초 익히기', '근력과 체력 기르기', '운동 습관 만들기', '체중 관리 보조', '기타'] },
    { key: 'experience', title: '운동 경험은 어느 정도인가요?', hint: '처음이라도 괜찮아요. 내 페이스로 시작해요.', options: ['처음 시작해요', '가끔 운동해요', '다시 시작해요', '지속적으로 운동을 하고 있어요', '기타'] },
    { key: 'days', title: '일주일에 몇 번 운동하고 싶나요?', hint: '부담 없는 횟수로 시작해도 좋아요.', options: ['주 1회', '주 2회', '주 3회', '주 4회', '주 5회 이상'] },
    { key: 'body', title: '키와 체중을 알려주실래요?', hint: '선택 항목이에요. 건너뛰거나 나중에 프로필에서 입력할 수 있어요.', type: 'body' }
  ];
  let current = 0;
  let owner = '';
  let draft = {};
  let root;

  function key() { return `pacefit-profile-draft:${owner}`; }
  function store() { try { sessionStorage.setItem(key(), JSON.stringify(draft)); } catch {} }
  function forget() { try { sessionStorage.removeItem(key()); } catch {} }
  function node(tag, props = {}, content = '') {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class') el.className = value;
      else if (name === 'type') el.type = value;
      else el.setAttribute(name, value);
    }
    if (content) el.textContent = content;
    return el;
  }
  function makeRoot() {
    if (root) return root;
    root = node('div', { id: 'pacefitOnboard', class: 'pf-onboard', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pfOnboardTitle' });
    root.hidden = true;
    document.body.appendChild(root);
    return root;
  }
  function field(text, id, value, attrs = {}) {
    const label = node('label', { class: 'pf-onboard-field', for: id });
    label.append(node('span', {}, text));
    const input = node('input', { id, type: attrs.type || 'text', autocomplete: 'off', ...attrs });
    input.value = value || '';
    input.addEventListener('input', () => {
      const prop = id.replace('pf-', '');
      draft[prop] = input.value;
      store();
      setError('');
    });
    label.append(input);
    return label;
  }
  function setError(message) {
    const target = root?.querySelector('.pf-onboard-error');
    if (target) target.textContent = message;
  }
  function render() {
    const step = steps[current];
    root.replaceChildren();
    const panel = node('section', { class: 'pf-onboard-panel' });
    const top = node('div', { class: 'pf-onboard-top' });
    top.append(node('span', { class: 'pf-onboard-brand' }, 'PACEFIT · 첫 설정'));
    const skip = node('button', { class: 'pf-onboard-skip', type: 'button' }, '나중에 하기');
    skip.addEventListener('click', skipAll);
    top.append(skip);
    panel.append(top);
    panel.append(node('p', { class: 'pf-onboard-progress' }, `${current + 1} / ${steps.length}`));
    const progress = node('div', { class: 'pf-onboard-progressbar', role: 'progressbar', 'aria-valuenow': String(current + 1), 'aria-valuemin': '1', 'aria-valuemax': String(steps.length) });
    for (let i = 0; i < steps.length; i++) progress.append(node('span', { class: i <= current ? 'done' : '' }));
    panel.append(progress);
    panel.append(node('h2', { id: 'pfOnboardTitle' }, step.title));
    panel.append(node('p', { class: 'pf-onboard-hint' }, step.hint));
    const content = node('div', { class: 'pf-onboard-content' });
    if (step.type === 'text') content.append(field('이름 또는 별명', 'pf-name', draft.name, { maxlength: '30', placeholder: '예: 민지' }));
    else if (step.type === 'body') {
      content.append(field('키 (cm)', 'pf-height', draft.height, { type: 'number', min: '80', max: '250', placeholder: '선택 입력' }));
      content.append(field('체중 (kg)', 'pf-weight', draft.weight, { type: 'number', min: '20', max: '300', step: '0.1', placeholder: '선택 입력' }));
    } else {
      const list = node('div', { class: 'pf-onboard-options' });
      step.options.forEach((value, index) => {
        const button = node('button', { type: 'button', class: draft[step.key] === value ? 'selected' : '', 'aria-pressed': draft[step.key] === value ? 'true' : 'false' }, value);
        button.addEventListener('click', () => { draft[step.key] = value; store(); render(); });
        list.append(button);
      });
      content.append(list);
      if (draft[step.key] === '기타') content.append(field('직접 적기', `pf-${step.key}Other`, draft[`${step.key}Other`], { maxlength: '60', placeholder: '짧게 적어주세요' }));
    }
    panel.append(content);
    panel.append(node('p', { class: 'pf-onboard-error', role: 'alert' }));
    const actions = node('div', { class: 'pf-onboard-actions' });
    if (current > 0) {
      const previous = node('button', { type: 'button', class: 'pf-onboard-back' }, '이전');
      previous.addEventListener('click', () => { current -= 1; render(); });
      actions.append(previous);
    }
    const next = node('button', { type: 'button', class: 'pf-onboard-next' }, current === steps.length - 1 ? '설정 완료' : '다음');
    next.addEventListener('click', advance);
    actions.append(next);
    panel.append(actions);
    panel.append(node('p', { class: 'pf-onboard-foot' }, '입력 내용은 기존 프로필 저장 방식과 동의 설정에 따라 저장됩니다. 인바디와 헬스장 정보는 나중에 추가할 수 있어요.'));
    root.append(panel);
    root.querySelector('input')?.focus();
  }
  function advance() {
    const step = steps[current];
    if (step.key === 'name' && (!draft.name?.trim() || draft.name.trim().length > 30)) return setError('이름 또는 별명을 1~30자로 입력해주세요.');
    if (step.options && !draft[step.key]) return setError('하나를 선택해주세요.');
    if (draft[step.key] === '기타' && !draft[`${step.key}Other`]?.trim()) return setError('직접 적을 내용을 입력해주세요.');
    if (step.type === 'body') {
      const height = draft.height === '' || draft.height == null ? null : Number(draft.height);
      const weight = draft.weight === '' || draft.weight == null ? null : Number(draft.weight);
      if (height !== null && (!Number.isFinite(height) || height < 80 || height > 250)) return setError('키는 80~250cm 사이로 입력해주세요.');
      if (weight !== null && (!Number.isFinite(weight) || weight < 20 || weight > 300)) return setError('체중은 20~300kg 사이로 입력해주세요.');
      return finish();
    }
    current += 1;
    render();
  }
  function finish() {
    const values = {
      profileName: draft.name.trim(), profileGoalInput: draft.goal,
      profileGoalOther: draft.goal === '기타' ? draft.goalOther.trim() : '',
      profileExperience: draft.experience,
      profileExperienceOther: draft.experience === '기타' ? draft.experienceOther.trim() : '',
      profileDays: String(draft.days ? steps[3].options.indexOf(draft.days) + 1 : 3),
      profileHeight: draft.height || '', profileWeight: draft.weight || '',
      profileSex: '', profileBmr: ''
    };
    for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value;
    document.getElementById('saveProfile').click();
    if (window.RefitAccountBridge?.getState().profile) { forget(); close(); }
    else setError('프로필을 저장하지 못했어요. 입력 내용을 확인하고 다시 시도해주세요.');
  }
  function skipAll() {
    document.getElementById('skipProfile').click();
    if (window.RefitAccountBridge?.getState().onboardingSkipped) { forget(); close(); }
  }
  function close() { if (root) root.hidden = true; }
  function open() {
    const session = window.RefitAccountSession;
    const state = window.RefitAccountBridge?.getState();
    if (!session?.user?.id || !state || state.profile || state.onboardingSkipped || state.sampleProfile) return false;
    owner = session.user.id;
    try { draft = JSON.parse(sessionStorage.getItem(key()) || '{}') || {}; } catch { draft = {}; }
    current = 0;
    makeRoot().hidden = false;
    render();
    return true;
  }
  window.PacefitProfileOnboarding = { open };
  window.addEventListener('refit:session-ready', () => { setTimeout(open, 0); });
  window.addEventListener('refit:session-ended', () => { close(); owner = ''; draft = {}; });
})();
