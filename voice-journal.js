(() => {
  'use strict';

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let active = null;
  let audioContext = null;
  function chime(frequency) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.085, audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.19);
    } catch { /* sound is optional; visual status stays available */ }
  }
  const styles = document.createElement('style');
  styles.textContent = `.voice-journal{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:7px 0 10px}.voice-journal button{min-height:38px;border:1px solid #cbdcca;border-radius:10px;background:#eff6ed;color:#28543b;padding:8px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.voice-journal button[aria-pressed="true"]{background:#315b43;color:#fff}.voice-journal button:disabled{opacity:.55;cursor:not-allowed}.voice-journal-status{font-size:11px;color:#5d6d61;line-height:1.5}.voice-journal.is-listening{padding:8px 10px;border:1px solid #9fd8aa;border-radius:12px;background:#e9f8e9}.voice-journal.is-listening .voice-journal-status{color:#174b36;font-weight:800}.voice-journal.is-listening .voice-journal-status::before{content:"";display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:50%;background:#dc493d;box-shadow:0 0 0 3px #dc493d33;animation:voice-pulse 1.1s ease-in-out infinite}@keyframes voice-pulse{50%{box-shadow:0 0 0 6px #dc493d1c}}@media(prefers-reduced-motion:reduce){.voice-journal.is-listening .voice-journal-status::before{animation:none}}.voice-journal-help{display:block;margin:0 0 10px;color:#6c786e;font-size:10px;line-height:1.5}.class-journal-form [data-summary-text][hidden]+.voice-journal,.class-journal-form [data-summary-text][hidden]+.voice-journal+.voice-journal-help{display:none}`;
  document.head.appendChild(styles);

  const status = (entry, message) => { entry.querySelector('.voice-journal-status').textContent = message; };
  function stopActive() {
    if (!active) return;
    try { active.recognition.stop(); } catch { /* already ended */ }
  }
  function mount(field, fieldName) {
    if (!field || field.dataset.voiceMounted) return;
    field.dataset.voiceMounted = 'true';
    const entry = document.createElement('div');
    entry.className = 'voice-journal';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = Recognition ? '🎙 음성으로 메모' : '음성 입력 미지원';
    button.setAttribute('aria-label', `${fieldName} 음성 입력`);
    button.setAttribute('aria-pressed', 'false');
    button.disabled = !Recognition;
    const label = document.createElement('span');
    label.className = 'voice-journal-status';
    label.setAttribute('role', 'status');
    label.textContent = Recognition ? '말한 내용은 확인 후 저장할 수 있어요.' : '이 브라우저에서는 키보드로 입력해주세요.';
    entry.append(button, label);
    const container = field.closest('label') || field;
    container.insertAdjacentElement('afterend', entry);
    const help = document.createElement('small');
    help.className = 'voice-journal-help';
    help.textContent = '마이크를 누르면 브라우저에 따라 음성이 외부 인식 서비스로 전송될 수 있습니다. 페이스핏은 음성 파일을 저장하지 않으며, 인식된 글은 확인·수정 후 저장 버튼을 누를 때 저장됩니다.';
    entry.insertAdjacentElement('afterend', help);

    button.addEventListener('click', () => {
      if (!Recognition) return;
      if (active?.button === button) { stopActive(); return; }
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) { audioContext ||= new AudioContext(); audioContext.resume().catch(() => {}); }
      } catch { /* continue without sound */ }
      if (active) {
        const previous = active;
        active = null;
        previous.button.setAttribute('aria-pressed', 'false');
        previous.button.textContent = '🎙 음성으로 메모';
        previous.entry.classList.remove('is-listening');
        status(previous.entry, '다른 메모로 음성 입력을 전환했어요.');
        try { previous.recognition.abort(); } catch { /* already ended */ }
      }
      const recognition = new Recognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      const current = {recognition,button,field,entry};
      active = current;
      button.setAttribute('aria-pressed', 'true');
      button.textContent = '■ 듣기 중지';
      status(entry, '마이크를 연결하고 있어요…');
      recognition.onstart = () => { if (active === current) { entry.classList.add('is-listening'); status(entry, `음성 인식 중 · ${fieldName} 내용을 말해주세요.`); chime(660); } };
      recognition.onresult = event => {
        if (active !== current || !document.contains(field)) return;
        const spoken = Array.from(event.results).filter(result => result.isFinal)
          .map(result => result[0]?.transcript?.trim()).filter(Boolean).join(' ');
        if (!spoken) return;
        const combined = [field.value.trim(), spoken].filter(Boolean).join(field.tagName === 'TEXTAREA' ? '\n' : ' ');
        const limit = field.maxLength > 0 ? field.maxLength : 1000;
        field.value = combined.slice(0, limit);
        field.dispatchEvent(new Event('input', {bubbles:true}));
        status(entry, combined.length > limit ? '글자 수 제한까지 입력했어요. 내용을 확인해주세요.' : '인식한 글을 메모에 넣었어요. 확인 후 기록을 저장하세요.');
      };
      recognition.onerror = event => {
        if (active !== current) return;
        current.failed = true;
        entry.classList.remove('is-listening');
        const messages = {'not-allowed':'마이크 권한이 없어요. 브라우저 설정을 확인해주세요.','audio-capture':'마이크를 찾지 못했어요.','no-speech':'음성이 들리지 않았어요. 다시 시도해주세요.','network':'음성 인식 서비스에 연결하지 못했어요.','language-not-supported':'한국어 음성 인식을 사용할 수 없어요.'};
        status(entry, messages[event.error] || '음성을 인식하지 못했어요. 다시 시도해주세요.');
      };
      recognition.onend = () => {
        if (active !== current) return;
        active = null;
        entry.classList.remove('is-listening');
        button.setAttribute('aria-pressed', 'false');
        button.textContent = '🎙 음성으로 메모';
        if (!current.failed) chime(520);
        if (label.textContent.includes('음성 인식 중') || label.textContent.includes('연결하고')) status(entry, '음성 인식이 끝났어요. 메모를 확인해주세요.');
      };
      try { recognition.start(); }
      catch { recognition.onend(); status(entry, '음성 입력을 시작하지 못했어요. 다시 시도해주세요.'); }
    });
  }
  mount(document.getElementById('workoutNote'), '개인 운동 메모');
  mount(document.getElementById('manualNote'), '자유 운동 기록 메모');
  const trainerOverlay = document.getElementById('trainerOverlay');
  if (trainerOverlay) new MutationObserver(() => {
    const note = trainerOverlay.querySelector('#trainerRecordForm textarea[name="note"]');
    if (note) mount(note, '트레이너 운동 기록 메모');
    const lessonFields = [
      ['textarea[name="lesson_summary"]', '수업 요약'],
      ['textarea[name="private_notes"]', '트레이너 전용 메모'],
      ['input[name="exercise_note"]', '운동별 코멘트'],
      ['textarea[name="next_steps"]', '다음 수업 계획']
    ];
    for (const [selector, name] of lessonFields) {
      trainerOverlay.querySelectorAll(`.class-journal-form ${selector}, .class-next-plan-editor ${selector}`)
        .forEach(field => mount(field, name));
    }
    if (active && !document.contains(active.field)) stopActive();
  }).observe(trainerOverlay, {childList:true,subtree:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopActive(); });
})();

